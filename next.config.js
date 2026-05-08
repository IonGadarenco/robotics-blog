/** @type {import('next').NextConfig} */

// Headers HTTP de securitate - apărare împotriva atacurilor comune
// Documentat pentru capitolul 2.2.8 al lucrării
const securityHeaders = [
  // Content Security Policy - apărare împotriva XSS
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Google Fonts CSS (style-src) și fișiere font (font-src)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // img-src: include https: pentru Vercel Blob și alte CDN-uri
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // media-src: pentru <video>/<audio> servite din Vercel Blob (HTTPS)
      "media-src 'self' https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Apărare suplimentară: anti-plugin (Flash/Java rămase)
      "object-src 'none'",
    ].join('; ')
  },
  // HSTS - forțează HTTPS pentru 2 ani
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  // Anti-clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // Anti-MIME-sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Politică Referer - protejează informațiile sensibile
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions Policy - dezactivează API-uri sensibile neutilizate
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()'
  },
  // XSS Protection (legacy, pentru browsere vechi)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
];

const nextConfig = {
  reactStrictMode: true,
  
  // Aplicăm headers de securitate pe toate rutele
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Configurare imagini
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  
  // Internaționalizare (RO/EN)
  // Folosim next-intl, configurat separat
};

module.exports = nextConfig;
