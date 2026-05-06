// src/components/CommentSection.tsx
// Server Component — listă comentarii + formular (sau prompt login).
// Fetch-ul se face pe server (mai rapid, nu expune query la client).

import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CommentForm from './CommentForm';
import DeleteCommentButton from './DeleteCommentButton';

export default async function CommentSection({ postId }: { postId: string }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user ? ((session.user as any).id as string) : null;
  const role = session?.user ? ((session.user as any).role as string) : null;

  // Pentru moment afișăm doar comentariile top-level. Threading-ul există
  // în schemă (parentId) — îl putem activa în UI ulterior.
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return (
    <section className="mt-16 pt-10 border-t border-carbon-800">
      <div className="text-circuit-500 font-mono text-sm mb-4">
        // COMENTARII ({comments.length})
      </div>
      <h2 className="font-display font-bold text-2xl mb-8">Discuție</h2>

      {/* Lista de comentarii */}
      {comments.length === 0 ? (
        <p className="text-carbon-500 font-mono text-sm mb-10">
          // niciun comentariu încă — fii primul!
        </p>
      ) : (
        <div className="space-y-4 mb-10">
          {comments.map((c) => {
            const canDelete = !!userId && (userId === c.author.id || role === 'ADMIN');
            return (
              <article key={c.id} className="card">
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-baseline gap-2 text-xs font-mono">
                    <span className="text-spark-400 font-bold">{c.author.name}</span>
                    <span className="text-carbon-500">
                      {new Intl.DateTimeFormat('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(c.createdAt)}
                    </span>
                  </div>
                  {canDelete && <DeleteCommentButton commentId={c.id} />}
                </header>
                {/*
                  Conținutul e text plain (sanitizat la salvare prin stripHtml).
                  React auto-escape + whitespace-pre-wrap pentru newline-uri.
                  Niciun risc XSS — chiar dacă cineva ar fi reușit să scape
                  ceva la nivel de salvare, randerea {c.content} face escape automat.
                */}
                <p className="text-carbon-200 whitespace-pre-wrap text-sm leading-relaxed">
                  {c.content}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Formular sau prompt de login */}
      {session?.user ? (
        <CommentForm postId={postId} />
      ) : (
        <div className="card text-center py-8">
          <p className="text-carbon-300 mb-4 font-mono text-sm">
            // Trebuie să fii autentificat ca să comentezi
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/auth/login" className="btn-primary">
              Autentificare
            </Link>
            <Link href="/auth/register" className="btn-secondary">
              Înregistrare
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
