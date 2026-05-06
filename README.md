# Blog de Robotică — Platformă educațională

Aplicație web pentru publicarea proiectelor de robotică, imprimare 3D și dezvoltare web,
cu accent pe **securitatea informației în rețele computerizate**.

> Proiect realizat ca studiu de caz pentru teza de licență — ULIM, Facultatea Informatică,
> Inginerie și Design, specialitatea 0613.5 Informatică aplicată.

---

## Tehnologii folosite

- **Next.js 14** (App Router) — framework full-stack
- **React 18** + **TypeScript**
- **PostgreSQL** (Neon — cloud) + **Prisma ORM**
- **NextAuth.js** — autentificare cu sesiuni securizate
- **bcrypt** — hashing parole
- **Zod** — validare date
- **Tailwind CSS** — styling
- **next-intl** — suport bilingv RO/EN
- **speakeasy** — autentificare în doi pași (2FA TOTP)

---

## Configurare pas cu pas

### 1. Cerințe preliminare

- Node.js 20+ (verifică cu `node --version`)
- Cont Neon pentru PostgreSQL: <https://neon.tech>
- Cont GitHub
- Cont Vercel: <https://vercel.com>

### 2. Instalare

```bash
# Despachetează arhiva, apoi:
cd robotics-blog
npm install
```

### 3. Configurare bază de date Neon

1. Mergi pe <https://console.neon.tech> și creează un proiect nou
2. Copiază connection string-ul (începe cu `postgresql://...`)
3. Copiază `.env.example` în `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Editează `.env.local` și pune URL-ul de la Neon în `DATABASE_URL`
5. Generează un secret pentru NextAuth:
   ```bash
   # Pe Linux/Mac:
   openssl rand -base64 32
   # Pe Windows PowerShell:
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```
   Pune rezultatul în `NEXTAUTH_SECRET`.

### 4. Inițializare bază de date

```bash
# Crează tabelele în PostgreSQL conform schema.prisma
npm run db:push

# Generează clientul Prisma TypeScript
npm run db:generate

# (Opțional) Populează cu date de test
npm run db:seed
```

### 5. Pornire în mod dezvoltare

```bash
npm run dev
```

Aplicația va fi disponibilă la <http://localhost:3000>.

---

## Componente de securitate implementate

Acest proiect implementează componente practice care ilustrează capitolele lucrării de licență:

| # | Componenta | Tehnologie | Capitol în lucrare |
|---|------------|------------|---------------------|
| 1 | Hashing parole | bcrypt cu salt | 2.2.1 Stocarea sigură a credențialelor |
| 2 | Sesiuni securizate | NextAuth + JWT | 2.2.2 Gestionarea sesiunilor |
| 3 | Autentificare 2FA | TOTP (RFC 6238) | 2.2.3 Autentificarea în doi pași |
| 4 | Protecție SQL Injection | Prisma ORM (queries parametrizate) | 2.2.4 Apărarea împotriva injecțiilor |
| 5 | Protecție XSS | Zod + DOMPurify | 2.2.5 Sanitizarea conținutului utilizator |
| 6 | Protecție CSRF | Token CSRF NextAuth | 2.2.6 Apărarea împotriva CSRF |
| 7 | Rate limiting | Middleware Next.js | 2.2.7 Limitarea ratei de cereri |
| 8 | Headers de securitate | next.config.js (CSP, HSTS) | 2.2.8 Headers HTTP de securitate |
| 9 | HTTPS/TLS | Vercel + Neon | 2.2.9 Criptare în tranzit |
| 10 | Audit logging | Tabel AuthLog | 2.2.10 Jurnalizarea evenimentelor |
| 11 | Validare upload | Verificare MIME + dimensiune | 2.2.11 Securitatea fișierelor încărcate |
| 12 | Blocare cont | Numărător încercări eșuate | 2.2.12 Apărarea împotriva brute-force |

---

## Deploy pe Vercel

1. Push proiectul pe GitHub
2. Conectează repository-ul la Vercel
3. Adaugă variabilele de mediu (din `.env.local`) în Vercel
4. Schimbă `NEXTAUTH_URL` la URL-ul Vercel (ex: `https://robotics-blog.vercel.app`)
5. Deploy automat

---

## Structura proiectului

```
robotics-blog/
├── prisma/
│   ├── schema.prisma         # Schema bazei de date
│   └── seed.ts               # Date inițiale
├── public/                   # Resurse statice
├── src/
│   ├── app/                  # Rute Next.js (App Router)
│   │   ├── [locale]/         # Suport bilingv RO/EN
│   │   ├── api/              # API endpoints
│   │   └── layout.tsx
│   ├── components/           # Componente React reutilizabile
│   ├── lib/                  # Utilități (auth, db, security)
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── validation.ts
│   │   └── security.ts
│   └── messages/             # Traduceri RO/EN
├── docs/                     # Documentație tehnică
├── .env.example
├── next.config.js
├── package.json
└── tailwind.config.ts
```

---

## Autor

**Ion Gadarenco**
Specialitatea 0613.5 Informatică aplicată
Universitatea Liberă Internațională din Moldova
2026
