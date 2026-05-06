// src/app/page.tsx
// Pagina principală — hero + listă articole recente

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';

async function getRecentPosts() {
  try {
    return await prisma.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true, savedBy: true } },
      },
    });
  } catch {
    // În prima rulare baza de date poate fi goală
    return [];
  }
}

const categoryLabels: Record<string, { ro: string; class: string }> = {
  ROBOTICS: { ro: 'Robotică', class: 'badge-robotics' },
  THREE_D_PRINT: { ro: '3D Print', class: 'badge-3d' },
  WEB_DEV: { ro: 'Web Dev', class: 'badge-web' },
  TUTORIAL: { ro: 'Tutorial', class: 'badge-tutorial' },
  PROJECT: { ro: 'Proiect', class: 'badge-robotics' },
};

export default async function HomePage() {
  const posts = await getRecentPosts();

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
            <Link href="/posts" className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider">
              Proiecte
            </Link>
            <HeaderActions />
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="fade-in-up">
            <div className="inline-block badge bg-carbon-800 text-spark-400 mb-6">
              <span className="text-circuit-500">{'>'}</span> Comunitate educațională
            </div>
            <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight mb-6">
              Construim.
              <br />
              <span className="text-spark-500">Documentăm.</span>
              <br />
              Inspirăm.
            </h1>
            <p className="text-carbon-300 text-lg mb-8 max-w-lg">
              Platformă pentru proiecte de robotică, imprimare 3D și dezvoltare web. 
              Publică, descoperă, comentează — sau salvează idei pentru următorul tău proiect.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/posts" className="btn-primary">
                Explorează proiectele
              </Link>
              <Link href="/auth/register" className="btn-secondary">
                Devino autor
              </Link>
            </div>
          </div>

          {/* Bloc statistici / "circuit" decorativ */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-spark-500/10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="card">
                <div className="text-circuit-500 font-mono text-xs mb-2">// PROIECTE</div>
                <div className="font-display font-bold text-4xl text-spark-500">{posts.length}+</div>
                <div className="text-carbon-400 text-sm mt-2">Documentate complet</div>
              </div>
              <div className="card mt-8">
                <div className="text-circuit-500 font-mono text-xs mb-2">// CATEGORII</div>
                <div className="font-display font-bold text-4xl">5</div>
                <div className="text-carbon-400 text-sm mt-2">Domenii acoperite</div>
              </div>
              <div className="card">
                <div className="text-circuit-500 font-mono text-xs mb-2">// ACCES</div>
                <div className="font-display font-bold text-4xl">24/7</div>
                <div className="text-carbon-400 text-sm mt-2">Disponibilitate</div>
              </div>
              <div className="card mt-8">
                <div className="text-circuit-500 font-mono text-xs mb-2">// LIMBI</div>
                <div className="font-display font-bold text-4xl">RO/EN</div>
                <div className="text-carbon-400 text-sm mt-2">Conținut bilingv</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articole recente */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-carbon-800">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-circuit-500 font-mono text-sm mb-2">// PROIECTE RECENTE</div>
            <h2 className="font-display font-bold text-4xl">Ultimele publicate</h2>
          </div>
          <Link href="/posts" className="text-spark-400 font-mono text-sm uppercase tracking-wider hover:text-spark-300">
            Toate →
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-6">
              Niciun proiect publicat încă. Fii primul care contribuie!
            </p>
            <Link href="/auth/register" className="btn-primary">
              Înregistrează-te
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const cat = categoryLabels[post.category];
              return (
                <article key={post.id} className="card group">
                  <span className={`badge ${cat.class} mb-4`}>{cat.ro}</span>
                  <h3 className="font-display font-bold text-xl mb-3 group-hover:text-spark-400 transition-colors">
                    <Link href={`/posts/${post.slug}`}>{post.titleRo}</Link>
                  </h3>
                  <p className="text-carbon-400 text-sm mb-4 line-clamp-3">
                    {post.excerptRo}
                  </p>
                  <div className="flex items-center justify-between text-xs text-carbon-500 font-mono">
                    <span>{post.author.name}</span>
                    <div className="flex gap-3">
                      <span>💬 {post._count.comments}</span>
                      <span>⭐ {post._count.savedBy}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-carbon-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="font-mono font-bold text-lg mb-2">
                Robo<span className="text-spark-500">Lab</span>
              </div>
              <p className="text-carbon-400 text-sm max-w-md">
                Platformă educațională cu accent pe securitatea informației. 
                Proiect de licență — ULIM 2026.
              </p>
            </div>
            <div className="text-carbon-500 font-mono text-xs">
              <div>© 2026 Ion Gadarenco</div>
              <div className="mt-1">Toate datele sunt criptate în tranzit (TLS 1.3)</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
