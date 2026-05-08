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
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getLocale } from '@/lib/locale';

const CATEGORY_LABELS: Record<string, { ro: string; en: string; class: string }> = {
  ROBOTICS: { ro: 'Robotică', en: 'Robotics', class: 'badge-robotics' },
  THREE_D_PRINT: { ro: 'Imprimare 3D', en: '3D Printing', class: 'badge-3d' },
  WEB_DEV: { ro: 'Web Dev', en: 'Web Dev', class: 'badge-web' },
  TUTORIAL: { ro: 'Tutorial', en: 'Tutorial', class: 'badge-tutorial' },
  PROJECT: { ro: 'Proiect', en: 'Project', class: 'badge-robotics' },
};

export default async function SavedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const userId = (session.user as any).id as string;
  const locale = getLocale();
  const t = locale === 'en'
    ? { title: 'My saved articles', subtitle: 'for later realization', singular: 'article saved', plural: 'articles saved', empty: 'No articles saved yet. Click', emptyAction: 'Save', emptyEnding: 'on articles you like.', explore: 'Explore projects', back: '← Back to all', publicLink: 'Public', dataLabel: 'Save date' }
    : { title: 'Articolele mele salvate', subtitle: 'pentru realizare ulterioară', singular: 'articol salvat', plural: 'articole salvate', empty: 'Niciun articol salvat încă. Apasă', emptyAction: 'Salvează', emptyEnding: 'pe articolele care te interesează.', explore: 'Explorează proiectele', back: '← Înapoi la toate', publicLink: 'Public', dataLabel: 'Data salvării' };

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
          <div className="flex items-center gap-4">
            <Link
              href="/posts"
              className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider"
            >
              {t.publicLink}
            </Link>
            <LanguageSwitcher current={locale} />
            <HeaderActions locale={locale} />
          </div>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-circuit-500 font-mono text-sm mb-2">// FAVORITE</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-3">
            {t.title}
          </h1>
          <p className="text-carbon-400 font-mono text-sm">
            <span className="text-spark-400">{visiblePosts.length}</span>{' '}
            {visiblePosts.length === 1 ? t.singular : t.plural}
            {' '}— {t.subtitle}
          </p>
        </div>

        {visiblePosts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-6">
              {t.empty} <span className="text-spark-400">⭐ {t.emptyAction}</span> {t.emptyEnding}
            </p>
            <Link href="/posts" className="btn-primary">
              {t.explore}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePosts.map(({ post, createdAt }) => {
              const cat = CATEGORY_LABELS[post.category];
              const title = locale === 'en' ? post.titleEn : post.titleRo;
              const excerpt = locale === 'en' ? post.excerptEn : post.excerptRo;
              return (
                <article key={post.id} className="card group">
                  {cat && (
                    <span className={`badge ${cat.class} mb-4`}>{locale === 'en' ? cat.en : cat.ro}</span>
                  )}
                  <h2 className="font-display font-bold text-xl mb-3 group-hover:text-spark-400 transition-colors">
                    <Link href={`/posts/${post.slug}`}>{title}</Link>
                  </h2>
                  <p className="text-carbon-400 text-sm mb-4 line-clamp-3">
                    {excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-carbon-500 font-mono">
                    <span>{post.author.name}</span>
                    <span title={t.dataLabel}>
                      ⭐{' '}
                      {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
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
