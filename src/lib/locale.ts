// src/lib/locale.ts
// Helper pentru detectarea limbii curente din cookie (server-side).
// Default: română. Cookie name "locale", valori "ro" sau "en".

import { cookies } from 'next/headers';

export type Locale = 'ro' | 'en';

// Citește cookie-ul "locale" și returnează limba validă.
// Orice altă valoare → fallback la "ro".
export function getLocale(): Locale {
  const value = cookies().get('locale')?.value;
  return value === 'en' ? 'en' : 'ro';
}

// Helper pentru a alege câmpul potrivit dintr-un obiect bilingv
// (ex: { titleRo, titleEn } -> titleRo sau titleEn în funcție de locale).
export function pickLocalized<T extends string>(
  obj: { [K in `${T}Ro` | `${T}En`]: string },
  base: T,
  locale: Locale
): string {
  const key = `${base}${locale === 'en' ? 'En' : 'Ro'}` as keyof typeof obj;
  return obj[key];
}
