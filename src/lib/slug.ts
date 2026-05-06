// src/lib/slug.ts
// Generare slug URL-friendly din titlu — transliterație din română în ASCII.
// Slug-ul se generează DOAR pe server (în /api/posts/route.ts) — nu acceptăm
// slug-uri venite de la client (apărare împotriva spoofing-ului URL-urilor).

// Mapare diacritice românești -> ASCII (acoperă și varianta veche cu virgulă sub)
const RO_DIACRITICS: Record<string, string> = {
  'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
  'Ă': 'a', 'Â': 'a', 'Î': 'i', 'Ș': 's', 'Ț': 't',
  'ş': 's', 'ţ': 't', 'Ş': 's', 'Ţ': 't', // varianta veche (cedilă)
};

export function slugify(text: string): string {
  let s = text;
  for (const [from, to] of Object.entries(RO_DIACRITICS)) {
    s = s.split(from).join(to);
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // doar litere ASCII, cifre, spații, cratime
    .trim()
    .replace(/\s+/g, '-')          // spațiu(uri) -> cratimă
    .replace(/-+/g, '-')           // colapsează cratime multiple
    .replace(/^-|-$/g, '')         // taie cratimele de la capete
    .slice(0, 100);                // limita 100 caractere
}
