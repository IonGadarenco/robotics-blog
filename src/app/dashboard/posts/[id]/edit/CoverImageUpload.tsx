// src/app/dashboard/posts/[id]/edit/CoverImageUpload.tsx
// Upload + preview + ștergere pentru imaginea de cover a articolului.
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CoverImageUpload({
  postId,
  initialCover,
}: {
  postId: string;
  initialCover: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState(initialCover);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`/api/posts/${postId}/cover`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload eșuat');
        if (Array.isArray(data.details)) {
          setError(data.error + ': ' + data.details.join(', '));
        }
        if (inputRef.current) inputRef.current.value = '';
        setUploading(false);
        return;
      }
      setCover(data.coverImage);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError('Eroare de rețea');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Elimini imaginea principală?')) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/cover`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Ștergere eșuată');
        setRemoving(false);
        return;
      }
      setCover(null);
      router.refresh();
    } catch {
      setError('Eroare de rețea');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <div className="text-circuit-500 font-mono text-xs mb-1">// COVER_IMAGE</div>
        <h2 className="font-display font-bold text-xl">Imagine principală</h2>
        <p className="text-carbon-400 text-xs font-mono mt-1">
          Apare în lista de articole și deasupra titlului. JPG/PNG/WebP, max 10 MB.
        </p>
      </div>

      {/* Preview cover curent */}
      {cover ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt="Cover preview"
            className="w-full max-h-64 object-cover border border-carbon-700"
          />
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || removing}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {uploading ? 'Se încarcă...' : 'Schimbă imaginea'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="px-4 py-2 border-2 border-red-800 text-red-400 font-mono font-bold uppercase tracking-wider text-sm hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {removing ? 'Se elimină...' : '🗑 Elimină'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {uploading ? 'Se încarcă...' : '+ Alege imagine'}
          </button>
        </div>
      )}

      {/* Input file ascuns — declanșat din butoanele vizibile */}
      <input
        ref={inputRef}
        type="file"
        onChange={handleUpload}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {error && (
        <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
