// src/lib/security.ts
// Utilități cheie de securitate pentru aplicație

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { AuthEvent } from '@prisma/client';

// ========= HASHING PAROLE =========
// Folosim bcrypt cu cost factor 12 (recomandare OWASP 2024)
// Cost 12 = aprox. 250ms pe hash modern, suficient pentru a frâna brute-force

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ========= SANITIZARE HTML =========
// Apărare împotriva XSS în conținut user-generated (comentarii, articole).
//
// Decizie: implementare regex pură (fără jsdom/DOMPurify) pentru a evita
// dependențe ESM-only care strică Vercel deployment. Trade-off:
//   - Pro: zero dependențe, runtime universal (Node + Edge), build mai rapid
//   - Con: mai puțin sofisticat decât DOMPurify la edge cases
// Compensare prin DEFENSE IN DEPTH:
//   1. Aici stripHtml() iterează până nu mai găsește tag-uri (apără contra
//      bypass-urilor cu nesting precum <scr<script>ipt>)
//   2. La randare, React auto-escape transformă orice rest de HTML în text
//   3. Pentru articole, react-markdown nu interpretează HTML brut nici el
// Ca atare, chiar dacă regex-ul nostru ar avea o gaură, atacatorul tot nu
// poate executa script — toate cele 3 straturi ar trebui să cedeze.

export function stripHtml(dirty: string): string {
  if (!dirty) return '';
  let prev: string;
  let result = dirty;
  // Eliminare comentarii HTML <!-- ... --> (pot ascunde conținut periculos)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  // Eliminare iterativă a tag-urilor — apără contra <scr<script>ipt>
  do {
    prev = result;
    result = result.replace(/<[^>]*>/g, '');
  } while (result !== prev);
  return result.trim();
}

// Pentru moment NU permitem HTML în niciun loc — toate textele user-generated
// sunt strip-uite. Dacă ulterior vom dori rich text cu tag-uri permise,
// înlocuim cu un sanitizer dedicat (ex: sanitize-html, fără jsdom).
export function sanitizeHtml(dirty: string): string {
  return stripHtml(dirty);
}

// ========= RATE LIMITING =========
// Limitare simplă în-memory a tentativelor de login
// În producție pe Vercel multi-region, aceasta ar trebui mutată în Redis (ex: Upstash)
// Pentru proiect didactic, in-memory e suficient

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetIn: entry.resetAt - now,
  };
}

// Curățare periodică a intrărilor expirate (anti-memory-leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, 60_000);

// ========= AUDIT LOG =========
// Jurnalizare evenimente sensibile pentru analiză și demonstrație în lucrare

export async function logAuthEvent(params: {
  userId?: string;
  email?: string;
  event: AuthEvent;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.authLog.create({
      data: {
        userId: params.userId ?? null,
        email: params.email ?? null,
        event: params.event,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    // Niciodată nu lăsăm o eroare de log să blocheze flow-ul principal
    console.error('AuthLog error:', err);
  }
}

// ========= EXTRAGERE IP DIN REQUEST =========

export function getClientIp(headers: Headers): string {
  // Vercel & majoritatea proxy-urilor folosesc x-forwarded-for
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  
  return 'unknown';
}

// ========= GENERARE TOKEN ALEATORIU =========
// Pentru reset parolă, verificare email etc.

export function generateRandomToken(length = 32): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ========= TOKEN-URI RESET PAROLĂ =========
// Generăm un token aleatoriu de 256-bit (32 bytes) — imposibil de ghicit
// (entropie suficientă chiar și împotriva atacurilor de tip birthday).
// Stocăm în BD doar HASH-ul SHA-256 al tokenului — dacă BD ar fi furată,
// atacatorul nu ar putea fabrica link-uri valide (n-ar avea token-ul brut).

import { createHash, randomBytes } from 'node:crypto';

export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex'); // 64 caractere hex = 256 bit
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ========= NUMĂR ÎNCERCĂRI EȘUATE =========
// Blochează contul după N tentative eșuate

const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15');

export async function recordFailedLogin(userId: string): Promise<{ locked: boolean }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
  });

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000),
      },
    });
    return { locked: true };
  }

  return { locked: false };
}

export async function resetFailedAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

export function isUserLocked(user: { lockedUntil: Date | null }): boolean {
  if (!user.lockedUntil) return false;
  return user.lockedUntil > new Date();
}
