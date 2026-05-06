// src/app/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Tip pentru erorile per-câmp returnate de Zod prin endpoint-ul /api/auth/register.
type FieldErrors = Partial<Record<'name' | 'email' | 'password', string[]>>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Erorile per-câmp vin din Zod (.flatten().fieldErrors).
        // Le afișăm sub fiecare input pentru ca user-ul să știe ce să corecteze.
        if (data.details && typeof data.details === 'object') {
          setFieldErrors(data.details as FieldErrors);
        }
        setError(data.error || 'A apărut o eroare');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // 5 secunde — timp să citești mesajul despre anti-enumerare.
      setTimeout(() => router.push('/auth/login'), 5000);
    } catch (err) {
      setError('Eroare de rețea. Verifică conexiunea.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen tech-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-block mb-8 text-carbon-400 hover:text-spark-400 font-mono text-sm">
          ← Înapoi
        </Link>

        <div className="card">
          <div className="text-circuit-500 font-mono text-xs mb-2">// CREARE_CONT</div>
          <h1 className="font-display font-bold text-3xl mb-6">Înregistrare</h1>

          {success ? (
            // Mesaj neutru — nu trădează dacă email-ul era nou sau exista.
            // Vezi /api/auth/register: răspunsul HTTP e identic în ambele cazuri
            // (apărare împotriva enumerării utilizatorilor — subcap. 2.2.X).
            <div className="bg-green-900/20 border border-green-700 p-4 text-green-300 font-mono text-sm space-y-2">
              <div>✓ Cererea a fost procesată.</div>
              <div className="text-green-200/80 text-xs leading-relaxed">
                Dacă email-ul era nou, contul tău e gata de utilizare. Dacă a mai
                fost folosit, contul existent rămâne intact — folosește parola
                anterioară. Te redirectez la autentificare...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
                  Nume complet
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  className="input-field"
                  placeholder="Ion Gadarenco"
                />
                {fieldErrors.name?.map((msg) => (
                  <p key={msg} className="text-red-400 text-xs font-mono mt-2">⚠ {msg}</p>
                ))}
              </div>

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
                {fieldErrors.email?.map((msg) => (
                  <p key={msg} className="text-red-400 text-xs font-mono mt-2">⚠ {msg}</p>
                ))}
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
                  minLength={12}
                  className="input-field"
                  placeholder="Minim 12 caractere"
                />
                <p className="text-xs text-carbon-500 mt-2 font-mono">
                  Min. 12 caractere, majusculă, minusculă, cifră, simbol
                </p>
                {fieldErrors.password?.map((msg) => (
                  <p key={msg} className="text-red-400 text-xs font-mono mt-1">⚠ {msg}</p>
                ))}
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? 'Se creează...' : 'Creează cont'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-carbon-700 text-sm text-carbon-400">
            Ai deja cont?{' '}
            <Link href="/auth/login" className="text-spark-400 hover:text-spark-300 font-bold">
              Autentifică-te
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
