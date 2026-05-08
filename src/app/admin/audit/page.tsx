// src/app/admin/audit/page.tsx
// Audit log vizual — listă AuthLog cu filtru pe tip eveniment și paginare.
// Inima subcap. 2.2.10 din lucrare — demonstrabil vizual la susținere.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import type { AuthEvent } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';

const EVENT_LIST: AuthEvent[] = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGIN_LOCKED',
  'LOGOUT',
  'PASSWORD_CHANGED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_SUCCESS',
  'TWO_FA_ENABLED',
  'TWO_FA_DISABLED',
  'REGISTRATION',
];

const EVENT_STYLE: Record<AuthEvent, string> = {
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

const PAGE_SIZE = 50;

function isValidEvent(value: string | undefined): AuthEvent | undefined {
  if (!value) return undefined;
  return EVENT_LIST.includes(value as AuthEvent) ? (value as AuthEvent) : undefined;
}

function parsePage(value: string | undefined): number {
  const n = parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function buildHref(params: { event?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.event) sp.set('event', params.event);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/audit?${qs}` : '/admin/audit';
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { event?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');
  const role = (session.user as any).role;
  if (role !== 'ADMIN') redirect('/');

  // Validare strictă pe parametri URL — whitelist hard-codat.
  const eventFilter = isValidEvent(searchParams.event);
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;

  const where = eventFilter ? { event: eventFilter } : {};

  const [total, logs] = await Promise.all([
    prisma.authLog.count({ where }),
    prisma.authLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <div className="text-circuit-500 font-mono text-sm mb-2">// AUDIT_LOG</div>
          <h1 className="font-display font-bold text-4xl mb-3">Jurnal evenimente</h1>
          <p className="text-carbon-400 font-mono text-sm">
            <span className="text-spark-400">{total}</span> evenimente
            {eventFilter && (
              <>
                {' '}filtrate pe <span className="text-circuit-400">{eventFilter}</span>
              </>
            )}
          </p>
        </div>

        {/* Bara filtre — chip-uri pe tip eveniment */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href={buildHref({})}
            className={`badge transition-colors ${
              !eventFilter
                ? 'bg-spark-500 text-carbon-900'
                : 'bg-carbon-800 text-carbon-300 hover:bg-carbon-700'
            }`}
          >
            Toate
          </Link>
          {EVENT_LIST.map((e) => (
            <Link
              key={e}
              href={buildHref({ event: e })}
              className={`badge text-[10px] transition-colors ${
                eventFilter === e
                  ? 'bg-spark-500 text-carbon-900'
                  : 'bg-carbon-800 text-carbon-300 hover:bg-carbon-700'
              }`}
            >
              {e}
            </Link>
          ))}
        </div>

        {/* Tabel evenimente */}
        {logs.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-carbon-500 font-mono">// niciun eveniment găsit</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-carbon-800 text-left">
                  <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2">
                    Eveniment
                  </th>
                  <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2">
                    Utilizator
                  </th>
                  <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 hidden md:table-cell">
                    IP
                  </th>
                  <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 hidden lg:table-cell">
                    User Agent
                  </th>
                  <th className="font-mono text-xs uppercase tracking-wider text-carbon-500 py-3 px-2 text-right">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-carbon-800/50 hover:bg-carbon-900/40">
                    <td className="py-2 px-2">
                      <span className={`badge ${EVENT_STYLE[l.event]} text-[10px]`}>
                        {l.event}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-mono text-spark-400 text-xs">
                        {l.user?.email || l.email || '<necunoscut>'}
                      </div>
                      {l.user?.name && (
                        <div className="text-xs text-carbon-500">{l.user.name}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell font-mono text-xs text-carbon-400">
                      {l.ipAddress || '—'}
                    </td>
                    <td className="py-2 px-2 hidden lg:table-cell font-mono text-xs text-carbon-500 max-w-xs truncate" title={l.userAgent || undefined}>
                      {l.userAgent || '—'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-carbon-400 whitespace-nowrap">
                      {new Intl.DateTimeFormat('ro-RO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginare */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-carbon-800 pt-6">
            {page > 1 ? (
              <Link href={buildHref({ event: eventFilter, page: page - 1 })} className="btn-secondary text-sm">
                ← Anterior
              </Link>
            ) : (
              <span className="text-carbon-600 font-mono text-sm">← Anterior</span>
            )}
            <span className="font-mono text-sm text-carbon-400">
              Pagina <span className="text-spark-400">{page}</span> din {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildHref({ event: eventFilter, page: page + 1 })} className="btn-secondary text-sm">
                Următor →
              </Link>
            ) : (
              <span className="text-carbon-600 font-mono text-sm">Următor →</span>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
