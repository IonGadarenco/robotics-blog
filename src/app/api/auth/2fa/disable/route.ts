// src/app/api/auth/2fa/disable/route.ts
// Dezactivare 2FA — cere parola pentru re-verificare.
//
// De ce parolă? Apărare împotriva sesiunii furate. Dacă atacatorul
// fură cookie-ul de sesiune (XSS, MITM, malware), încă nu poate dezactiva
// 2FA fără parolă — barieră suplimentară pentru operațiuni sensibile.
// (Best practice: GitHub, Google, AWS toți cer reverificare la operații sensibile.)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { disable2FASchema } from '@/lib/validation';
import { verifyPassword, logAuthEvent, getClientIp } from '@/lib/security';

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

  const parsed = disable2FASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true, twoFactorEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 });
  }

  if (!user.twoFactorEnabled) {
    return NextResponse.json(
      { error: '2FA nu e activ.' },
      { status: 400 }
    );
  }

  // Re-verificare parolă — bcrypt.compare e timing-safe.
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json(
      { error: 'Parolă incorectă.' },
      { status: 401 }
    );
  }

  // Șterge secret-ul + dezactivează.
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    },
  });

  await logAuthEvent({
    userId,
    email: user.email,
    event: 'TWO_FA_DISABLED',
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.json({ success: true });
}
