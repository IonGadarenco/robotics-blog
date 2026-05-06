// src/app/auth/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [need2FA, setNeed2FA] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const totpCode = formData.get('totpCode') as string | null;

    setCredentials({ email, password });

    try {
      // Construim payload-ul fără totpCode dacă nu există —
      // NextAuth face String(undefined) și ar trimite literal "undefined".
      const credentialsPayload: Record<string, string> = { email, password };
      if (totpCode) credentialsPayload.totpCode = totpCode;

      const result = await signIn('credentials', {
        ...credentialsPayload,
        redirect: false,
      });

      if (result?.error === '2FA_REQUIRED') {
        setNeed2FA(true);
        setError(null);
      } else if (result?.error) {
        if (result.error.includes('blocat')) {
          setError(result.error);
        } else {
          setError('Email sau parolă incorecte.');
        }
      } else if (result?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Eroare de rețea.');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen tech-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block mb-8 text-carbon-400 hover:text-spark-400 font-mono text-sm">
          ← Înapoi
        </Link>

        <div className="card">
          <div className="text-circuit-500 font-mono text-xs mb-2">
            {need2FA ? '// AUTENTIFICARE_2FA' : '// AUTENTIFICARE'}
          </div>
          <h1 className="font-display font-bold text-3xl mb-6">
            {need2FA ? 'Cod 2FA' : 'Autentificare'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!need2FA ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="input-field"
                    placeholder="ion@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                    Parolă
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="input-field"
                    placeholder="••••••••••••"
                  />
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="email" value={credentials.email} />
                <input type="hidden" name="password" value={credentials.password} />
                <p className="text-carbon-300 text-sm mb-4">
                  Introdu codul de 6 cifre din aplicația ta de autentificare
                  (Google Authenticator, Authy, etc.)
                </p>
                <div>
                  <label htmlFor="totpCode" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                    Cod 2FA
                  </label>
                  <input
                    id="totpCode"
                    name="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                    className="input-field text-2xl text-center tracking-widest"
                    placeholder="000000"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Se verifică...' : need2FA ? 'Verifică codul' : 'Autentificare'}
            </button>
          </form>

          {!need2FA && (
            <div className="mt-6 pt-6 border-t border-carbon-700 text-sm text-carbon-400 space-y-2">
              <div>
                <Link href="/auth/forgot" className="text-spark-400 hover:text-spark-300 font-mono text-xs">
                  Ai uitat parola?
                </Link>
              </div>
              <div>
                N-ai cont încă?{' '}
                <Link href="/auth/register" className="text-spark-400 hover:text-spark-300 font-bold">
                  Înregistrează-te
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
