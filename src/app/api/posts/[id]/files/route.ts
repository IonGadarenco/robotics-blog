// src/app/api/posts/[id]/files/route.ts
// Upload fișier atașat unui articol. Multipart/form-data.
//
// Securitate (subcap. 2.2.11 din lucrare):
//   1. Auth + rol AUTHOR/ADMIN — doar autorii pot atașa fișiere
//   2. Ownership — un AUTHOR poate atașa fișiere doar pe articolele lui
//   3. Limit număr atașamente per articol — anti-DoS storage
//   4. Validare strictă fișier (validateUpload):
//      - whitelist MIME (fără SVG)
//      - whitelist extensie + cross-check cu MIME
//      - limit size
//      - anti path-traversal pe nume original
//   5. Nume random pe disk (saveFile) — nu folosim niciodată input user
//      direct ca path
//   6. Tranzacționalitate la eșec — dacă INSERT-ul în BD eșuează după save,
//      ștergem fișierul de pe disk (consistency)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateUpload } from '@/lib/validation';
import { generateStoredName, saveFile, deleteFile } from '@/lib/storage';

// Limita de atașamente per articol — protecție storage.
const MAX_FILES_PER_POST = 10;

// Limita de mărime fișier (MB), citită din ENV.
const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';
  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // 2. Validare ID articol
  if (!params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id)) {
    return NextResponse.json({ error: 'ID invalid' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { id: true, authorId: true, slug: true, _count: { select: { files: true } } },
  });
  if (!post) {
    return NextResponse.json({ error: 'Articol negăsit' }, { status: 404 });
  }

  // 3. Ownership: AUTHOR doar pe articolele proprii, ADMIN orice
  if (role !== 'ADMIN' && post.authorId !== userId) {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // 4. Limita de atașamente per articol
  if (post._count.files >= MAX_FILES_PER_POST) {
    return NextResponse.json(
      { error: `Articolul are deja ${MAX_FILES_PER_POST} atașamente (limita maximă).` },
      { status: 400 }
    );
  }

  // 5. Parse multipart
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

  // 6. Validare conținut fișier
  const validation = validateUpload(file, MAX_SIZE_MB);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Fișier invalid', details: validation.errors },
      { status: 400 }
    );
  }

  // 7. Generare nume random + salvare pe disk
  let storedName: string;
  try {
    const generated = generateStoredName(file.name);
    storedName = generated.storedName;
    await saveFile(file, storedName);
  } catch (err) {
    console.error('Save file error:', err);
    return NextResponse.json(
      { error: 'Eroare la salvarea fișierului' },
      { status: 500 }
    );
  }

  // 8. INSERT în BD. Dacă eșuează, ștergem fișierul de pe disk pentru
  //    a evita orfanii (consistency BD ⇔ filesystem).
  try {
    const dbFile = await prisma.postFile.create({
      data: {
        postId: post.id,
        filename: file.name,
        storedAs: storedName,
        mimeType: file.type,
        size: file.size,
      },
    });

    revalidatePath(`/posts/${post.slug}`);
    revalidatePath(`/dashboard/posts/${post.id}/edit`);

    return NextResponse.json(
      {
        success: true,
        file: {
          id: dbFile.id,
          filename: dbFile.filename,
          size: dbFile.size,
          mimeType: dbFile.mimeType,
          url: `/uploads/${storedName}`,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    // Compensează — șterge fișierul de pe disk dacă INSERT-ul eșuează
    await deleteFile(storedName).catch(() => {});
    console.error('Create PostFile error:', err);
    return NextResponse.json(
      { error: 'Eroare la salvarea metadatelor' },
      { status: 500 }
    );
  }
}
