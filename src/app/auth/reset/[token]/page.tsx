// src/app/auth/reset/[token]/page.tsx
// Formular setare parolă nouă cu un token din URL.
//
// Token-ul e validat real DOAR pe server (POST /api/auth/reset-password).
// Validăm formatul minim aici doar pentru a respinge URL-uri evident stricate
// fără a face apel API.
'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FieldErrors = Partial<Record<'token' | 'password', string[]>>;

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const router = useRouter();
  // Next 14 poate trece params direct sau ca Promise (forward-compat).
  const resolved = (params as any).then ? use(params as Promise<{ token: string }>) : (params as { token: string });
  const token = resolved.token;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  // Validare format token în client — dacă e clar invalid, afișăm imediat
  // mesaj fără a contacta serverul.
  const tokenLooksValid = /^[a-f0-9]{64}$/.test(token);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    const passwordConfirm = fd.get('passwordConfirm') as string;

    if (password !== passwordConfirm) {
      setError('Cele două parole nu coincid.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details as FieldErrors);
        }
        setError(data.error || 'A apărut o eroare.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 3000);
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
          <div className="text-circuit-500 font-mono text-xs mb-2">// PAROLĂ_NOUĂ</div>
          <h1 className="font-display font-bold text-3xl mb-6">Setează o parolă nouă</h1>

          {!tokenLooksValid ? (
            <div className="bg-red-900/20 border border-red-700 p-4 text-red-300 font-mono text-sm">
              ⚠ Link invalid. <Link href="/auth/forgot" className="underline">Cere unul nou</Link>.
            </div>
          ) : success ? (
            <div className="bg-green-900/20 border border-green-700 p-4 text-green-300 font-mono text-sm">
              ✓ Parolă actualizată. Te redirectez la autentificare...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-carbon-300 text-sm">
                Alege o parolă puternică. Toate sesiunile active vor fi închise.
              </p>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300"
                >
                  Parolă nouă
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  autoFocus
                  className="input-field"
                  placeholder="Minim 12 caractere"
                />
                <p className="text-xs text-carbon-500 mt-2 font-mono">
                  Min. 12 caractere, majusculă, minusculă, cifră, simbol
                </p>
                {fieldErrors.password?.map((m) => (
                  <p key={m} className="text-red-400 text-xs font-mono mt-1">⚠ {m}</p>
                ))}
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300"
                >
                  Confirmă parola
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  minLength={12}
                  className="input-field"
                  placeholder="Reintrodu parola"
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
                {loading ? 'Se actualizează...' : 'Salvează parola nouă'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
