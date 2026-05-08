// src/lib/storage.ts
// Salvare/ștergere fișiere pe disk local (public/uploads/).
//
// Decizie arhitecturală: numele fișierului pe disk e un string ALEATORIU
// generat de noi. Numele original al user-ului e salvat doar în BD (coloana
// PostFile.filename). Asta apară împotriva:
//   - Path traversal (../../../etc/passwd) — input-ul user nu atinge filesystem-ul
//   - Coliziuni — două fișiere "image.png" se salvează ca nume diferite
//   - Enumerare conținut — atacatorul nu poate ghici URL-uri de fișiere
//   - Extension confusion — extensia e validată separat și sanitizată
//
// În producție, asta s-ar înlocui cu S3/R2/Vercel Blob — schimbarea e doar
// în acest fișier, restul codului folosește interfața (saveFile/deleteFile).

import { randomBytes } from 'node:crypto';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Director-ul absolut unde stocăm fișierele uploadate.
// `cwd()` în Next.js dev/prod = root-ul proiectului.
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Mapare MIME -> extensie acceptată. Cross-check-ul e crucial:
// dacă cineva trimite un fișier .png cu MIME type application/zip, refuzăm.
// Asta apară împotriva MIME spoofing-ului.
export const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'model/stl': ['.stl'],
  // application/octet-stream e generic — apare uneori la .stl. Permis dar
  // doar dacă extensia e .stl (cross-check în extractExtension).
  'application/octet-stream': ['.stl'],
  // Video — pentru ilustrarea proiectelor cu demo-uri scurte
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

// Sanitizare extensie din numele original. Normalizează la lowercase,
// taie tot ce nu e literă/cifră.
export function sanitizeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  // Doar litere și cifre — anti injection pe filesystem (Linux acceptă orice
  // caracter, Windows mai strict, dar tăiem chiar și pe Linux pentru consistență).
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
}

// Verifică dacă MIME-ul + extensia se potrivesc (cross-check).
export function isMimeExtensionMatch(mimeType: string, extension: string): boolean {
  const allowedExts = MIME_EXTENSION_MAP[mimeType];
  if (!allowedExts) return false;
  return allowedExts.includes(extension);
}

// Generează un nume random + extensia sanitizată.
// 32 bytes hex = 64 caractere = ~256 bit entropie (imposibil de ghicit).
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

// Salvează fișierul pe disk. Returnează path-ul relativ pentru servire.
export async function saveFile(file: File, storedName: string): Promise<string> {
  // mkdir cu recursive=true e idempotent (nu aruncă dacă există).
  await mkdir(UPLOAD_DIR, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // path.join face automat normalizare / vs \ pe diferite OS-uri.
  const fullPath = path.join(UPLOAD_DIR, storedName);

  // Apărare suplimentară: verifică că path-ul rezultat e ÎN UPLOAD_DIR.
  // Dacă cineva ar fi reușit să strecoare un storedName cu '../', l-am prinde aici.
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detectat');
  }

  await writeFile(fullPath, buffer);

  // URL-ul public — Next.js servește public/ la rădăcină.
  return `/uploads/${storedName}`;
}

export async function deleteFile(storedName: string): Promise<void> {
  // Validare strictă pe storedName — apărare împotriva ștergerii fișierelor
  // din afara UPLOAD_DIR.
  if (!/^[a-f0-9]{64}\.[a-z0-9]{1,8}$/.test(storedName)) {
    throw new Error('Nume fișier invalid');
  }

  const fullPath = path.join(UPLOAD_DIR, storedName);
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Path traversal detectat');
  }

  try {
    await unlink(fullPath);
  } catch (err: any) {
    // ENOENT = fișierul nu există. Idempotent — nu aruncăm.
    if (err.code !== 'ENOENT') throw err;
  }
}
