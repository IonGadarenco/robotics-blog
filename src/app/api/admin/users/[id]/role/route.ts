// src/app/api/admin/users/[id]/role/route.ts
// Schimbare rol al unui user — DOAR ADMIN.
//
// Protecții CRITICE împotriva self-lockout:
//   1. Admin NU se poate retrograda pe sine — ar putea pierde accesul
//   2. NU se poate retrograda ULTIMUL admin — ar lăsa platforma fără admin
// Ambele verificate server-side; UI-ul are aceleași dezactivări dar nu
// ne bazăm pe ele.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const roleChangeSchema = z.object({
  role: z.enum(['USER', 'AUTHOR', 'ADMIN']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  const myId = (session.user as any).id as string;
  const myRole = (session.user as any).role;
  if (myRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
  }

  // Validare ID format
  if (!params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id)) {
    return NextResponse.json({ error: 'ID invalid' }, { status: 400 });
  }

  // Refuzăm self-modificare la rol — anti-lockout.
  if (params.id === myId) {
    return NextResponse.json(
      { error: 'Nu îți poți schimba propriul rol — cere altui admin.' },
      { status: 400 }
    );
  }

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Body invalid' }, { status: 400 }); }

  const parsed = roleChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Date invalide', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { role: newRole } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 });
  }

  // Dacă schimbi un ADMIN în non-ADMIN, verifică să nu fie ultimul.
  // Asta previne starea "platforma fără admin" — irecuperabil.
  if (target.role === 'ADMIN' && newRole !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Nu poți retrograda ultimul admin — platforma ar rămâne fără administrator.' },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { role: newRole },
  });

  return NextResponse.json({ success: true });
}
