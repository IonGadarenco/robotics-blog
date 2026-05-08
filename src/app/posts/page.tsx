// src/app/posts/page.tsx
// Pagina publică de listă articole — paginare + filtru pe categorie.
// Server Component: tot fetch-ul se face pe server, HTML-ul ajunge gata
// la client (mai rapid, mai sigur — nu expune logica de query la browser).

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { Category } from '@prisma/client';
import HeaderActions from '@/components/HeaderActions';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getLocale } from '@/lib/locale';

// Valorile permise pentru filtru — listă albă (whitelist).
// Niciun input din URL nu se trimite direct în query Prisma fără să fie aici.
const CATEGORIES: { value: Category; ro: string; en: string; class: string }[] = [
  { value: 'ROBOTICS', ro: 'Robotică', en: 'Robotics', class: 'badge-robotics' },
  { value: 'THREE_D_PRINT', ro: 'Imprimare 3D', en: '3D Printing', class: 'badge-3d' },
  { value: 'WEB_DEV', ro: 'Web Dev', en: 'Web Dev', class: 'badge-web' },
  { value: 'TUTORIAL', ro: 'Tutorial', en: 'Tutorial', class: 'badge-tutorial' },
  { value: 'PROJECT', ro: 'Proiect', en: 'Project', class: 'badge-robotics' },
];

const PAGE_SIZE = 9; // 3 coloane × 3 rânduri

// Helper: găsește configul unei categorii sau întoarce undefined dacă nu e validă.
function findCategory(value: string | undefined): Category | undefined {
  if (!value) return undefined;
  const found = CATEGORIES.find((c) => c.value === value);
  return found?.value;
}

// Helper: parsează ?page= asigurând că e un întreg pozitiv.
function parsePage(value: string | undefined): number {
  const n = parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

// Construiește un link cu noile params, păstrând ce nu se modifică.
function buildHref(params: { category?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const qs = sp.toString();
  return qs ? `/posts?${qs}` : '/posts';
}

interface SearchParams {
  category?: string;
  page?: string;
}

export default async function PostsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Validăm input-ul din URL împotriva whitelist-ului — apărare împotriva
  // injecțiilor și a parametrilor neașteptați (defense in depth: chiar dacă
  // Prisma e parametrizat, validăm încă o dată la nivelul rutei).
  const category = findCategory(searchParams.category);
  const page = parsePage(searchParams.page);
  const skip = (page - 1) * PAGE_SIZE;
  const locale = getLocale();
  const t = locale === 'en'
    ? { allBtn: 'All', title: 'All projects', empty: 'No projects match your filters.', back: '← Back to all', prev: '← Previous', next: 'Next →', pageOf: 'Page', of: 'of', author: 'by', counter: (n: number) => `${n} project${n === 1 ? '' : 's'} published`, inCat: (c: string) => ` in category ${c}`, home: 'Home' }
    : { allBtn: 'Toate', title: 'Toate proiectele', empty: 'Niciun proiect găsit pentru filtrele selectate.', back: '← Înapoi la toate', prev: '← Anterior', next: 'Următor →', pageOf: 'Pagina', of: 'din', author: 'de', counter: (n: number) => `${n} ${n === 1 ? 'proiect publicat' : 'proiecte publicate'}`, inCat: (c: string) => ` în categoria ${c}`, home: 'Acasă' };

  // WHERE clause comună pentru COUNT și findMany.
  const where = {
    published: true,
    ...(category ? { category } : {}),
  };

  // Două query-uri în paralel pentru performanță (count + listă).
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        author: { select: { name: true } },
        _count: { select: { comments: true, savedBy: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen tech-grid">
      {/* Header simplu — același design ca homepage */}
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
            <Link href="/" className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider">
              {t.home}
            </Link>
            <LanguageSwitcher current={locale} />
            <HeaderActions locale={locale} />
          </div>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-circuit-500 font-mono text-sm mb-2">// PROIECTE</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-4">
            {t.title}
          </h1>
          <p className="text-carbon-400">
            {t.counter(total)}
            {category ? t.inCat((locale === 'en' ? CATEGORIES.find((c) => c.value === category)?.en : CATEGORIES.find((c) => c.value === category)?.ro) || '') : ''}.
          </p>
        </div>

        {/* Bară filtre categorie — chip-uri */}
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href={buildHref({})}
            className={`badge transition-colors ${
              !category
                ? 'bg-spark-500 text-carbon-900'
                : 'bg-carbon-800 text-carbon-300 hover:bg-carbon-700'
            }`}
          >
            {t.allBtn}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={buildHref({ category: c.value })}
              className={`badge transition-colors ${
                category === c.value
                  ? 'bg-spark-500 text-carbon-900'
                  : 'bg-carbon-800 text-carbon-300 hover:bg-carbon-700'
              }`}
            >
              {locale === 'en' ? c.en : c.ro}
            </Link>
          ))}
        </div>

        {/* Lista articole sau empty state */}
        {posts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-carbon-500 font-mono mb-4">// EMPTY STATE</div>
            <p className="text-carbon-300 mb-2">{t.empty}</p>
            {category && (
              <Link href="/posts" className="text-spark-400 font-mono text-sm hover:text-spark-300">
                {t.back}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const cat = CATEGORIES.find((c) => c.value === post.category);
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
                    {cat && <span className={`badge ${cat.class} mb-4`}>{locale === 'en' ? cat.en : cat.ro}</span>}
                    <h2 className="font-display font-bold text-xl mb-3 group-hover:text-spark-400 transition-colors">
                      <Link href={`/posts/${post.slug}`}>{title}</Link>
                    </h2>
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

        {/* Paginare — afișată doar dacă avem mai mult de o pagină */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-carbon-800 pt-6">
            {page > 1 ? (
              <Link
                href={buildHref({ category, page: page - 1 })}
                className="btn-secondary text-sm"
              >
                {t.prev}
              </Link>
            ) : (
              <span className="text-carbon-600 font-mono text-sm">{t.prev}</span>
            )}

            <span className="font-mono text-sm text-carbon-400">
              {t.pageOf} <span className="text-spark-400">{page}</span> {t.of} {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildHref({ category, page: page + 1 })}
                className="btn-secondary text-sm"
              >
                {t.next}
              </Link>
            ) : (
              <span className="text-carbon-600 font-mono text-sm">{t.next}</span>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
