// src/app/api/posts/[id]/save/route.ts
// Endpoint salvare/eliminare articol favorit.
// Operații IDEMPOTENTE — POST creează (sau ignoră dacă există), DELETE șterge
// (sau ignoră dacă nu există). Asta înseamnă că butonul "Salvează" nu se
// poate strica chiar dacă user-ul apasă rapid de mai multe ori.

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper comun: verifică sesiunea + ID-ul + existența articolului publicat.
async function authorizeSave(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) };
  }
  const userId = (session.user as any).id as string;

  // Validare format ID — apărare DoS contra inputurilor uriașe înainte de BD.
  if (!postId || postId.length > 50 || !/^[a-z0-9]+$/i.test(postId)) {
    return { error: NextResponse.json({ error: 'ID invalid' }, { status: 400 }) };
  }

  // Verifică post-ul există ȘI e publicat — nu permitem favorite pe drafturi.
  const post = await prisma.post.findFirst({
    where: { id: postId, published: true },
    select: { id: true },
  });
  if (!post) {
    return { error: NextResponse.json({ error: 'Articol negăsit' }, { status: 404 }) };
  }

  return { userId, postId: post.id };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeSave(params.id);
  if ('error' in auth) return auth.error;

  // Constraint @@unique([userId, postId]) garantează că un user nu salvează
  // același post de 2 ori. Prindem P2002 ca să fim idempotenți.
  try {
    await prisma.savedPost.create({
      data: { userId: auth.userId, postId: auth.postId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      // Era deja salvat — ok, idempotent.
      return NextResponse.json({ saved: true, alreadyExisted: true });
    }
    throw err;
  }

  return NextResponse.json({ saved: true }, { status: 201 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeSave(params.id);
  if ('error' in auth) return auth.error;

  // deleteMany nu aruncă dacă nu găsește — perfect pentru idempotență.
  const result = await prisma.savedPost.deleteMany({
    where: { userId: auth.userId, postId: auth.postId },
  });

  return NextResponse.json({ saved: false, removed: result.count });
}
