// src/app/page.tsx
// Pagina principală — hero + listă articole recente

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getLocale, type Locale } from '@/lib/locale';

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

const categoryLabels: Record<string, { ro: string; en: string; class: string }> = {
  ROBOTICS: { ro: 'Robotică', en: 'Robotics', class: 'badge-robotics' },
  THREE_D_PRINT: { ro: '3D Print', en: '3D Print', class: 'badge-3d' },
  WEB_DEV: { ro: 'Web Dev', en: 'Web Dev', class: 'badge-web' },
  TUTORIAL: { ro: 'Tutorial', en: 'Tutorial', class: 'badge-tutorial' },
  PROJECT: { ro: 'Proiect', en: 'Project', class: 'badge-robotics' },
};

function catLabel(value: string, locale: Locale) {
  const c = categoryLabels[value];
  return locale === 'en' ? c.en : c.ro;
}

export default async function HomePage() {
  const locale = getLocale();
  const posts = await getRecentPosts();

  // Etichete UI homepage — pentru consistență cu /posts și /posts/[slug].
  const t = locale === 'en'
    ? {
        community: 'Educational community', heroL1: 'We build.', heroL2: 'We document.', heroL3: 'We inspire.',
        heroDesc: 'Platform for robotics, 3D printing, and web development projects. Publish, discover, comment — or save ideas for your next project.',
        explore: 'Explore projects', becomeAuthor: 'Become an author',
        projects: 'PROJECTS', projectsSub: 'Fully documented',
        categories: 'CATEGORIES', categoriesSub: 'Domains covered',
        access: 'ACCESS', accessSub: 'Availability',
        languages: 'LANGUAGES', languagesSub: 'Bilingual content',
        recent: 'RECENT PROJECTS', latestPub: 'Latest published', allLink: 'All →',
        empty: 'No projects published yet. Be the first to contribute!', register: 'Sign up',
        navProjects: 'Projects', footerSub: 'Educational platform with focus on information security. Bachelor thesis project — ULIM 2026.', tlsNote: 'All data encrypted in transit (TLS 1.3)',
      }
    : {
        community: 'Comunitate educațională', heroL1: 'Construim.', heroL2: 'Documentăm.', heroL3: 'Inspirăm.',
        heroDesc: 'Platformă pentru proiecte de robotică, imprimare 3D și dezvoltare web. Publică, descoperă, comentează — sau salvează idei pentru următorul tău proiect.',
        explore: 'Explorează proiectele', becomeAuthor: 'Devino autor',
        projects: 'PROIECTE', projectsSub: 'Documentate complet',
        categories: 'CATEGORII', categoriesSub: 'Domenii acoperite',
        access: 'ACCES', accessSub: 'Disponibilitate',
        languages: 'LIMBI', languagesSub: 'Conținut bilingv',
        recent: 'PROIECTE RECENTE', latestPub: 'Ultimele publicate', allLink: 'Toate →',
        empty: 'Niciun proiect publicat încă. Fii primul care contribuie!', register: 'Înregistrează-te',
        navProjects: 'Proiecte', footerSub: 'Platformă educațională cu accent pe securitatea informației. Proiect de licență — ULIM 2026.', tlsNote: 'Toate datele sunt criptate în tranzit (TLS 1.3)',
      };

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
          <div className="flex items-center gap-4">
            <Link href="/posts" className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider">
              {t.navProjects}
            </Link>
            <LanguageSwitcher current={locale} />
            <HeaderActions locale={locale} />
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="fade-in-up">
            <div className="inline-block badge bg-carbon-800 text-spark-400 mb-6">
              <span className="text-circuit-500">{'>'}</span> {t.community}
            </div>
            <h1 className="font-display font-bold text-5xl md:text-7xl leading-tight mb-6">
              {t.heroL1}
              <br />
              <span className="text-spark-500">{t.heroL2}</span>
              <br />
              {t.heroL3}
            </h1>
            <p className="text-carbon-300 text-lg mb-8 max-w-lg">
              {t.heroDesc}
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/posts" className="btn-primary">
                {t.explore}
              </Link>
              <Link href="/auth/register" className="btn-secondary">
                {t.becomeAuthor}
              </Link>
            </div>
          </div>

          {/* Bloc statistici / "circuit" decorativ */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-spark-500/10 blur-3xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="card">
                <div className="text-circuit-500 font-mono text-xs mb-2">// {t.projects}</div>
                <div className="font-display font-bold text-4xl text-spark-500">{posts.length}+</div>
                <div className="text-carbon-400 text-sm mt-2">{t.projectsSub}</div>
              </div>
              <div className="card mt-8">
                <div className="text-circuit-500 font-mono text-xs mb-2">// {t.categories}</div>
                <div className="font-display font-bold text-4xl">5</div>
                <div className="text-carbon-400 text-sm mt-2">{t.categoriesSub}</div>
              </div>
              <div className="card">
                <div className="text-circuit-500 font-mono text-xs mb-2">// {t.access}</div>
                <div className="font-display font-bold text-4xl">24/7</div>
                <div className="text-carbon-400 text-sm mt-2">{t.accessSub}</div>
              </div>
              <div className="card mt-8">
                <div className="text-circuit-500 font-mono text-xs mb-2">// {t.languages}</div>
                <div className="font-display font-bold text-4xl">RO/EN</div>
                <div className="text-carbon-400 text-sm mt-2">{t.languagesSub}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articole recente */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-carbon-800">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-circuit-500 font-mono text-sm mb-2">// {t.recent}</div>
            <h2 className="font-display font-bold text-4xl">{t.latestPub}</h2>
          </div>
          <Link href="/posts" className="text-spark-400 font-mono text-sm uppercase tracking-wider hover:text-spark-300">
            {t.allLink}
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-6">{t.empty}</p>
            <Link href="/auth/register" className="btn-primary">
              {t.register}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const cat = categoryLabels[post.category];
              const title = locale === 'en' ? post.titleEn : post.titleRo;
              const excerpt = locale === 'en' ? post.excerptEn : post.excerptRo;
              return (
                <article key={post.id} className="card group p-0 overflow-hidden">
                  {post.coverImage && (
                    <Link href={`/posts/${post.slug}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={title}
                        className="w-full h-40 object-cover border-b border-carbon-700"
                      />
                    </Link>
                  )}
                  <div className="p-6">
                  <span className={`badge ${cat.class} mb-4`}>{catLabel(post.category, locale)}</span>
                  <h3 className="font-display font-bold text-xl mb-3 group-hover:text-spark-400 transition-colors">
                    <Link href={`/posts/${post.slug}`}>{title}</Link>
                  </h3>
                  <p className="text-carbon-400 text-sm mb-4 line-clamp-3">
                    {excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-carbon-500 font-mono">
                    <span>{post.author.name}</span>
                    <div className="flex gap-3">
                      <span>💬 {post._count.comments}</span>
                      <span>⭐ {post._count.savedBy}</span>
                    </div>
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
                {t.footerSub}
              </p>
            </div>
            <div className="text-carbon-500 font-mono text-xs">
              <div>© 2026 Ion Gadarenco</div>
              <div className="mt-1">{t.tlsNote}</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
