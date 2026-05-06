// src/app/api/comments/[id]/route.ts
// Endpoint ștergere comentariu — owner sau ADMIN.
// Apărare împotriva IDOR: verificăm ownership server-side, nu ne bazăm pe UI.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';

  // Validare ID — cuid format alfanumeric
  if (!params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id)) {
    return NextResponse.json({ error: 'ID invalid' }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    include: { post: { select: { slug: true } } },
  });
  if (!comment) {
    return NextResponse.json({ error: 'Comentariu negăsit' }, { status: 404 });
  }

  // Owner sau ADMIN — altfel 403
  if (role !== 'ADMIN' && comment.authorId !== userId) {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // Cascade prin schema Prisma — răspunsurile la acest comentariu se șterg automat.
  await prisma.comment.delete({ where: { id: params.id } });

  revalidatePath(`/posts/${comment.post.slug}`);

  return NextResponse.json({ success: true });
}
