// src/app/profile/2fa/page.tsx
// Pagina de gestiune 2FA — server component pentru fetch starea curentă,
// apoi delegă la client component pentru interacțiune.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HeaderActions from '@/components/HeaderActions';
import TwoFactorManager from './TwoFactorManager';

export default async function TwoFactorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) redirect('/auth/login');

  return (
    <main className="min-h-screen tech-grid">
      <header className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-mono font-bold text-xl tracking-tight">
            Robo<span className="text-spark-500">Lab</span>
            <span className="text-carbon-500"> / </span>
            <span className="text-carbon-300">Profil</span>
          </Link>
          <HeaderActions />
        </nav>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-block mb-6 text-carbon-400 hover:text-spark-400 font-mono text-sm"
        >
          ← Înapoi
        </Link>
        <div className="text-circuit-500 font-mono text-sm mb-2">// AUTENTIFICARE_2FA</div>
        <h1 className="font-display font-bold text-4xl mb-4">
          Autentificare în doi pași
        </h1>
        <p className="text-carbon-400 mb-10 leading-relaxed">
          Activează un al doilea factor — un cod de 6 cifre din aplicația ta de
          autentificare. Chiar dacă cineva îți află parola, nu va putea intra
          fără telefonul tău.
        </p>

        <TwoFactorManager
          email={user.email}
          enabled={user.twoFactorEnabled}
        />
      </section>
    </main>
  );
}
