// src/lib/auth.ts
// Configurare NextAuth.js cu Credentials provider + suport 2FA TOTP

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import speakeasy from 'speakeasy';
import { prisma } from './prisma';
import {
  verifyPassword,
  logAuthEvent,
  recordFailedLogin,
  resetFailedAttempts,
  isUserLocked,
  rateLimit,
  getClientIp,
} from './security';
import { loginSchema } from './validation';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24h
    updateAge: 60 * 60,    // refresh la fiecare oră de activitate
  },
  jwt: {
    maxAge: 60 * 60 * 24,
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Parola', type: 'password' },
        totpCode: { label: 'Cod 2FA', type: 'text' },
      },
      async authorize(credentials, req) {
        // 1. Validare input cu Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, totpCode } = parsed.data;

        // 2. Rate limiting per IP
        const ip = req?.headers ? getClientIp(new Headers(req.headers as Record<string, string>)) : 'unknown';
        const rl = rateLimit(`login:${ip}`, 10, 60_000); // 10 tentative/minut
        if (!rl.allowed) {
          await logAuthEvent({ email, event: 'LOGIN_FAILED', ipAddress: ip });
          throw new Error('Prea multe tentative. Reîncearcă peste un minut.');
        }

        // 3. Caută utilizatorul
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await logAuthEvent({ email, event: 'LOGIN_FAILED', ipAddress: ip });
          // Returnăm același mesaj pentru utilizator inexistent vs parolă greșită
          // (apărare împotriva enumerării utilizatorilor)
          return null;
        }

        // 4. Verifică dacă contul e blocat
        if (isUserLocked(user)) {
          await logAuthEvent({ userId: user.id, email, event: 'LOGIN_LOCKED', ipAddress: ip });
          throw new Error('Cont blocat temporar. Reîncearcă mai târziu.');
        }

        // 5. Verifică parola (timing-safe via bcrypt)
        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) {
          const { locked } = await recordFailedLogin(user.id);
          await logAuthEvent({
            userId: user.id,
            email,
            event: locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
            ipAddress: ip,
          });
          return null;
        }

        // 6. Verifică 2FA dacă e activat
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!totpCode) {
            // Semnal pentru frontend că e nevoie de cod 2FA
            throw new Error('2FA_REQUIRED');
          }
          const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: totpCode,
            window: 1, // toleranță ±30s
          });
          if (!valid) {
            await logAuthEvent({ userId: user.id, email, event: 'LOGIN_FAILED', ipAddress: ip });
            return null;
          }
        }

        // 7. Login reușit
        await resetFailedAttempts(user.id);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginIp: ip },
        });
        await logAuthEvent({ userId: user.id, email, event: 'LOGIN_SUCCESS', ipAddress: ip });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
