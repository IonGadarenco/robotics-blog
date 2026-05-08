// src/app/dashboard/posts/[id]/edit/EditForm.tsx
// Formular editare — Client Component cu pre-fill din articolul existent.
// Submit -> PATCH /api/posts/[id]. Buton "Șterge" -> DELETE /api/posts/[id].
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'ROBOTICS', label: 'Robotică' },
  { value: 'THREE_D_PRINT', label: 'Imprimare 3D' },
  { value: 'WEB_DEV', label: 'Web Dev' },
  { value: 'TUTORIAL', label: 'Tutorial' },
  { value: 'PROJECT', label: 'Proiect' },
];

type FieldErrors = Partial<Record<
  | 'titleRo' | 'titleEn'
  | 'excerptRo' | 'excerptEn'
  | 'contentRo' | 'contentEn'
  | 'category' | 'published',
  string[]
>>;

interface PostInput {
  id: string;
  titleRo: string;
  titleEn: string;
  excerptRo: string;
  excerptEn: string;
  contentRo: string;
  contentEn: string;
  category: string;
  published: boolean;
  slug: string;
}

export default function EditForm({ post }: { post: PostInput }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const payload = {
      titleRo: fd.get('titleRo'),
      titleEn: fd.get('titleEn'),
      excerptRo: fd.get('excerptRo'),
      excerptEn: fd.get('excerptEn'),
      contentRo: fd.get('contentRo'),
      contentEn: fd.get('contentEn'),
      category: fd.get('category'),
      published: fd.get('published') === 'on',
    };

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details as FieldErrors);
        }
        setError(data.error || 'Eroare la salvare');
        setLoading(false);
        return;
      }

      setSuccess('Modificări salvate.');
      setLoading(false);
      router.refresh();
    } catch {
      setError('Eroare de rețea.');
      setLoading(false);
    }
  }

  async function handleDelete() {
    // Confirmare obligatorie — operațiune ireversibilă
    const confirmed = window.confirm(
      `Ești sigur că vrei să ștergi articolul "${post.titleRo}"?\n\nAceastă acțiune e ireversibilă — comentariile și salvările se vor șterge automat.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la ștergere');
        setDeleting(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Eroare de rețea.');
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Categorie + Published */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="category" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Categorie
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={post.category}
            className="input-field"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <FieldErr msgs={fieldErrors.category} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="published"
              defaultChecked={post.published}
              className="w-5 h-5 accent-spark-500"
            />
            <span className="font-mono text-sm">Publicat</span>
          </label>
        </div>
      </div>

      {/* Titluri */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="titleRo" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Titlu (română)
          </label>
          <input
            id="titleRo"
            name="titleRo"
            type="text"
            required
            minLength={5}
            maxLength={200}
            defaultValue={post.titleRo}
            className="input-field"
          />
          <p className="mt-2 text-xs font-mono text-carbon-500">
            URL fix: <span className="text-circuit-400">/posts/{post.slug}</span>
            <span className="ml-2 text-carbon-600">(slug-ul nu se schimbă la editare)</span>
          </p>
          <FieldErr msgs={fieldErrors.titleRo} />
        </div>
        <div>
          <label htmlFor="titleEn" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Title (English)
          </label>
          <input
            id="titleEn"
            name="titleEn"
            type="text"
            required
            minLength={5}
            maxLength={200}
            defaultValue={post.titleEn}
            className="input-field"
          />
          <FieldErr msgs={fieldErrors.titleEn} />
        </div>
      </div>

      {/* Excerpts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="excerptRo" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Rezumat (română)
          </label>
          <textarea
            id="excerptRo"
            name="excerptRo"
            required
            minLength={20}
            maxLength={500}
            rows={3}
            defaultValue={post.excerptRo}
            className="input-field"
          />
          <FieldErr msgs={fieldErrors.excerptRo} />
        </div>
        <div>
          <label htmlFor="excerptEn" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Excerpt (English)
          </label>
          <textarea
            id="excerptEn"
            name="excerptEn"
            required
            minLength={20}
            maxLength={500}
            rows={3}
            defaultValue={post.excerptEn}
            className="input-field"
          />
          <FieldErr msgs={fieldErrors.excerptEn} />
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-carbon-400 text-xs font-mono mb-3 leading-relaxed">
          <span className="text-circuit-400">Markdown suportat:</span>{' '}
          <code className="text-spark-400">**bold**</code>,{' '}
          <code className="text-spark-400"># Titlu</code>,{' '}
          <code className="text-spark-400">## Subtitlu</code>,{' '}
          <code className="text-spark-400">- listă</code>,{' '}
          <code className="text-spark-400">[text](url)</code>,{' '}
          <code className="text-spark-400">![alt](url)</code> pentru imagini inline.
          Folosește butonul 📋 din secțiunea atașamente pentru a insera referințe rapid.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contentRo" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Conținut (română)
          </label>
          <textarea
            id="contentRo"
            name="contentRo"
            required
            minLength={50}
            maxLength={50000}
            rows={15}
            defaultValue={post.contentRo}
            className="input-field font-mono text-sm"
          />
          <FieldErr msgs={fieldErrors.contentRo} />
        </div>
        <div>
          <label htmlFor="contentEn" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
            Content (English)
          </label>
          <textarea
            id="contentEn"
            name="contentEn"
            required
            minLength={50}
            maxLength={50000}
            rows={15}
            defaultValue={post.contentEn}
            className="input-field font-mono text-sm"
          />
          <FieldErr msgs={fieldErrors.contentEn} />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/20 border border-green-700 p-3 text-green-300 font-mono text-sm">
          ✓ {success}
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-between items-center pt-6 border-t border-carbon-800">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || deleting}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Se salvează...' : 'Salvează modificările'}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Renunță
          </Link>
        </div>

        {/* Buton ștergere — în zonă vizual separată ca să prevenim click accidental */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || deleting}
          className="px-4 py-2 border-2 border-red-800 text-red-400 font-mono font-bold uppercase tracking-wider text-sm hover:bg-red-900/30 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Se șterge...' : '🗑 Șterge articolul'}
        </button>
      </div>
    </form>
  );
}

function FieldErr({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {msgs.map((m, i) => (
        <p key={i} className="text-red-400 text-xs font-mono">⚠ {m}</p>
      ))}
    </div>
  );
}
