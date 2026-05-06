// src/app/api/posts/[id]/route.ts
// Endpoint-uri PATCH și DELETE pentru un articol existent.
//
// Securitate (defense in depth):
//   1. Sesiune validă (NextAuth)
//   2. Rol AUTHOR sau ADMIN
//   3. Ownership check — un AUTHOR poate modifica/șterge DOAR articolele lui
//      (ADMIN poate orice). Verificare server-side, NU putem avea încredere
//      în ID-ul venit din URL.
//   4. Validare Zod (postUpdateSchema)
//   5. Prisma queries parametrizate

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { postUpdateSchema } from '@/lib/validation';

// Helper comun: extrage user-ul autenticat și articolul, verifică ownership.
// Returnează un Response de eroare (pe care apelantul îl returnează direct)
// sau datele necesare (postul + sesiunea).
async function authorizePostMutation(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) };
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';

  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 }) };
  }

  // Validare ID — cuid()-urile Prisma sunt 25 caractere alfanumerice.
  // Tăiem inputuri suspecte fără să atingem BD (apărare DoS).
  if (!postId || postId.length > 50 || !/^[a-z0-9]+$/i.test(postId)) {
    return { error: NextResponse.json({ error: 'ID invalid' }, { status: 400 }) };
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return { error: NextResponse.json({ error: 'Articol negăsit' }, { status: 404 }) };
  }

  // Ownership: AUTHOR doar pe ale lui, ADMIN pe orice.
  // CRITIC: dacă lipsește această verificare, un AUTHOR putea șterge articolele
  // altora doar prin modificarea ID-ului din URL (OWASP A01:2021 — IDOR).
  if (role !== 'ADMIN' && post.authorId !== userId) {
    return { error: NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 }) };
  }

  return { post, userId, role };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizePostMutation(params.id);
  if ('error' in auth) return auth.error;
  const { post } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }

  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Logică publishedAt: prima publicare setează data; ulterior păstrăm originalul
  // (chiar dacă articolul e depublicat și republicat — păstrăm istoria).
  const updates: typeof data & { publishedAt?: Date } = { ...data };
  if (data.published === true && !post.publishedAt) {
    updates.publishedAt = new Date();
  }

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: updates,
  });

  // Invalidăm cache-ul paginilor afectate.
  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${updated.slug}`);
  revalidatePath('/dashboard');

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizePostMutation(params.id);
  if ('error' in auth) return auth.error;
  const { post } = auth;

  await prisma.post.delete({ where: { id: params.id } });

  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${post.slug}`);
  revalidatePath('/dashboard');

  return NextResponse.json({ success: true });
}
