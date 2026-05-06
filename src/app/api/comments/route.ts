// src/app/api/comments/route.ts
// Endpoint creare comentariu — punctul-cheie pentru subcap. 2.2.5 (anti-XSS).
//
// Strategie de sanitizare:
//   - Comentariile sunt PLAIN TEXT. Nu acceptăm NICIUN HTML.
//   - Folosim stripHtml() (DOMPurify cu ALLOWED_TAGS=[]) ca să eliminăm tot
//     ce ar putea fi HTML/script înainte de a salva.
//   - Renderarea folosește React (auto-escape) + whitespace-pre-wrap pentru
//     păstrarea newline-urilor.
//   - Trei straturi de apărare împotriva XSS: validare → sanitizare → escape la randare.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { commentSchema } from '@/lib/validation';
import { stripHtml, rateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  // 1. Trebuie să fii autentificat ca să comentezi (anti-spam, atribuire identitate)
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Trebuie să fii autentificat ca să comentezi.' },
      { status: 401 }
    );
  }
  const userId = (session.user as any).id as string;

  // 2. Rate limiting per utilizator — 10 comentarii/minut (anti-flood)
  const rl = rateLimit(`comment:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Prea multe comentarii. Așteaptă un minut.' },
      { status: 429 }
    );
  }

  // 3. Parse JSON
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }

  // 4. Validare Zod (lungime, format ID-uri)
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { postId, content, parentId } = parsed.data;

  // 5. Verifică postul există ȘI e publicat (nu permitem comentarii pe drafturi)
  const post = await prisma.post.findFirst({
    where: { id: postId, published: true },
    select: { id: true, slug: true },
  });
  if (!post) {
    return NextResponse.json({ error: 'Articol negăsit' }, { status: 404 });
  }

  // 6. Dacă e răspuns, verifică părintele aparține aceluiași articol.
  // Apărare împotriva legării de comentarii din alte posturi (data integrity).
  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, postId: post.id },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: 'Comentariul-părinte nu există pe acest articol.' },
        { status: 400 }
      );
    }
  }

  // 7. SANITIZARE — taie tot HTML-ul. Cheia apărării anti-XSS.
  //    Exemple de input ostil care devine inofensiv:
  //      <script>alert('xss')</script>           → ''  (respinsă mai jos)
  //      <img src=x onerror=alert(1)>            → ''
  //      Salut <script>...</script> lume         → 'Salut  lume'
  //      <a href="javascript:alert(1)">click</a> → 'click'
  const sanitized = stripHtml(content).trim();

  // Dacă după sanitizare a rămas mai puțin de 2 caractere → respingem
  if (sanitized.length < 2) {
    return NextResponse.json(
      { error: 'Comentariul este gol sau conține doar markup interzis.' },
      { status: 400 }
    );
  }

  // 8. Salvare
  const comment = await prisma.comment.create({
    data: {
      content: sanitized,
      authorId: userId,
      postId: post.id,
      parentId: parentId ?? null,
    },
  });

  // Invalidează cache-ul paginii de articol pentru ca noul comentariu să apară.
  revalidatePath(`/posts/${post.slug}`);

  return NextResponse.json(
    { success: true, commentId: comment.id },
    { status: 201 }
  );
}
