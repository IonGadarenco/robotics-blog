// src/app/api/posts/[id]/files/[fileId]/route.ts
// Ștergere atașament. Auth + ownership pe articol + verificare că fișierul
// chiar aparține acelui articol (defense in depth contra IDOR).

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  // 1. Auth + rol
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';
  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // 2. Validare format ID-uri (cuid alfanumeric)
  if (
    !params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id) ||
    !params.fileId || params.fileId.length > 50 || !/^[a-z0-9]+$/i.test(params.fileId)
  ) {
    return NextResponse.json({ error: 'ID invalid' }, { status: 400 });
  }

  // 3. Caută fișierul + articolul (join)
  const file = await prisma.postFile.findUnique({
    where: { id: params.fileId },
    include: { post: { select: { id: true, authorId: true, slug: true } } },
  });
  if (!file) {
    return NextResponse.json({ error: 'Fișier negăsit' }, { status: 404 });
  }

  // 4. Verifică fișierul aparține articolului din URL — apărare contra
  //    cazurilor în care cineva trimite ID-uri amestecate (IDOR variant).
  if (file.post.id !== params.id) {
    return NextResponse.json({ error: 'Fișier negăsit' }, { status: 404 });
  }

  // 5. Ownership pe articol
  if (role !== 'ADMIN' && file.post.authorId !== userId) {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // 6. Șterge mai întâi din BD (sursa de adevăr), apoi de pe disk.
  //    Dacă ștergerea de pe disk eșuează, fișierul rămâne orfan dar e ok —
  //    BD nu-l mai referă, deci e invizibil pentru aplicație.
  await prisma.postFile.delete({ where: { id: file.id } });
  await deleteFile(file.storedAs).catch((err) => {
    console.error('Delete file from disk failed:', err);
  });

  revalidatePath(`/posts/${file.post.slug}`);
  revalidatePath(`/dashboard/posts/${file.post.id}/edit`);

  return NextResponse.json({ success: true });
}
