// src/components/SaveButton.tsx
// Buton client pentru salvare/eliminare articol favorit.
// Primește starea inițială ca prop (server-rendered) — fără flicker la mount.
// Update optimist — UI se schimbă imediat, revine dacă API-ul eșuează.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Locale = 'ro' | 'en';

interface Props {
  postId: string;
  initialSaved: boolean;
  // Dacă utilizatorul nu e logat, server-ul ne dă null și butonul redirect-ează la login.
  isAuthenticated: boolean;
  locale?: Locale;
}

export default function SaveButton({ postId, initialSaved, isAuthenticated, locale = 'ro' }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const t = locale === 'en'
    ? { save: 'Save', saved: 'Saved', loginToSave: 'Log in to save', removeFromFav: 'Remove from favorites', saveForLater: 'Save for later' }
    : { save: 'Salvează', saved: 'Salvat', loginToSave: 'Autentifică-te ca să salvezi', removeFromFav: 'Elimină din favorite', saveForLater: 'Salvează pentru mai târziu' };

  async function handleClick() {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (loading) return;
    setLoading(true);

    // Update optimist — UI răspunde imediat
    const previousState = saved;
    const newState = !saved;
    setSaved(newState);

    try {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: newState ? 'POST' : 'DELETE',
      });
      if (!res.ok) {
        // Rollback dacă API a eșuat
        setSaved(previousState);
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Operația a eșuat.');
      } else {
        // Refresh server data ca să se actualizeze contorul de stele etc.
        router.refresh();
      }
    } catch {
      setSaved(previousState);
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
      title={
        !isAuthenticated
          ? t.loginToSave
          : saved
            ? t.removeFromFav
            : t.saveForLater
      }
      className={`inline-flex items-center gap-2 px-4 py-2 border-2 font-mono font-bold uppercase tracking-wider text-sm transition-colors disabled:opacity-50 ${
        saved
          ? 'border-spark-500 bg-spark-500/20 text-spark-400 hover:bg-spark-500/30'
          : 'border-carbon-700 text-carbon-300 hover:border-spark-500 hover:text-spark-400'
      }`}
    >
      <span>{saved ? '⭐' : '☆'}</span>
      <span>{saved ? t.saved : t.save}</span>
    </button>
  );
}
