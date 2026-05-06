// src/app/api/posts/route.ts
// Endpoint creare articol. Securitate în straturi:
//   1. Sesiune validă (NextAuth)
//   2. Rol AUTHOR sau ADMIN
//   3. Validare Zod (postCreateSchema)
//   4. Slug generat pe server (nu venit de la client)
//   5. Prisma queries parametrizate (anti SQL injection)

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { postCreateSchema } from '@/lib/validation';
import { slugify } from '@/lib/slug';

export async function POST(request: NextRequest) {
  // 1. Verificare sesiune
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';

  // 2. Verificare rol
  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // 3. Parse JSON
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }

  // 4. Validare Zod
  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 5. Generare slug + creare cu retry pe coliziune unique constraint.
  //    Dacă două cereri concurente încearcă același slug, una va prinde
  //    P2002 de la Prisma — încercăm cu suffix incrementat.
  const baseSlug = slugify(data.titleRo) || 'articol';

  let slug = baseSlug;
  for (let attempt = 1; attempt <= 50; attempt++) {
    try {
      const post = await prisma.post.create({
        data: {
          slug,
          titleRo: data.titleRo,
          titleEn: data.titleEn,
          contentRo: data.contentRo,
          contentEn: data.contentEn,
          excerptRo: data.excerptRo,
          excerptEn: data.excerptEn,
          category: data.category,
          published: data.published,
          authorId: userId,
          publishedAt: data.published ? new Date() : null,
        },
      });

      // Invalidăm cache-ul paginilor publice pentru ca articolul să apară imediat.
      revalidatePath('/');
      revalidatePath('/posts');

      return NextResponse.json(
        { success: true, postId: post.id, slug: post.slug },
        { status: 201 }
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        Array.isArray(err.meta?.target) &&
        (err.meta?.target as string[]).includes('slug')
      ) {
        // Coliziune slug — încearcă cu suffix incrementat
        slug = `${baseSlug}-${attempt + 1}`;
        continue;
      }
      console.error('Create post error:', err);
      return NextResponse.json(
        { error: 'A apărut o eroare la creare' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Nu am putut genera un slug unic. Modifică titlul.' },
    { status: 500 }
  );
}
