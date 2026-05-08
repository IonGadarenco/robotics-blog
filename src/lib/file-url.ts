// src/lib/file-url.ts
// Helper pur de calcul URL — fără side-effects, fără import-uri Node.
// Poate fi importat și de client components (spre deosebire de storage.ts
// care folosește node:fs și node:path și e doar server-side).

export function fileUrl(storedName: string | null | undefined): string {
  if (!storedName) return '';

  // Backward compat: URL absolut (data veche care a stocat full URL).
  if (storedName.startsWith('http://') || storedName.startsWith('https://')) {
    return storedName;
  }

  const publicUrl = process.env.NEXT_PUBLIC_BLOB_PUBLIC_URL;

  // Backward compat: prefix /uploads/ (data veche dinainte de refactor).
  if (storedName.startsWith('/uploads/')) {
    if (publicUrl) {
      return `${publicUrl}/${storedName.replace('/uploads/', '')}`;
    }
    return storedName;
  }

  // Cazul normal: storedName e doar filename
  if (publicUrl) {
    return `${publicUrl}/${storedName}`;
  }
  return `/uploads/${storedName}`;
}
