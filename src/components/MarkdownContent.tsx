// src/components/MarkdownContent.tsx
// Render sigur de conținut Markdown — server component.
//
// Securitate (subcap. 2.2.5 din lucrare):
//   - react-markdown NU execută HTML brut by default. Dacă cineva scrie
//     <script>...</script> în Markdown, va apărea ca text literal, nu ca tag.
//   - Folosim STRICT plugin remark-gfm pentru sintaxă extinsă (tabele,
//     strikethrough). NU includem rehype-raw care ar permite HTML brut.
//   - Componentele permise sunt explicit listate jos — orice altceva
//     (ex: <iframe>, <object>) e ignorat de react-markdown.
//   - Toate link-urile externe au rel="noopener noreferrer" — apărare
//     împotriva tabnabbing și leak de Referer.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownContent({ source }: { source: string }) {
  return (
    <div className="markdown-body text-carbon-200 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings: păstrăm font-display + ierarhie vizuală
          h1: ({ children }) => (
            <h1 className="font-display font-bold text-3xl mt-8 mb-4 text-carbon-50">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display font-bold text-2xl mt-8 mb-4 text-carbon-50">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display font-bold text-xl mt-6 mb-3 text-carbon-100">{children}</h3>
          ),

          // Paragrafe + emphasis
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-carbon-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          // Liste
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Cod inline + bloc
          code: (props: any) => {
            const { inline, className, children } = props;
            if (inline) {
              return (
                <code className="bg-carbon-800 text-spark-400 px-1.5 py-0.5 font-mono text-sm">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="bg-carbon-900 border border-carbon-700 p-4 mb-4 overflow-x-auto font-mono text-sm">
              {children}
            </pre>
          ),

          // Quote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-spark-500 pl-4 italic text-carbon-300 my-4">
              {children}
            </blockquote>
          ),

          // Imagini — borduri + max-width pentru a nu sparge layout-ul
          img: ({ src, alt }) => {
            // src trebuie să fie definit; nu randerăm dacă lipsește
            if (!src) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto my-6 border border-carbon-800 mx-auto block"
                loading="lazy"
              />
            );
          },

          // Link-uri — securitate: rel="noopener noreferrer", target="_blank"
          // pentru cele externe. Pentru intern (start cu /), navigare normală.
          //
          // Truc P3.C: dacă link-ul indică un video uploadat (.mp4/.webm),
          // randerăm <video> cu controls în loc de <a>. URL-ul e RESTRICȚIONAT
          // la sursele noastre (local /uploads/ sau Vercel Blob) — nu permitem
          // video-uri din alte domenii pentru a evita tracking/SSRF/XSS.
          a: ({ href, children }) => {
            const isInternalVideo =
              !!href &&
              (
                // Local mode
                /^\/uploads\/[a-f0-9]{64}\.(mp4|webm)$/i.test(href) ||
                // Vercel Blob mode
                /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[a-f0-9]{64}\.(mp4|webm)$/i.test(href)
              );

            if (isInternalVideo) {
              return (
                <video
                  controls
                  preload="metadata"
                  className="max-w-full h-auto my-6 border border-carbon-800 mx-auto block"
                  src={href}
                >
                  Browser-ul tău nu suportă redarea video.
                </video>
              );
            }

            const isExternal = href && /^https?:\/\//i.test(href);
            return (
              <a
                href={href}
                className="text-spark-400 hover:text-spark-300 underline"
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            );
          },

          // Tabele (din remark-gfm)
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border border-carbon-700 text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-carbon-700 bg-carbon-800 px-3 py-2 text-left font-mono">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-carbon-700 px-3 py-2">{children}</td>
          ),

          // Horizontal rule
          hr: () => <hr className="border-carbon-700 my-8" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
