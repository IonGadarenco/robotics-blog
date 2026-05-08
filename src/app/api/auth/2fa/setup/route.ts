// src/app/api/auth/2fa/setup/route.ts
// Pas 1 setup 2FA — generăm secret TOTP + URL otpauth + QR code data-URL.
//
// IMPORTANT: secret-ul NU se salvează în BD aici. Doar îl returnăm către
// client împreună cu QR code-ul. User-ul scanează QR cu app-ul de
// autentificare (Google Authenticator / Authy / etc.), apoi trimite înapoi
// PRIMUL cod generat la /api/auth/2fa/enable, care:
//   1. Verifică codul cu același secret (e încă în mâna user-ului)
//   2. Doar dacă e corect, salvează secret-ul în BD și activează 2FA
//
// Asta previne situația în care un user generează un secret, închide pagina
// fără să-l confirme, și rămâne cu 2FA "half-activat" în BD.
//
// RFC 6238 (TOTP) — implementat de speakeasy.
// otpauth URI format — RFC pndurile Google Authenticator standard.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  // Trebuie să fii logat ca să-ți activezi 2FA pentru contul tău.
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 });
  }

  // Dacă 2FA e deja activ, refuzăm — user-ul trebuie să-l dezactiveze întâi.
  if (user.twoFactorEnabled) {
    return NextResponse.json(
      { error: '2FA e deja activ. Dezactivează-l înainte de a-l reconfigura.' },
      { status: 400 }
    );
  }

  // Generăm secret unic (160 bit, recomandare RFC 4226/6238).
  // Nume issuer din ENV ca să apară frumos în Google Authenticator.
  const issuer = process.env.TWO_FA_APP_NAME || 'RoboLab';
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${issuer}:${user.email}`,
    issuer,
  });

  // Generăm QR code ca data URL (data:image/png;base64,...)
  // Conține otpauth://totp/...?secret=...&issuer=... — formatul standard
  // pe care îl scanează toate app-urile de autentificare.
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url!, {
    margin: 2,
    width: 256,
    color: { dark: '#0a0a0a', light: '#f5f5f5' },
  });

  // IMPORTANT: secret.base32 e singura formă pe care o salvăm/transmitem.
  // E secret-ul brut codat base32 — formatul așteptat de toate libraries TOTP.
  return NextResponse.json({
    secret: secret.base32,
    qrCode: qrDataUrl,
    // Expunem și URI-ul pentru cazul în care user-ul nu poate scana QR și
    // vrea să-l introducă manual în app.
    otpauthUrl: secret.otpauth_url,
  });
}
