// src/app/dashboard/posts/new/page.tsx
// Formular creare articol — Client Component (interactiv).
// Submit cu fetch -> /api/posts. Toate validările se fac și server-side.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HeaderActions from '@/components/HeaderActions';
import { slugify } from '@/lib/slug';

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

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Preview slug live (informativ — slug-ul real se generează pe server).
  const [titleRo, setTitleRo] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      // Checkbox: dacă e bifat, vine "on", altfel undefined → boolean.
      published: fd.get('published') === 'on',
    };

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details as FieldErrors);
        }
        setError(data.error || 'Eroare la creare');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Eroare de rețea. Verifică conexiunea.');
      setLoading(false);
    }
  }

  const slugPreview = titleRo ? slugify(titleRo) : '';

  return (
    <main className="min-h-screen tech-grid">
      {/* Header */}
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
        <div className="text-circuit-500 font-mono text-sm mb-2">// CREARE ARTICOL</div>
        <h1 className="font-display font-bold text-4xl mb-10">Articol nou</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Categorie + Publicare */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                Categorie
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue="ROBOTICS"
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
                  className="w-5 h-5 accent-spark-500"
                />
                <span className="font-mono text-sm">
                  Publică imediat <span className="text-carbon-500">(altfel rămâne draft)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Titluri RO / EN */}
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
                value={titleRo}
                onChange={(e) => setTitleRo(e.target.value)}
                className="input-field"
                placeholder="Ex: Arduino UNO — primul tău LED"
              />
              {slugPreview && (
                <p className="mt-2 text-xs font-mono text-carbon-500">
                  URL: <span className="text-circuit-400">/posts/{slugPreview}</span>
                </p>
              )}
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
                className="input-field"
                placeholder="Ex: Arduino UNO — your first LED"
              />
              <FieldErr msgs={fieldErrors.titleEn} />
            </div>
          </div>

          {/* Excerpts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="excerptRo" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                Rezumat (română) <span className="text-carbon-500 normal-case">— 20-500 caractere</span>
              </label>
              <textarea
                id="excerptRo"
                name="excerptRo"
                required
                minLength={20}
                maxLength={500}
                rows={3}
                className="input-field"
                placeholder="O frază care prinde atenția."
              />
              <FieldErr msgs={fieldErrors.excerptRo} />
            </div>
            <div>
              <label htmlFor="excerptEn" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                Excerpt (English) <span className="text-carbon-500 normal-case">— 20-500 chars</span>
              </label>
              <textarea
                id="excerptEn"
                name="excerptEn"
                required
                minLength={20}
                maxLength={500}
                rows={3}
                className="input-field"
                placeholder="One sentence that grabs attention."
              />
              <FieldErr msgs={fieldErrors.excerptEn} />
            </div>
          </div>

          {/* Conținut */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contentRo" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                Conținut (română) <span className="text-carbon-500 normal-case">— 50-50000 caractere</span>
              </label>
              <textarea
                id="contentRo"
                name="contentRo"
                required
                minLength={50}
                maxLength={50000}
                rows={15}
                className="input-field font-mono text-sm"
                placeholder="Conținutul complet al articolului..."
              />
              <FieldErr msgs={fieldErrors.contentRo} />
            </div>
            <div>
              <label htmlFor="contentEn" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                Content (English) <span className="text-carbon-500 normal-case">— 50-50000 chars</span>
              </label>
              <textarea
                id="contentEn"
                name="contentEn"
                required
                minLength={50}
                maxLength={50000}
                rows={15}
                className="input-field font-mono text-sm"
                placeholder="Full article content..."
              />
              <FieldErr msgs={fieldErrors.contentEn} />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
              ⚠ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Se salvează...' : 'Creează articol'}
            </button>
            <Link href="/dashboard" className="btn-secondary">
              Anulează
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

// Mic component pentru afișarea erorilor per câmp.
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
