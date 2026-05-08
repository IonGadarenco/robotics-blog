// src/app/dashboard/posts/[id]/edit/page.tsx
// Pagina de editare — Server Component pentru fetch + autorizare,
// apoi pasează datele către EditForm (Client Component).
//
// Aceeași politică ownership ca în API-ul PATCH/DELETE: defense in depth.

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';
import EditForm from './EditForm';
import FileUpload from './FileUpload';
import CoverImageUpload from './CoverImageUpload';

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';

  if (role !== 'AUTHOR' && role !== 'ADMIN') redirect('/');

  // Validare ID similar API-ului
  if (!params.id || params.id.length > 50 || !/^[a-z0-9]+$/i.test(params.id)) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
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
  if (!post) notFound();

  // Ownership: AUTHOR doar pe ale lui, ADMIN orice.
  if (role !== 'ADMIN' && post.authorId !== userId) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen tech-grid">
      <header className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono font-bold text-xl tracking-tight">
            Robo<span className="text-spark-500">Lab</span>
            <span className="text-carbon-500"> / </span>
            <span className="text-carbon-300">Dashboard</span>
          </Link>
          <HeaderActions />
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-block mb-6 text-carbon-400 hover:text-spark-400 font-mono text-sm"
        >
          ← Înapoi la dashboard
        </Link>
        <div className="text-circuit-500 font-mono text-sm mb-2">// EDITARE ARTICOL</div>
        <h1 className="font-display font-bold text-4xl mb-2">{post.titleRo}</h1>
        <p className="text-carbon-500 font-mono text-xs mb-10">
          /posts/{post.slug} · {post.published ? 'PUBLICAT' : 'DRAFT'}
        </p>

        {/* Cover image — primul, ca să-l vezi sus */}
        <div className="mb-10">
          <CoverImageUpload postId={post.id} initialCover={post.coverImage} />
        </div>

        <EditForm
          post={{
            id: post.id,
            titleRo: post.titleRo,
            titleEn: post.titleEn,
            excerptRo: post.excerptRo,
            excerptEn: post.excerptEn,
            contentRo: post.contentRo,
            contentEn: post.contentEn,
            category: post.category,
            published: post.published,
            slug: post.slug,
          }}
        />

        {/* Manager atașamente */}
        <div className="mt-10">
          <FileUpload postId={post.id} initialFiles={post.files} />
        </div>
      </section>
    </main>
  );
}
