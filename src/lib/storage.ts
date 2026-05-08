// src/lib/storage.ts
// Salvare/ștergere fișiere — DUAL-MODE:
//   - Local filesystem (dev): fișierele se salvează în public/uploads/
//   - Vercel Blob (prod): fișierele se salvează prin API-ul Vercel Blob
//
// Modul activ se decide automat în funcție de prezența env BLOB_READ_WRITE_TOKEN
// (setat automat de Vercel când conectezi un Blob store la proiect). Local
// nu există tokenul → fallback la filesystem. Așa același cod rulează în
// ambele medii fără modificări la codul apelant.
//
// Decizii arhitecturale comune:
//   - Numele fișierului e ALEATORIU (256 bit) — apară împotriva path-traversal,
//     coliziunilor, enumerării, extension-confusion
//   - DB stochează DOAR numele (storedAs/coverImage) — URL-ul public se
//     construiește la fiecare randare via fileUrl()
//   - Așa, schimbarea backend-ului (local <-> Blob <-> S3) NU cere migrare DB

import { randomBytes } from 'node:crypto';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Activăm Vercel Blob doar dacă token-ul e prezent. Vercel îl injectează
// automat când conectezi un Blob store la proiect.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

// Mapare MIME -> extensie acceptată. Cross-check-ul e crucial:
// dacă cineva trimite un fișier .png cu MIME type application/zip, refuzăm.
export const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'model/stl': ['.stl'],
  'application/octet-stream': ['.stl'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

export function sanitizeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
}

export function isMimeExtensionMatch(mimeType: string, extension: string): boolean {
  const allowedExts = MIME_EXTENSION_MAP[mimeType];
  if (!allowedExts) return false;
  return allowedExts.includes(extension);
}

export function generateStoredName(originalFilename: string): {
  storedName: string;
  extension: string;
} {
  const ext = sanitizeExtension(originalFilename);
  if (!ext) {
    throw new Error('Extensie invalidă sau lipsă');
  }
  const random = randomBytes(32).toString('hex');
  return { storedName: `${random}${ext}`, extension: ext };
}

// Validare strictă a numelui stocat — folosit înainte de orice operație
// pe filesystem/Blob ca defense in depth.
function validateStoredName(storedName: string): boolean {
  return /^[a-f0-9]{64}\.[a-z0-9]{1,8}$/.test(storedName);
}

// Salvează fișierul în backend-ul activ.
// Local mode: returnează DOAR filename-ul (URL e construit cu /uploads/<n>).
// Blob mode: returnează URL-ul COMPLET returnat de Vercel (https://...).
// Caller-ul stochează ce primește direct în DB (storedAs/coverImage).
// fileUrl() distinge la randare între cele 2 formate.
export async function saveFile(file: File, storedName: string): Promise<string> {
  if (!validateStoredName(storedName)) {
    throw new Error('Nume fișier invalid');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (useBlob) {
    const { put } = await import('@vercel/blob');
    const result = await put(storedName, buffer, {
      access: 'public',
      contentType: file.type,
      // addRandomSuffix=false: păstrăm numele exact pe care l-am generat
      // (avem deja 256 bit entropie, nu mai e nevoie de suffix Vercel)
      addRandomSuffix: false,
    });
    // result.url = "https://<storeId>.public.blob.vercel-storage.com/<storedName>"
    return result.url;
  }

  // Modul local filesystem
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fullPath = path.join(UPLOAD_DIR, storedName);
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detectat');
  }
  await writeFile(fullPath, buffer);
  return storedName;
}

// Acceptă fie URL Blob complet, fie filename local (depinde de modul în care
// a fost stocat la saveFile). Detectează automat ce e.
export async function deleteFile(stored: string): Promise<void> {
  // Cazul Blob: URL absolut Vercel
  if (stored.startsWith('https://') && stored.includes('.public.blob.vercel-storage.com')) {
    const { del } = await import('@vercel/blob');
    try {
      await del(stored);
    } catch (err: any) {
      console.error('Blob delete failed:', err);
    }
    return;
  }

  // Backward compat: dacă vine cu /uploads/ prefix, scoatem
  const filename = stored.startsWith('/uploads/')
    ? stored.replace('/uploads/', '')
    : stored;

  if (!validateStoredName(filename)) {
    throw new Error('Nume fișier invalid');
  }

  // Modul local
  const fullPath = path.join(UPLOAD_DIR, filename);
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detectat');
  }
  try {
    await unlink(fullPath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// fileUrl e separat în file-url.ts pentru a fi importabil din client components.
// Re-exportat aici pentru backward-compat la importuri.
export { fileUrl } from './file-url';
