// src/app/dashboard/page.tsx
// Pagina principală a dashboard-ului — listă articole proprii.
// Server Component cu autorizare DUBLĂ:
//   1. middleware.ts — verifică doar dacă există sesiune și rolul (filtru grosier)
//   2. aici, server-side — re-verificăm și redirect-ăm dacă nu e cum trebuie
// (defense in depth — nu ne bazăm pe un singur strat de control acces).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';

const CATEGORY_LABELS: Record<string, { label: string; class: string }> = {
  ROBOTICS: { label: 'Robotică', class: 'badge-robotics' },
  THREE_D_PRINT: { label: 'Imprimare 3D', class: 'badge-3d' },
  WEB_DEV: { label: 'Web Dev', class: 'badge-web' },
  TUTORIAL: { label: 'Tutorial', class: 'badge-tutorial' },
  PROJECT: { label: 'Proiect', class: 'badge-robotics' },
};

export default async function DashboardHomePage() {
  // Re-verificare server-side: middleware-ul ne-a lăsat să trecem, dar
  // verificăm explicit aici ca să avem datele de sesiune disponibile.
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';

  // USER simplu nu are dreptul aici. Middleware-ul îi blochează deja, dar
  // adăugăm și aici verificarea ca apărare suplimentară.
  if (role !== 'AUTHOR' && role !== 'ADMIN') {
    redirect('/');
  }

  // Admin vede toate articolele, autor doar pe ale lui.
  const where = role === 'ADMIN' ? {} : { authorId: userId };

  const posts = await prisma.post.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true, savedBy: true } },
    },
  });

  const draftCount = posts.filter((p) => !p.published).length;
  const publishedCount = posts.length - draftCount;

  return (
    <main className="min-h-screen tech-grid">
      {/* Header */}
      <header className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-spark-500 flex items-center justify-center font-mono font-bold text-carbon-900 group-hover:rotate-12 transition-transform">
              RL
            </div>
            <span className="font-mono font-bold text-xl tracking-tight">
              Robo<span className="text-spark-500">Lab</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/posts"
              className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider"
            >
              Public
            </Link>
            <HeaderActions />
          </div>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Header dashboard cu titlu + buton creare */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-circuit-500 font-mono text-sm mb-2">// DASHBOARD</div>
            <h1 className="font-display font-bold text-4xl md:text-5xl mb-3">
              {role === 'ADMIN' ? 'Toate articolele' : 'Articolele mele'}
            </h1>
            <p className="text-carbon-400 font-mono text-sm">
              <span className="text-spark-400">{publishedCount}</span> publicate
              <span className="text-carbon-600 mx-2">·</span>
              <span className="text-circuit-400">{draftCount}</span> draft-uri
            </p>
          </div>
          <Link href="/dashboard/posts/new" className="btn-primary">
            + Articol nou
          </Link>
        </div>

        {/* Lista articole sau empty state */}
        {posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-6">
              Niciun articol încă. Începe prin a crea primul tău proiect.
            </p>
            <Link href="/dashboard/posts/new" className="btn-primary">
              Creează primul articol
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const cat = CATEGORY_LABELS[post.category];
              return (
                <article
                  key={post.id}
                  className="card flex flex-wrap items-start gap-4 hover:border-spark-600"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {post.published ? (
                        <span className="badge bg-green-700 text-green-100">PUBLICAT</span>
                      ) : (
                        <span className="badge bg-carbon-700 text-carbon-300">DRAFT</span>
                      )}
                      <span className={`badge ${cat?.class || 'badge-robotics'}`}>
                        {cat?.label || post.category}
                      </span>
                      {role === 'ADMIN' && (
                        <span className="text-xs font-mono text-carbon-500">
                          // de {post.author.name}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display font-bold text-lg mb-2">
                      {post.published ? (
                        <Link
                          href={`/posts/${post.slug}`}
                          className="hover:text-spark-400 transition-colors"
                        >
                          {post.titleRo}
                        </Link>
                      ) : (
                        <span>{post.titleRo}</span>
                      )}
                    </h2>
                    <div className="flex flex-wrap gap-3 text-xs font-mono text-carbon-500">
                      <span>👁 {post.views}</span>
                      <span>💬 {post._count.comments}</span>
                      <span>⭐ {post._count.savedBy}</span>
                      <span>
                        Modificat{' '}
                        {new Intl.DateTimeFormat('ro-RO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }).format(post.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/posts/${post.id}/edit`}
                      className="btn-secondary text-sm"
                    >
                      Editează
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
