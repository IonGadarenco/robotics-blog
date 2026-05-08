// src/lib/file-url.ts
// Helper pur — fără side-effects, fără import-uri Node.
// Importabil din client components.
//
// Strategie simplificată: în BD avem fie URL absolut (Blob), fie filename
// local (mod dev). Detectăm și returnăm ce trebuie pentru tag-uri src=.

export function fileUrl(stored: string | null | undefined): string {
  if (!stored) return '';

  // URL absolut (Blob în prod sau orice URL extern stocat) → pasăm direct
  if (stored.startsWith('http://') || stored.startsWith('https://')) {
    return stored;
  }

  // Backward compat: prefix /uploads/ deja prezent
  if (stored.startsWith('/uploads/')) {
    return stored;
  }

  // Cazul normal local: filename pur → construim path-ul public
  return `/uploads/${stored}`;
}
