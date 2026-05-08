// src/lib/validation.ts
// Schema-uri de validare pentru input-uri utilizator
// Apărare împotriva: input malformat, XSS, injecții, depășire limite

import { z } from 'zod';

// ========= UTILIZATORI =========

// Parolă puternică: min 12 caractere, majusculă, minusculă, cifră, simbol
// Recomandare NIST SP 800-63B
export const passwordSchema = z
  .string()
  .min(12, 'Parola trebuie să aibă minim 12 caractere')
  .max(128, 'Parola nu poate depăși 128 caractere')
  .regex(/[A-Z]/, 'Parola trebuie să conțină cel puțin o majusculă')
  .regex(/[a-z]/, 'Parola trebuie să conțină cel puțin o minusculă')
  .regex(/[0-9]/, 'Parola trebuie să conțină cel puțin o cifră')
  .regex(/[^A-Za-z0-9]/, 'Parola trebuie să conțină cel puțin un simbol');

export const emailSchema = z
  .string()
  .email('Email invalid')
  .max(254, 'Email prea lung') // RFC 5321
  .toLowerCase();

export const nameSchema = z
  .string()
  .min(2, 'Numele trebuie să aibă cel puțin 2 caractere')
  .max(100, 'Numele nu poate depăși 100 caractere')
  .regex(/^[a-zA-ZăâîșțĂÂÎȘȚ\s\-']+$/, 'Numele conține caractere nepermise');

export const registerSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
});

// ========= 2FA (TOTP) =========

// Cod TOTP — exact 6 cifre (RFC 6238 default).
export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'Codul trebuie să aibă 6 cifre');

// Activare 2FA — primește secret-ul (generat la /setup) + codul de verificare
// din aplicația de autentificare. Verificăm că secret-ul a fost generat de noi
// (format base32 standard speakeasy ~ 32 caractere alfanumerice mari).
export const enable2FASchema = z.object({
  secret: z.string().regex(/^[A-Z2-7]{16,64}$/, 'Secret invalid'),
  code: totpCodeSchema,
});

// Dezactivare 2FA — cere parola pentru re-verificare (defense in depth:
// chiar dacă atacatorul fură sesiunea, nu poate dezactiva 2FA fără parolă).
export const disable2FASchema = z.object({
  password: z.string().min(1, 'Parola e obligatorie').max(128),
});

// ========= RESET PAROLĂ =========

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  // Token-ul are 64 caractere hex (32 bytes). Format strict înainte de a
  // atinge BD — apărare împotriva inputurilor uriașe sau cu format ostil.
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Token invalid'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parola este obligatorie').max(128),
  // NextAuth serializează totul prin String(), deci undefined devine "undefined"
  // și null poate veni ca "" sau "null". Preprocess: normalizăm la undefined real
  // ca .optional() să funcționeze. Apărare în adâncime — chiar dacă reparăm și
  // în client, validarea acceptă inputul real venit de la NextAuth.
  totpCode: z.preprocess(
    (val) => {
      if (val == null) return undefined;
      if (typeof val !== 'string') return val;
      const trimmed = val.trim();
      if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return undefined;
      return trimmed;
    },
    z.string().regex(/^\d{6}$/, 'Codul 2FA trebuie să aibă 6 cifre').optional()
  ),
});

// ========= ARTICOLE =========

export const postCreateSchema = z.object({
  titleRo: z.string().min(5).max(200),
  titleEn: z.string().min(5).max(200),
  contentRo: z.string().min(50).max(50000),
  contentEn: z.string().min(50).max(50000),
  excerptRo: z.string().min(20).max(500),
  excerptEn: z.string().min(20).max(500),
  category: z.enum(['ROBOTICS', 'THREE_D_PRINT', 'WEB_DEV', 'TUTORIAL', 'PROJECT']),
  published: z.boolean().default(false),
});

// Pentru update: toate câmpurile sunt opționale (semantic PATCH).
// Validăm la fel de strict ca la creare când câmpul e prezent.
export const postUpdateSchema = z.object({
  titleRo: z.string().min(5).max(200).optional(),
  titleEn: z.string().min(5).max(200).optional(),
  contentRo: z.string().min(50).max(50000).optional(),
  contentEn: z.string().min(50).max(50000).optional(),
  excerptRo: z.string().min(20).max(500).optional(),
  excerptEn: z.string().min(20).max(500).optional(),
  category: z.enum(['ROBOTICS', 'THREE_D_PRINT', 'WEB_DEV', 'TUTORIAL', 'PROJECT']).optional(),
  published: z.boolean().optional(),
});

// ========= COMENTARII =========

export const commentSchema = z.object({
  postId: z.string().cuid(),
  content: z
    .string()
    .min(2, 'Comentariul este prea scurt')
    .max(2000, 'Comentariul nu poate depăși 2000 caractere'),
  parentId: z.string().cuid().optional(),
});

// ========= UPLOAD FIȘIERE =========

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/zip',
  'model/stl',
  'application/octet-stream', // pentru .stl uneori
];

export function validateUpload(file: File, maxSizeMB = 10) {
  const errors: string[] = [];

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push(`Tip fișier neacceptat: ${file.type}`);
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    errors.push(`Fișier prea mare (max ${maxSizeMB}MB)`);
  }

  // Apărare împotriva path-traversal (../../../etc/passwd)
  if (/[\\\/\.]{2,}/.test(file.name) || file.name.startsWith('.')) {
    errors.push('Nume fișier suspect');
  }

  return { valid: errors.length === 0, errors };
}

// ========= TYPE EXPORTS =========

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
