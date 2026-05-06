// src/components/DeleteCommentButton.tsx
// Client Component — buton ștergere comentariu cu confirmare.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!window.confirm('Ștergi acest comentariu? Acțiunea e ireversibilă.')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Nu am putut șterge comentariul.');
      }
    } catch {
      alert('Eroare de rețea.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Șterge comentariul"
      className="text-red-400 hover:text-red-300 font-mono text-xs disabled:opacity-50 transition-colors"
    >
      {loading ? '...' : '🗑'}
    </button>
  );
}
