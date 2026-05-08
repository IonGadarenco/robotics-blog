// src/app/profile/2fa/TwoFactorManager.tsx
// Gestiune 2FA în client — 3 stări vizuale:
//   - DISABLED: buton "Activează 2FA" → /api/auth/2fa/setup → trecere la SETUP
//   - SETUP: afișează QR + secret, formular pentru codul de verificare → /api/auth/2fa/enable
//   - ENABLED: status + buton "Dezactivează" cu reverificare parolă
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SetupData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export default function TwoFactorManager({
  email,
  enabled: initialEnabled,
}: {
  email: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<SetupData | null>(null); // null = nu suntem în flow setup
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisable, setShowDisable] = useState(false);

  // 1. Inițiere setup — generează secret + QR
  async function startSetup() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la generarea secretului');
      setSetup(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // 2. Confirmare cod + activare
  async function confirmEnable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!setup) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la activare');
      // Succes — trecem la starea ENABLED
      setEnabled(true);
      setSetup(null);
      setCode('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // 3. Dezactivare cu parolă
  async function confirmDisable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare la dezactivare');
      setEnabled(false);
      setShowDisable(false);
      setPassword('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // ====== UI ======

  // Starea ENABLED (2FA e activ)
  if (enabled && !showDisable) {
    return (
      <div className="space-y-6">
        <div className="card border-green-700">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🔐</div>
            <div>
              <div className="font-mono text-xs text-green-400 mb-1">// STATUS</div>
              <h2 className="font-display font-bold text-xl mb-2 text-green-300">
                2FA activ
              </h2>
              <p className="text-carbon-300 text-sm mb-4">
                Contul <span className="font-mono text-spark-400">{email}</span> e
                protejat cu autentificare în doi pași. La fiecare login, vei avea
                nevoie de codul de 6 cifre din aplicația ta de autentificare.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDisable(true)}
          className="px-4 py-2 border-2 border-red-800 text-red-400 font-mono font-bold uppercase tracking-wider text-sm hover:bg-red-900/30 transition-colors"
        >
          Dezactivează 2FA
        </button>
      </div>
    );
  }

  // Starea DISABLE (formular dezactivare cu parolă)
  if (enabled && showDisable) {
    return (
      <div className="card border-red-700">
        <div className="font-mono text-xs text-red-400 mb-1">// CONFIRMARE_DEZACTIVARE</div>
        <h2 className="font-display font-bold text-xl mb-4 text-red-300">
          Dezactivează 2FA
        </h2>
        <p className="text-carbon-300 text-sm mb-6">
          Confirmă cu parola contului. După dezactivare, contul tău va fi protejat
          doar de parolă — recomandăm să o reactivezi cât mai curând.
        </p>
        <form onSubmit={confirmDisable} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-carbon-300">
              Parola contului
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••••••"
              autoFocus
            />
          </div>
          {error && (
            <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
              ⚠ {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border-2 border-red-800 text-red-400 font-mono font-bold uppercase tracking-wider text-sm hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              {loading ? 'Se dezactivează...' : 'Confirm dezactivarea'}
            </button>
            <button
              type="button"
              onClick={() => { setShowDisable(false); setPassword(''); setError(null); }}
              className="btn-secondary"
            >
              Renunță
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Starea SETUP (după ce a apăsat "Activează" — afișează QR și formular cod)
  if (setup) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="font-mono text-xs text-circuit-500 mb-1">// PAS_1_DIN_2</div>
          <h2 className="font-display font-bold text-xl mb-4">Scanează QR code-ul</h2>
          <p className="text-carbon-300 text-sm mb-6">
            Deschide aplicația ta de autentificare (Google Authenticator, Authy,
            Microsoft Authenticator etc.) și scanează codul de mai jos.
          </p>
          <div className="bg-white inline-block p-4 mb-6">
            {/* QR-ul vine ca data URL */}
            <img src={setup.qrCode} alt="QR code 2FA" width={256} height={256} />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-carbon-400 hover:text-spark-400 font-mono text-xs">
              Nu poți scana? Introdu manual secret-ul
            </summary>
            <div className="mt-3 p-3 bg-carbon-900 border border-carbon-700 font-mono text-xs break-all text-spark-400">
              {setup.secret}
            </div>
          </details>
        </div>

        <form onSubmit={confirmEnable} className="card">
          <div className="font-mono text-xs text-circuit-500 mb-1">// PAS_2_DIN_2</div>
          <h2 className="font-display font-bold text-xl mb-4">
            Verifică codul
          </h2>
          <p className="text-carbon-300 text-sm mb-4">
            Introdu codul de 6 cifre afișat în aplicație. Codurile se schimbă la
            fiecare 30 de secunde.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className="input-field text-2xl text-center tracking-widest font-mono mb-4"
          />
          {error && (
            <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm mb-4">
              ⚠ {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Se verifică...' : 'Activează 2FA'}
            </button>
            <button
              type="button"
              onClick={() => { setSetup(null); setCode(''); setError(null); }}
              className="btn-secondary"
            >
              Renunță
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Starea inițială (DISABLED) — buton "Activează"
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="font-mono text-xs text-carbon-500 mb-1">// STATUS</div>
        <h2 className="font-display font-bold text-xl mb-2 text-carbon-300">
          2FA inactiv
        </h2>
        <p className="text-carbon-400 text-sm mb-6">
          Contul tău e protejat doar de parolă. Activează 2FA pentru un strat
          suplimentar de securitate (recomandat).
        </p>
        {error && (
          <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm mb-4">
            ⚠ {error}
          </div>
        )}
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Se generează...' : 'Activează 2FA'}
        </button>
      </div>
    </div>
  );
}
