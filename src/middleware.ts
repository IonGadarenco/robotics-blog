// src/middleware.ts
// Middleware Next.js — rute protejate cu NextAuth

import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;

      // Rute admin doar pentru ADMIN
      if (path.startsWith('/admin')) {
        return token?.role === 'ADMIN';
      }

      // Rute autor pentru AUTHOR și ADMIN
      if (path.startsWith('/dashboard')) {
        return token?.role === 'AUTHOR' || token?.role === 'ADMIN';
      }

      // Rute autentificate
      return !!token;
    },
  },
});

// Configurare: care rute trec prin middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/saved/:path*',
  ],
};
