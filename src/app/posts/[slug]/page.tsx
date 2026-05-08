// src/app/posts/[slug]/page.tsx
// Pagina publică a unui articol individual.
// Server Component — fetch-ul se face pe server, HTML-ul e gata la client.
// notFound() din next/navigation produce 404 corect (cu pagina /not-found dacă există).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Category } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';
import CommentSection from '@/components/CommentSection';
import SaveButton from '@/components/SaveButton';

// Mapare categorie -> etichetă vizibilă + clasă badge (consistent cu /posts și /).
const CATEGORY_LABELS: Record<Category, { label: string; class: string }> = {
  ROBOTICS: { label: 'Robotică', class: 'badge-robotics' },
  THREE_D_PRINT: { label: 'Imprimare 3D', class: 'badge-3d' },
  WEB_DEV: { label: 'Web Dev', class: 'badge-web' },
  TUTORIAL: { label: 'Tutorial', class: 'badge-tutorial' },
  PROJECT: { label: 'Proiect', class: 'badge-robotics' },
};

// Caută post-ul cu acest slug. Filtrăm pe published=true ca să nu expunem
// articolele nepublicate prin URL ghicit (apărare împotriva enumerării conținutului).
async function getPost(slug: string) {
  return prisma.post.findFirst({
    where: { slug, published: true },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true, savedBy: true } },
      files: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          filename: true,
          storedAs: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });
}

// Incrementare views — fire-and-forget. Atomicitate prin operatorul `increment`
// din Prisma (UPDATE ... SET views = views + 1) — fără race condition.
function incrementViews(id: string) {
  prisma.post
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch((err) => console.error('incrementViews failed:', err));
}

// Metadata SEO — Next o folosește pentru <title> și OpenGraph.
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Articol negăsit' };
  return {
    title: post.titleRo,
    description: post.excerptRo,
    openGraph: {
      title: post.titleRo,
      description: post.excerptRo,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name],
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // Validare minimă slug — Prisma ar accepta orice string, dar noi tăiem
  // formate suspecte înainte de a interoga BD.
  if (!params.slug || params.slug.length > 200 || !/^[a-z0-9-]+$/i.test(params.slug)) {
    notFound();
  }

  const post = await getPost(params.slug);
  if (!post) notFound();

  // Crește views asincron, fără să blocăm randarea.
  incrementViews(post.id);

  // Stare salvat — pentru SaveButton. Fetch pe server ca să nu avem flicker.
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : null;
  const isSaved = userId
    ? !!(await prisma.savedPost.findUnique({
        where: { userId_postId: { userId, postId: post.id } },
        select: { id: true },
      }))
    : false;

  const category = CATEGORY_LABELS[post.category];

  // Format dată în limba română.
  const publishedDate = post.publishedAt
    ? new Intl.DateTimeFormat('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(post.publishedAt)
    : null;

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
              Toate proiectele
            </Link>
            <HeaderActions />
          </div>
        </nav>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <Link
          href="/posts"
          className="inline-block mb-8 text-carbon-400 hover:text-spark-400 font-mono text-sm"
        >
          ← Toate proiectele
        </Link>

        {/* Header articol */}
        <header className="mb-10 pb-10 border-b border-carbon-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <span className={`badge ${category.class} inline-block`}>{category.label}</span>
            <SaveButton
              postId={post.id}
              initialSaved={isSaved}
              isAuthenticated={!!userId}
            />
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mb-6 leading-tight">
            {post.titleRo}
          </h1>

          {/* Excerpt subliniat */}
          <p className="text-carbon-300 text-lg leading-relaxed mb-8">
            {post.excerptRo}
          </p>

          {/* Meta: autor, dată, statistici */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-carbon-500">
            <span>
              de <span className="text-carbon-200">{post.author.name}</span>
            </span>
            {publishedDate && (
              <>
                <span>•</span>
                <time dateTime={post.publishedAt!.toISOString()}>{publishedDate}</time>
              </>
            )}
            <span>•</span>
            <span>👁 {post.views} vizualizări</span>
            <span>•</span>
            <span>💬 {post._count.comments} comentarii</span>
            <span>•</span>
            <span>⭐ {post._count.savedBy} salvări</span>
          </div>
        </header>

        {/* Conținut.
            whitespace-pre-wrap păstrează newline-urile din BD pentru afișare.
            Notă: pentru P1.4 (rich text + sanitizare) vom înlocui aceasta cu
            renderer Markdown + DOMPurify pentru conținut UGC. */}
        <div className="prose prose-invert max-w-none">
          <div className="text-carbon-200 leading-relaxed whitespace-pre-wrap font-sans text-base">
            {post.contentRo}
          </div>
        </div>

        {/* Atașamente — afișate doar dacă există */}
        {post.files.length > 0 && (
          <section className="mt-12 pt-8 border-t border-carbon-800">
            <div className="text-circuit-500 font-mono text-sm mb-4">
              // ATAȘAMENTE ({post.files.length})
            </div>
            <ul className="space-y-2">
              {post.files.map((f) => {
                const sizeStr =
                  f.size < 1024
                    ? `${f.size} B`
                    : f.size < 1024 * 1024
                      ? `${(f.size / 1024).toFixed(1)} KB`
                      : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
                const icon = f.mimeType.startsWith('image/')
                  ? '🖼'
                  : f.mimeType === 'application/pdf'
                    ? '📄'
                    : f.mimeType === 'application/zip'
                      ? '📦'
                      : f.mimeType === 'model/stl' || f.mimeType === 'application/octet-stream'
                        ? '🔩'
                        : '📎';
                return (
                  <li key={f.id} className="card flex items-center gap-3 hover:border-spark-600">
                    <span className="text-2xl">{icon}</span>
                    <a
                      href={`/uploads/${f.storedAs}`}
                      target="_blank"
                      rel="noopener"
                      className="flex-1 font-mono text-sm text-spark-400 hover:text-spark-300 truncate"
                      title={f.filename}
                      download={f.filename}
                    >
                      {f.filename}
                    </a>
                    <span className="text-xs font-mono text-carbon-500">{sizeStr}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Sistem comentarii — sanitizare anti-XSS în /api/comments */}
        <CommentSection postId={post.id} />
      </article>
    </main>
  );
}
