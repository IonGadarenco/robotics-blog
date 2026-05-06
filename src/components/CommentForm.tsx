// src/components/CommentForm.tsx
// Client Component — formular submitere comentariu.
// Submit cu fetch -> POST /api/comments. Validarea reală e pe server.
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const content = fd.get('content') as string;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Eroare la postare');
        setLoading(false);
        return;
      }

      // Reset formular și refresh server data ca să apară noul comentariu.
      formRef.current?.reset();
      setLoading(false);
      router.refresh();
    } catch {
      setError('Eroare de rețea.');
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card space-y-3">
      <label
        htmlFor="comment-content"
        className="block text-xs font-mono uppercase tracking-wider text-carbon-300"
      >
        Adaugă un comentariu
      </label>
      <textarea
        id="comment-content"
        name="content"
        required
        minLength={2}
        maxLength={2000}
        rows={4}
        placeholder="Comentariile sunt text plain — niciun HTML/script nu va fi interpretat."
        className="input-field"
      />
      {error && (
        <p className="text-red-400 text-xs font-mono">⚠ {error}</p>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-carbon-500 text-xs font-mono">
          // max 2000 caractere
        </p>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 text-sm"
        >
          {loading ? 'Se postează...' : 'Trimite'}
        </button>
      </div>
    </form>
  );
}
