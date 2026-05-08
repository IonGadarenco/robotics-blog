// src/app/api/posts/[id]/cover/route.ts
// Setare/eliminare cover image pentru un articol.
//
// Securitate:
//   - Auth + ownership (la fel ca la /files)
//   - DOAR imagini: JPG/PNG/WebP (refuz PDF/ZIP/STL/etc — n-are sens ca cover)
//   - La înlocuire: vechiul fișier e șters de pe disk (anti-orfani)
//   - Random name pe disk (anti path-traversal)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateUpload } from '@/lib/validation';
import { generateStoredName, saveFile, deleteFile } from '@/lib/storage';

const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);

// Cover-ul TREBUIE să fie imagine. Restrângem strict față de validateUpload.
const COVER_MIME_WHITELIST = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function authorizeCover(postId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Neautentificat' }, { status: 401 }) };
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role;
  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 }) };
  }

  if (!postId || postId.length > 50 || !/^[a-z0-9]+$/i.test(postId)) {
    return { error: NextResponse.json({ error: 'ID invalid' }, { status: 400 }) };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, slug: true, coverImage: true },
  });
  if (!post) {
    return { error: NextResponse.json({ error: 'Articol negăsit' }, { status: 404 }) };
  }

  if (role !== 'ADMIN' && post.authorId !== userId) {
    return { error: NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 }) };
  }

  return { post };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeCover(params.id);
  if ('error' in auth) return auth.error;
  const { post } = auth;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Body multipart invalid' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Câmpul "file" lipsește' }, { status: 400 });
  }

  // Validare generală (size, extensie, MIME-extensie match)
  const validation = validateUpload(file, MAX_SIZE_MB);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Fișier invalid', details: validation.errors },
      { status: 400 }
    );
  }

  // Restrângere strictă: doar imagine pentru cover
  if (!COVER_MIME_WHITELIST.has(file.type)) {
    return NextResponse.json(
      { error: 'Cover-ul trebuie să fie imagine (JPG/PNG/WebP).' },
      { status: 400 }
    );
  }

  // Salvare nouă imagine
  let storedName: string;
  try {
    const generated = generateStoredName(file.name);
    storedName = generated.storedName;
    await saveFile(file, storedName);
  } catch (err) {
    console.error('Save cover error:', err);
    return NextResponse.json({ error: 'Eroare la salvare' }, { status: 500 });
  }

  // Update BD cu DOAR numele stocat (URL-ul se construiește la randare via fileUrl)
  try {
    await prisma.post.update({
      where: { id: post.id },
      data: { coverImage: storedName },
    });
  } catch (err) {
    await deleteFile(storedName).catch(() => {});
    console.error('Update cover error:', err);
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 });
  }

  // Șterge fișierul vechi (dacă exista). Suportăm formate vechi: /uploads/<n>, http..., n
  if (post.coverImage) {
    let oldStored = post.coverImage.startsWith('/uploads/')
      ? post.coverImage.replace(/^\/uploads\//, '')
      : post.coverImage;
    // Dacă era URL absolut Blob (data veche), extragem numele
    if (oldStored.startsWith('http')) {
      const lastSlash = oldStored.lastIndexOf('/');
      if (lastSlash >= 0) oldStored = oldStored.substring(lastSlash + 1);
    }
    await deleteFile(oldStored).catch((err) => {
      console.error('Delete old cover failed:', err);
    });
  }

  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${post.slug}`);
  revalidatePath(`/dashboard/posts/${post.id}/edit`);

  return NextResponse.json({ success: true, coverImage: storedName }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authorizeCover(params.id);
  if ('error' in auth) return auth.error;
  const { post } = auth;

  if (!post.coverImage) {
    // Idempotent — nu există nimic de șters.
    return NextResponse.json({ success: true });
  }

  // Update BD întâi (sursa de adevăr)
  await prisma.post.update({
    where: { id: post.id },
    data: { coverImage: null },
  });

  // Apoi șterge fișierul. Suportăm formate vechi cu /uploads/ prefix.
  let oldStored = post.coverImage.startsWith('/uploads/')
    ? post.coverImage.replace(/^\/uploads\//, '')
    : post.coverImage;
  if (oldStored.startsWith('http')) {
    const lastSlash = oldStored.lastIndexOf('/');
    if (lastSlash >= 0) oldStored = oldStored.substring(lastSlash + 1);
  }
  await deleteFile(oldStored).catch((err) => {
    console.error('Delete cover from disk failed:', err);
  });

  revalidatePath('/');
  revalidatePath('/posts');
  revalidatePath(`/posts/${post.slug}`);
  revalidatePath(`/dashboard/posts/${post.id}/edit`);

  return NextResponse.json({ success: true });
}
