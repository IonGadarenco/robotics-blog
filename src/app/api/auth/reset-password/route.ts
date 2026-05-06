// src/app/api/auth/reset-password/route.ts
// Endpoint finalizare reset parolă.
//
// Principii de securitate:
//   1. TOKEN HASH în BD — comparăm hash-ul tokenului primit cu cel salvat.
//   2. VERIFICĂRI MULTIPLE — token există, neexpirat, neutilizat (single-use).
//   3. ATOMICITATE — actualizarea parolei + marcarea tokenului ca folosit
//      se fac într-o tranzacție Prisma (totul sau nimic).
//   4. ANULARE TOATE TOKEN-URILE active la reset reușit — apărare împotriva
//      cazului în care atacatorul a interceptat și un token vechi rămas neutilizat.
//   5. RESETARE BLOCAJ + FAILED ATTEMPTS — user-ul își reia accesul curat.
//   6. NICIO sesiune existentă păstrată — user-ul trebuie să se logheze din nou.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validation';
import {
  hashPassword,
  hashResetToken,
  rateLimit,
  logAuthEvent,
  getClientIp,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  // Rate limit per IP — 10/h. Mai relaxat decât forgot-password pentru că aici
  // user-ul deja are token valid (a primit email).
  const rl = rateLimit(`reset-ip:${ip}`, 10, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Prea multe tentative. Reîncearcă peste o oră.' },
      { status: 429 }
    );
  }

  // Parse + validate
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { token, password } = parsed.data;

  // Hash token primit ca să-l căutăm în BD
  const tokenHash = hashResetToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // Verificări — toate cu același mesaj generic ca să nu trădăm de ce a eșuat
  // (defense in depth — atacatorul nu trebuie să afle dacă tokenul nu există
  // vs. e expirat vs. e folosit).
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Link invalid sau expirat. Solicită un nou link.' },
      { status: 400 }
    );
  }

  // Hash parola nouă (bcrypt 12 rounds — ~250ms)
  const newPasswordHash = await hashPassword(password);

  // Tranzacție: actualizare parolă + marcare token folosit + invalidare
  // toate celelalte token-uri ale user-ului + reset failed attempts/lockout
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidează ALTE token-uri active — dacă atacatorul are unul interceptat,
    // nu-i mai poate folosi acum.
    prisma.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    }),
    // Invalidează sesiunile NextAuth deschise (forțăm re-login peste tot).
    // Nota: cu strategia JWT, sesiunile pre-existente vor expira natural
    // (1h în config). Pentru acoperire totală am avea nevoie de un revocation
    // list. Pentru proiect didactic, acceptăm fereastra de 1h.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await logAuthEvent({
    userId: record.userId,
    email: record.user.email,
    event: 'PASSWORD_RESET_SUCCESS',
    ipAddress: ip,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    message: 'Parolă actualizată. Te poți autentifica cu noua parolă.',
  });
}
