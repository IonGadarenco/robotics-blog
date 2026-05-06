// src/app/auth/forgot/page.tsx
// Formular cerere reset parolă. Mesaj final neutru — anti-enumerare.
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'A apărut o eroare.');
        setLoading(false);
        return;
      }

      // Răspuns neutral — afișăm mereu același mesaj indiferent dacă email-ul există.
      setSubmitted(true);
    } catch {
      setError('Eroare de rețea.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen tech-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="inline-block mb-8 text-carbon-400 hover:text-spark-400 font-mono text-sm"
        >
          ← Înapoi la autentificare
        </Link>

        <div className="card">
          <div className="text-circuit-500 font-mono text-xs mb-2">// RESET_PAROLĂ</div>
          <h1 className="font-display font-bold text-3xl mb-6">Ai uitat parola?</h1>

          {submitted ? (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700 p-4 text-green-300 font-mono text-sm space-y-2">
                <div>✓ Cerere procesată.</div>
                <div className="text-green-200/80 text-xs leading-relaxed">
                  Dacă există un cont cu acest email, ți-am trimis un link de
                  resetare valid 1 oră. Verifică inbox-ul (și folder-ul spam).
                </div>
              </div>
              <p className="text-carbon-400 text-xs font-mono leading-relaxed">
                <span className="text-carbon-500">// notă dezvoltare:</span> link-ul e
                afișat în consola serverului <code className="text-spark-400">npm run dev</code>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-carbon-300 text-sm">
                Introdu email-ul cu care te-ai înregistrat. Dacă există un cont
                asociat, primești un link de resetare.
              </p>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  className="input-field"
                  placeholder="ion@example.com"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Se trimite...' : 'Trimite link de resetare'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
