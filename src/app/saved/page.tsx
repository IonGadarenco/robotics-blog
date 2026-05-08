// src/app/saved/page.tsx
// Lista personală de articole salvate ("doritorii să le poată salva pentru
// realizare ulterioară" — specificația proiectului).
//
// Securitate:
//   - Middleware blochează accesul fără sesiune (filtru grosier)
//   - Aici re-verificăm getServerSession (defense in depth)
//   - Query filtrat strict pe userId — niciodată nu vedem favoritele altcuiva

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

export default async function SavedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const userId = (session.user as any).id as string;

  // Filtrare strictă pe userId — esențial pentru izolarea datelor între utilizatori.
  const saved = await prisma.savedPost.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          author: { select: { name: true } },
          _count: { select: { comments: true, savedBy: true } },
        },
      },
    },
  });

  // Filtrăm posturile nepublicate (ar putea apărea dacă un articol e
  // depublicat după ce a fost salvat — îl ascundem din listă).
  const visiblePosts = saved.filter((s) => s.post.published);

  return (
    <main className="min-h-screen tech-grid">
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
        <div className="mb-10">
          <div className="text-circuit-500 font-mono text-sm mb-2">// FAVORITE</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-3">
            Articolele mele salvate
          </h1>
          <p className="text-carbon-400 font-mono text-sm">
            <span className="text-spark-400">{visiblePosts.length}</span>{' '}
            {visiblePosts.length === 1 ? 'articol salvat' : 'articole salvate'}
            {' '}— pentru realizare ulterioară
          </p>
        </div>

        {visiblePosts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-6">
              Niciun articol salvat încă. Apasă <span className="text-spark-400">⭐ Salvează</span> pe articolele care te interesează.
            </p>
            <Link href="/posts" className="btn-primary">
              Explorează proiectele
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePosts.map(({ post, createdAt }) => {
              const cat = CATEGORY_LABELS[post.category];
              return (
                <article key={post.id} className="card group">
                  {cat && (
                    <span className={`badge ${cat.class} mb-4`}>{cat.label}</span>
                  )}
                  <h2 className="font-display font-bold text-xl mb-3 group-hover:text-spark-400 transition-colors">
                    <Link href={`/posts/${post.slug}`}>{post.titleRo}</Link>
                  </h2>
                  <p className="text-carbon-400 text-sm mb-4 line-clamp-3">
                    {post.excerptRo}
                  </p>
                  <div className="flex items-center justify-between text-xs text-carbon-500 font-mono">
                    <span>{post.author.name}</span>
                    <span title="Data salvării">
                      ⭐{' '}
                      {new Intl.DateTimeFormat('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                      }).format(createdAt)}
                    </span>
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
