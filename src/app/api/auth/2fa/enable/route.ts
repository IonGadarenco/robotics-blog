// src/app/api/auth/2fa/enable/route.ts
// Pas 2 setup 2FA — primește secret-ul (din /setup) + codul de verificare,
// validează că codul e corect, salvează secret-ul în BD și marchează 2FA activ.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import speakeasy from 'speakeasy';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enable2FASchema } from '@/lib/validation';
import { logAuthEvent, getClientIp } from '@/lib/security';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }

  const parsed = enable2FASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { secret, code } = parsed.data;

  // Verifică codul împotriva secret-ului — toleranță ±30s (window: 1).
  // Asta acoperă mici diferențe de ceas între server și telefonul user-ului.
  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!valid) {
    return NextResponse.json(
      { error: 'Cod incorect. Încearcă din nou — codurile se schimbă la 30 de secunde.' },
      { status: 400 }
    );
  }

  // Refuz dacă 2FA e deja activ — apărare contra cererilor concurente.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json(
      { error: '2FA e deja activ.' },
      { status: 400 }
    );
  }

  // Salvează secret-ul + activează 2FA. La login, secret-ul va fi folosit
  // pentru verificarea codurilor TOTP introduse de user.
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    },
  });

  await logAuthEvent({
    userId,
    email: user.email,
    event: 'TWO_FA_ENABLED',
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.json({ success: true });
}
