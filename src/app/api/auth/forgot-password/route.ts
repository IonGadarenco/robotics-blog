// src/app/api/auth/forgot-password/route.ts
// Endpoint inițiere reset parolă.
//
// Principii de securitate:
//   1. ANTI-ENUMERARE — răspunsul e identic indiferent dacă email-ul există
//      sau nu. Atacatorul nu poate folosi acest endpoint ca oracol pentru
//      a descoperi ce conturi sunt înregistrate pe platformă.
//   2. RATE LIMITING dual — per IP (anti-flood general) ȘI per email
//      (anti-flood țintit; previne ca atacatorul să spam-uiască victima cu
//      email-uri de resetare).
//   3. TOKEN cu 256-bit entropie + STOCAT CA HASH — dacă BD ar fi furată,
//      atacatorul nu poate fabrica link-uri valide.
//   4. EXPIRARE 1 ORĂ — atacurile prin token furat (ex: log-uri sau email
//      compromise) au fereastră îngustă.
//   5. AUDIT LOG pe fiecare cerere (PASSWORD_RESET_REQUESTED).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validation';
import {
  generateResetToken,
  rateLimit,
  logAuthEvent,
  getClientIp,
} from '@/lib/security';
import { sendEmail, buildResetPasswordEmail } from '@/lib/email';

// Token-urile expiră într-o oră.
const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  // Răspuns NEUTRU folosit în toate ramurile — anti-enumerare.
  // Întoarcem mereu același mesaj la 200, indiferent de stare reală.
  const neutralResponse = NextResponse.json({
    success: true,
    message:
      'Dacă există un cont cu acest email, ți-am trimis un link de resetare. Verifică inbox-ul.',
  });

  // 1. Rate limit per IP — 5/h
  const rlIp = rateLimit(`forgot-ip:${ip}`, 5, 3600_000);
  if (!rlIp.allowed) {
    return NextResponse.json(
      { error: 'Prea multe cereri. Reîncearcă peste o oră.' },
      { status: 429 }
    );
  }

  // 2. Parse + validate
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Răspundem neutral chiar și pentru body malformat — apărare împotriva
    // probing-ului format input pentru a deduce comportamentul intern.
    return neutralResponse;
  }
  const { email } = parsed.data;

  // 3. Rate limit per email — 3/h. Apărare împotriva atacurilor țintite
  //    în care cineva spam-uiește email-uri către o victimă.
  const rlEmail = rateLimit(`forgot-email:${email}`, 3, 3600_000);
  if (!rlEmail.allowed) {
    // Tot răspuns neutral — atacatorul nu trebuie să afle că a atins limita.
    return neutralResponse;
  }

  // 4. Caută user-ul. Dacă nu există, returnăm neutral fără să atingem nimic.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Log în consola serverului DOAR în dev — utile pentru testare.
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FORGOT-PASSWORD] Email '${email}' nu există în BD — niciun email trimis.`);
    }
    return neutralResponse;
  }

  // 5. Generează token + stochează HASH-ul
  const { raw, hash } = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  // 6. Audit log
  await logAuthEvent({
    userId: user.id,
    email,
    event: 'PASSWORD_RESET_REQUESTED',
    ipAddress: ip,
    userAgent,
  });

  // 7. Trimitere email prin Resend.
  //    Dacă livrarea eșuează (no API key, domeniu neverificat, etc.), helper-ul
  //    face fallback la console.log — nu aruncăm eroare către user pentru a
  //    păstra anti-enumerarea (atacatorul nu trebuie să afle nici de probleme
  //    interne de livrare).
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset/${raw}`;
  const tpl = buildResetPasswordEmail(resetUrl);
  const result = await sendEmail({
    to: email,
    subject: 'RoboLab — Resetare parolă',
    html: tpl.html,
    text: tpl.text,
  });

  // Fallback console pentru dev — dacă email n-a fost trimis (API key lipsă
  // sau eroare Resend), arătăm link-ul în consolă ca să poți testa local.
  if (!result.sent) {
    console.log('\n========= RESET PAROLĂ (fallback console) =========');
    console.log(`Email destinatar: ${email}`);
    console.log(`Motiv fallback:    ${result.error || 'unknown'}`);
    console.log(`Link valid 1 oră:  ${resetUrl}`);
    console.log('====================================================\n');
  }

  return neutralResponse;
}
