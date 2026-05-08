// src/app/admin/page.tsx
// Landing pagina admin — dashboard cu statistici globale.
//
// Securitate: middleware (matcher /admin/:path*) blochează deja non-ADMIN.
// Re-verificăm aici (defense in depth).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any).role;
  if (role !== 'ADMIN') redirect('/');

  // Toate statisticile în paralel pentru viteză.
  const [
    userCount,
    authorCount,
    adminCount,
    twoFactorCount,
    postCount,
    publishedCount,
    commentCount,
    fileCount,
    authLogCount,
    failedLogins24h,
    recentEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'AUTHOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { twoFactorEnabled: true } }),
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
    prisma.comment.count(),
    prisma.postFile.count(),
    prisma.authLog.count(),
    prisma.authLog.count({
      where: {
        event: { in: ['LOGIN_FAILED', 'LOGIN_LOCKED'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.authLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
  ]);

  return (
    <main className="min-h-screen tech-grid">
      <header className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono font-bold text-xl tracking-tight">
            Robo<span className="text-spark-500">Lab</span>
            <span className="text-carbon-500"> / </span>
            <span className="text-red-400">Admin</span>
          </Link>
          <HeaderActions />
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-circuit-500 font-mono text-sm mb-2">// PANOU_ADMIN</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-4">
            Panou de control
          </h1>
          <p className="text-carbon-400">
            Gestionare utilizatori, audit log și statistici globale.
          </p>
        </div>

        {/* Cards navigare */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link href="/admin/users" className="card group hover:border-spark-500">
            <div className="flex items-start gap-4">
              <div className="text-3xl">👥</div>
              <div>
                <div className="text-circuit-500 font-mono text-xs mb-1">// USERS</div>
                <h2 className="font-display font-bold text-xl mb-2 group-hover:text-spark-400">
                  Utilizatori
                </h2>
                <p className="text-carbon-400 text-sm">
                  {userCount} conturi · {authorCount} autori · {adminCount} admini
                </p>
              </div>
            </div>
          </Link>

          <Link href="/admin/audit" className="card group hover:border-spark-500">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📋</div>
              <div>
                <div className="text-circuit-500 font-mono text-xs mb-1">// AUDIT</div>
                <h2 className="font-display font-bold text-xl mb-2 group-hover:text-spark-400">
                  Audit log
                </h2>
                <p className="text-carbon-400 text-sm">
                  {authLogCount} evenimente · {failedLogins24h} eșecuri auth în 24h
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Statistici globale */}
        <div className="mb-12">
          <h2 className="font-display font-bold text-2xl mb-6">Statistici platformă</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Utilizatori" value={userCount} sub={`${twoFactorCount} cu 2FA`} />
            <Stat label="Articole" value={postCount} sub={`${publishedCount} publicate`} />
            <Stat label="Comentarii" value={commentCount} />
            <Stat label="Fișiere" value={fileCount} sub="atașate" />
          </div>
        </div>

        {/* Ultimele 5 evenimente — preview pentru audit */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-2xl">Activitate recentă</h2>
            <Link href="/admin/audit" className="text-spark-400 font-mono text-sm hover:text-spark-300">
              Vezi tot →
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-carbon-500 font-mono text-sm">// niciun eveniment încă</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentEvents.map((e) => (
                <li key={e.id} className="card flex items-center gap-4 py-3">
                  <EventBadge event={e.event} />
                  <span className="font-mono text-sm text-carbon-300 flex-1 truncate">
                    {e.user?.email || e.email || '<utilizator necunoscut>'}
                  </span>
                  <span className="font-mono text-xs text-carbon-500 hidden md:inline">
                    {e.ipAddress || '—'}
                  </span>
                  <span className="font-mono text-xs text-carbon-500">
                    {new Intl.DateTimeFormat('ro-RO', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    }).format(e.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card">
      <div className="text-circuit-500 font-mono text-xs mb-1">// {label.toUpperCase()}</div>
      <div className="font-display font-bold text-3xl text-spark-400">{value}</div>
      {sub && <div className="text-carbon-500 font-mono text-xs mt-1">{sub}</div>}
    </div>
  );
}

// Mapare eveniment -> culoare badge.
const EVENT_STYLE: Record<string, string> = {
  LOGIN_SUCCESS: 'bg-green-700 text-green-100',
  LOGIN_FAILED: 'bg-yellow-700 text-yellow-100',
  LOGIN_LOCKED: 'bg-red-700 text-red-100',
  LOGOUT: 'bg-carbon-700 text-carbon-200',
  PASSWORD_CHANGED: 'bg-circuit-700 text-circuit-100',
  PASSWORD_RESET_REQUESTED: 'bg-circuit-700 text-circuit-100',
  PASSWORD_RESET_SUCCESS: 'bg-green-700 text-green-100',
  TWO_FA_ENABLED: 'bg-spark-700 text-spark-100',
  TWO_FA_DISABLED: 'bg-yellow-700 text-yellow-100',
  REGISTRATION: 'bg-spark-600 text-spark-50',
};

function EventBadge({ event }: { event: string }) {
  const cls = EVENT_STYLE[event] || 'bg-carbon-700 text-carbon-200';
  return (
    <span className={`badge ${cls} text-[10px]`}>
      {event}
    </span>
  );
}
