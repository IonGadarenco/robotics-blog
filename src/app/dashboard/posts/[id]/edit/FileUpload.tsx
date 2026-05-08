// src/app/dashboard/posts/[id]/edit/FileUpload.tsx
// Manager fișiere atașate — listă + upload + delete.
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fileUrl } from '@/lib/file-url';

interface AttachedFile {
  id: string;
  filename: string;
  storedAs: string;
  mimeType: string;
  size: number;
}

// Format dimensiune în KB/MB pentru afișare.
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Iconiță simplă în funcție de tip.
function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/zip') return '📦';
  if (mimeType === 'model/stl' || mimeType === 'application/octet-stream') return '🔩';
  return '📎';
}

export default function FileUpload({
  postId,
  initialFiles,
}: {
  postId: string;
  initialFiles: AttachedFile[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[] | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setDetails(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`/api/posts/${postId}/files`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload eșuat');
        if (Array.isArray(data.details)) setDetails(data.details);
        if (inputRef.current) inputRef.current.value = '';
        setUploading(false);
        return;
      }

      // Adaugă fișierul nou în listă (server returnează metadata)
      setFiles((prev) => [
        ...prev,
        {
          id: data.file.id,
          filename: data.file.filename,
          storedAs: data.file.storedAs,
          mimeType: data.file.mimeType,
          size: data.file.size,
        },
      ]);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError('Eroare de rețea.');
    } finally {
      setUploading(false);
    }
  }

  // Generează referința Markdown potrivită pentru tipul fișierului.
  // Imagini -> ![alt](url) (apar inline). Video -> [video](url) (devine
  // <video controls> la randare). Restul -> [filename](url) (link de download).
  function buildMarkdownRef(f: AttachedFile): string {
    const url = fileUrl(f.storedAs);
    if (f.mimeType.startsWith('image/')) {
      return `![${f.filename}](${url})`;
    }
    if (f.mimeType.startsWith('video/')) {
      return `[${f.filename}](${url})`;
    }
    return `[${f.filename}](${url})`;
  }

  async function copyMarkdown(f: AttachedFile) {
    const md = buildMarkdownRef(f);
    try {
      await navigator.clipboard.writeText(md);
      // Feedback simplu prin alert nativ — UX minim dar funcțional.
      // Pentru un toast frumos am adăuga ceva ca react-hot-toast în viitor.
      const msg = f.mimeType.startsWith('image/')
        ? 'Markdown copiat. Lipește în conținut: ![nume](url)'
        : 'Link copiat. Lipește în conținut: [nume](url)';
      // eslint-disable-next-line no-alert
      alert(msg);
    } catch {
      // eslint-disable-next-line no-alert
      alert('Nu am putut copia. Selectează manual din câmpul de mai jos.');
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!window.confirm(`Ștergi atașamentul "${filename}"?`)) return;
    try {
      const res = await fetch(`/api/posts/${postId}/files/${fileId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Ștergere eșuată');
      }
    } catch {
      alert('Eroare de rețea');
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-circuit-500 font-mono text-xs mb-1">// ATAȘAMENTE</div>
          <h2 className="font-display font-bold text-xl">Fișiere atașate</h2>
        </div>
        <span className="font-mono text-xs text-carbon-500">{files.length}/10</span>
      </div>

      <p className="text-carbon-400 text-xs font-mono leading-relaxed">
        Tipuri permise: JPG, PNG, WebP, PDF, ZIP, STL — max 10 MB.
        Video MP4/WebM — max 50 MB.
        <br />
        <span className="text-circuit-400">Tip:</span> apasă <span className="text-spark-400">📋</span> pentru a
        copia referința Markdown și a o lipi în câmpurile <span className="text-spark-400">Conținut</span>.
        Imaginile și video-urile apar inline; restul ca link de download.
      </p>

      {/* Listă fișiere existente */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 p-3 bg-carbon-900 border border-carbon-700">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl flex-shrink-0">{fileIcon(f.mimeType)}</span>
                <a
                  href={fileUrl(f.storedAs)}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-sm text-spark-400 hover:text-spark-300 truncate"
                  title={f.filename}
                >
                  {f.filename}
                </a>
              </div>
              <span className="text-xs font-mono text-carbon-500 flex-shrink-0">
                {formatSize(f.size)}
              </span>
              <button
                type="button"
                onClick={() => copyMarkdown(f)}
                className="text-circuit-400 hover:text-circuit-300 font-mono text-xs flex-shrink-0"
                title="Copiază referința Markdown pentru a o lipi în conținut"
              >
                📋
              </button>
              <button
                type="button"
                onClick={() => handleDelete(f.id, f.filename)}
                className="text-red-400 hover:text-red-300 font-mono text-xs flex-shrink-0"
                title="Șterge atașament"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Formular upload — limit fișier la nivel de input via accept */}
      {files.length < 10 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            accept=".jpg,.jpeg,.png,.webp,.pdf,.zip,.stl,.mp4,.webm,image/jpeg,image/png,image/webp,application/pdf,application/zip,model/stl,video/mp4,video/webm"
            className="block w-full text-sm font-mono text-carbon-300
              file:mr-4 file:py-2 file:px-4 file:border-2 file:border-carbon-700
              file:bg-transparent file:text-carbon-200 file:font-mono file:font-bold
              file:uppercase file:text-xs file:tracking-wider file:cursor-pointer
              hover:file:border-spark-500 hover:file:text-spark-400
              disabled:opacity-50"
          />
          {uploading && (
            <p className="mt-2 text-spark-400 font-mono text-xs">
              ⏳ Se încarcă fișierul...
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 p-3 text-red-300 font-mono text-sm">
          ⚠ {error}
          {details && (
            <ul className="mt-2 ml-4 list-disc text-xs">
              {details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
