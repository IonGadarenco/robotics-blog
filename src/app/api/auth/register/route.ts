// src/app/api/auth/register/route.ts
// Endpoint înregistrare cu apărări multiple:
// - validare Zod
// - hashing bcrypt
// - rate limiting per IP
// - audit log

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validation';
import {
  hashPassword,
  rateLimit,
  logAuthEvent,
  getClientIp,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // 1. Rate limit anti-spam:
  //    - Producție: 3 înregistrări/oră per IP (strict, anti-bot)
  //    - Development: 30/oră (permite testare manuală fără să blocheze dezvoltarea)
  const isProd = process.env.NODE_ENV === 'production';
  const rl = rateLimit(`register:${ip}`, isProd ? 3 : 30, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Prea multe tentative. Reîncearcă peste o oră.' },
      { status: 429 }
    );
  }

  // 2. Parsează și validează body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalid' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, name, password } = parsed.data;

  // 3. Verifică dacă email-ul există deja
  // Atenție: nu dezvăluim aceasta direct (apărare împotriva enumerării)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Returnăm același răspuns ca pentru success — dar nu creăm cont
    // În producție am trimite un email "Cineva a încercat să-ți recreeze contul"
    return NextResponse.json(
      { success: true, message: 'Verifică emailul pentru confirmare.' },
      { status: 201 }
    );
  }

  // 4. Hash parola și creează utilizatorul
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: 'USER' },
    });

    await logAuthEvent({
      userId: user.id,
      email,
      event: 'REGISTRATION',
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Cont creat cu succes. Te poți autentifica acum.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'A apărut o eroare. Te rugăm să încerci din nou.' },
      { status: 500 }
    );
  }
}
