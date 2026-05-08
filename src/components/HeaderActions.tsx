// src/components/HeaderActions.tsx
// Componentă client care afișează butoanele de header dinamic în funcție de
// starea sesiunii. Pentru pagini server-rendered, sesiunea e citită de
// SessionProvider (din NextAuth) și hidratată în client.
'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function HeaderActions() {
  const { data: session, status } = useSession();

  // Pre-hidratare: nu știm încă starea sesiunii — afișăm placeholder.
  // Evităm flash-ul "Login/Register" → "Logout" la utilizatori autentificați.
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 bg-carbon-800 animate-pulse" />
      </div>
    );
  }

  if (session?.user) {
    const role = (session.user as any).role as 'USER' | 'AUTHOR' | 'ADMIN';
    const canPost = role === 'AUTHOR' || role === 'ADMIN';
    return (
      <div className="flex items-center gap-3">
        <span className="hidden md:inline text-carbon-400 font-mono text-xs">
          // {session.user.name}
        </span>
        <Link
          href="/saved"
          className="text-carbon-300 hover:text-spark-400 transition-colors font-mono text-sm uppercase tracking-wider"
          title="Articole salvate"
        >
          ⭐ Salvate
        </Link>
        {canPost && (
          <Link href="/dashboard" className="btn-secondary text-sm">
            Dashboard
          </Link>
        )}
        {/* signOut() apelează endpoint-ul NextAuth, șterge cookie-ul HttpOnly
            și ne aduce înapoi pe homepage. callbackUrl previne open-redirect. */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="btn-secondary text-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/auth/login" className="btn-secondary text-sm">
        Autentificare
      </Link>
      <Link href="/auth/register" className="btn-primary text-sm">
        Înregistrare
      </Link>
    </div>
  );
}
