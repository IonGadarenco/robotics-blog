// src/app/api/admin/users/[id]/route.ts
// Ștergere user — DOAR ADMIN. Cascade-ul Prisma șterge toate datele legate
// (articole, comentarii, fișiere atașate, sesiuni, salvări, audit log).
//
// Protecții CRITICE:
//   1. Admin nu se poate șterge pe sine — anti self-lockout
//   2. Nu se poate șterge ULTIMUL admin — anti platform-lockout
//   3. NU șterge user-ii din seed protejați? Nu, nu avem o astfel de listă —
//      regulile de mai sus sunt suficiente.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
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

  if (!params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id)) {
    return NextResponse.json({ error: 'ID invalid' }, { status: 400 });
  }

  if (params.id === myId) {
    return NextResponse.json(
      { error: 'Nu te poți șterge singur — cere altui admin sau retrogradează-te întâi.' },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'Utilizator negăsit' }, { status: 404 });
  }

  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Nu poți șterge ultimul admin.' },
        { status: 400 }
      );
    }
  }

  // onDelete: Cascade din schemă va șterge automat toate datele legate.
  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
