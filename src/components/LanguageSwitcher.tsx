// src/components/LanguageSwitcher.tsx
// Switch RO/EN pentru limbă conținut articole.
// Setează cookie 'locale' + face refresh ca server components să citească nou-a valoare.
'use client';

import { useRouter } from 'next/navigation';

type Locale = 'ro' | 'en';

export default function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();

  function setLocale(locale: Locale) {
    if (locale === current) return;
    // Cookie pe 1 an. SameSite=Lax = trimis cu navigări normale,
    // blocat în request-uri cross-site (apărare CSRF de bază).
    // Path=/ ca să fie disponibil pe toată aplicația.
    document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <button
        type="button"
        onClick={() => setLocale('ro')}
        className={`px-2 py-1 transition-colors ${
          current === 'ro' ? 'text-spark-400 font-bold' : 'text-carbon-500 hover:text-carbon-300'
        }`}
        aria-pressed={current === 'ro'}
      >
        RO
      </button>
      <span className="text-carbon-700">|</span>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`px-2 py-1 transition-colors ${
          current === 'en' ? 'text-spark-400 font-bold' : 'text-carbon-500 hover:text-carbon-300'
        }`}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
    </div>
  );
}
