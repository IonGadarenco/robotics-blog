// src/app/admin/users/page.tsx
// Lista utilizatorilor — read-only în pasul A, acțiuni vin în pasul B.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';
import UserActions from './UserActions';

const ROLE_STYLE: Record<string, string> = {
  USER: 'bg-carbon-700 text-carbon-200',
  AUTHOR: 'bg-circuit-700 text-circuit-100',
  ADMIN: 'bg-red-700 text-red-100',
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const myRole = (session.user as any).role;
  const myId = (session.user as any).id as string;
  if (myRole !== 'ADMIN') redirect('/');

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      twoFactorEnabled: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });

  return (
    <main className="min-h-screen tech-grid">
      <header className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-mono font-bold text-xl tracking-tight">
            Robo<span className="text-spark-500">Lab</span>
            <span className="text-carbon-500"> / </span>
            <span className="text-red-400">Admin</span>
          </Link>
          <HeaderActions />
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href="/admin"
          className="inline-block mb-6 text-carbon-400 hover:text-spark-400 font-mono text-sm"
        >
          ← Panou
        </Link>

        <div className="mb-10">
          <div className="text-circuit-500 font-mono text-sm mb-2">// USERS</div>
          <h1 className="font-display font-bold text-4xl mb-3">Utilizatori</h1>
          <p className="text-carbon-400 font-mono text-sm">
            {users.length} conturi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon-800 text-left">
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2">
                  Email
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2">
                  Rol
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2">
                  2FA
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 hidden md:table-cell">
                  Articole
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 hidden md:table-cell">
                  Status
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 hidden lg:table-cell">
                  Ultimul login
                </th>
                <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 text-right">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isLocked = u.lockedUntil && u.lockedUntil > new Date();
                const isMe = u.id === myId;
                return (
                  <tr key={u.id} className="border-b border-carbon-800/50 hover:bg-carbon-900/40">
                    <td className="py-3 px-2">
                      <div className="font-mono text-spark-400">{u.email}</div>
                      <div className="text-xs text-carbon-500">{u.name}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge ${ROLE_STYLE[u.role]} text-[10px]`}>
                        {u.role}
                      </span>
                      {isMe && <span className="ml-2 text-xs text-carbon-500">(tu)</span>}
                    </td>
                    <td className="py-3 px-2">
                      {u.twoFactorEnabled ? (
                        <span className="text-green-400" title="2FA activ">🔐</span>
                      ) : (
                        <span className="text-carbon-600" title="2FA inactiv">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell font-mono text-xs text-carbon-400">
                      {u._count.posts} · {u._count.comments} com
                    </td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      {isLocked ? (
                        <span className="text-red-400 text-xs font-mono">🔒 BLOCAT</span>
                      ) : u.failedLoginAttempts > 0 ? (
                        <span className="text-yellow-400 text-xs font-mono">
                          {u.failedLoginAttempts} eșecuri
                        </span>
                      ) : (
                        <span className="text-green-400 text-xs font-mono">OK</span>
                      )}
                    </td>
                    <td className="py-3 px-2 hidden lg:table-cell font-mono text-xs text-carbon-500">
                      {u.lastLoginAt
                        ? new Intl.DateTimeFormat('ro-RO', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(u.lastLoginAt)
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <UserActions
                        userId={u.id}
                        currentRole={u.role}
                        isSelf={isMe}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
