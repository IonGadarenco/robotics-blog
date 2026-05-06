# GHID PAS CU PAS - Pornire rapidă

Acest ghid te ghidează de la zero la o aplicație funcțională în ~30 de minute.

## Pasul 1: Despachetează arhiva

Despachetează arhiva `robotics-blog.zip` într-un director local. Recomand:
- Windows: `C:\Users\TuNume\Documents\Licenta\robotics-blog`
- Mac/Linux: `~/Documents/Licenta/robotics-blog`

## Pasul 2: Instalează dependențele

Deschide terminal în directorul proiectului (în VS Code: Terminal → New Terminal):

```bash
npm install
```

Așteaptă 1-3 minute. La final ar trebui să vezi `added XXX packages`.

## Pasul 3: Configurează Neon PostgreSQL (gratis)

1. Mergi pe https://neon.tech și înregistrează-te (poți folosi GitHub)
2. Creează un proiect nou:
   - Project name: `robotics-blog`
   - Region: alege-l pe cel mai apropiat (Frankfurt pentru Moldova)
   - Database name: `roboticsdb`
3. După creare, vei vedea connection string-ul. Arată cam așa:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/roboticsdb?sslmode=require
   ```
4. Copiază-l, vei avea nevoie de el la pasul următor.

## Pasul 4: Creează fișierul .env.local

În directorul proiectului, copiază `.env.example` la `.env.local`:

**Pe Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

**Pe Mac/Linux:**
```bash
cp .env.example .env.local
```

Deschide `.env.local` în VS Code și completează:

```env
DATABASE_URL="postgresql://...connection-string-de-la-neon..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

Pentru `NEXTAUTH_SECRET` rulează în terminal:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

Copiază rezultatul în `.env.local`.

## Pasul 5: Inițializează baza de date

```bash
npm run db:push
npm run db:generate
npm run db:seed
```

Vei vedea:
```
✓ Admin creat: admin@robolab.local
✓ User creat: user@robolab.local
✓ Post creat: arduino-uno-prima-led
...
✅ Seed complet!
```

## Pasul 6: Pornește aplicația

```bash
npm run dev
```

Deschide browserul la **http://localhost:3000**

Ar trebui să vezi pagina principală cu logo-ul "RoboLab" și 3 articole demo!

## Pasul 7: Testează autentificarea

Mergi la http://localhost:3000/auth/login și autentifică-te cu:
- Email: `admin@robolab.local`
- Parola: `Admin@2026!Strong`

## Pasul 8: Explorează baza de date (opțional)

Pentru a vedea vizual datele din bază:

```bash
npm run db:studio
```

Aceasta deschide Prisma Studio la http://localhost:5555 — un GUI similar phpMyAdmin pentru PostgreSQL.

---

## Probleme comune

### "Cannot find module 'next'" sau erori de import
Soluție: Rulează din nou `npm install`

### "Database connection failed"
- Verifică că DATABASE_URL în `.env.local` este corect
- Verifică că Neon DB-ul e activ (uneori se hibernează după inactivitate; un click pe Console îl trezește)

### "Port 3000 is already in use"
Soluție: Oprește procesul existent sau rulează pe alt port:
```bash
npm run dev -- -p 3001
```

### Pagina arată stilizare ruptă
- Verifică că Tailwind a compilat: vei vedea în terminal mesajul "compiled..."
- Refresh forced (Ctrl+Shift+R)

---

## Următorii pași pentru dezvoltare

Acum că aplicația rulează, putem adăuga incremental:

1. **CRUD articole** — pagină de creare/editare pentru autori
2. **Sistem comentarii** — cu sanitizare XSS
3. **Upload fișiere** — pentru atașamente STL, scheme, cod
4. **2FA setup** — generare QR code pentru Google Authenticator
5. **Pagină admin** — dashboard cu utilizatori, posturi, audit log
6. **Internaționalizare** — switch RO/EN

Toate acestea vor fi adăugate în pașii următori, conform planului săptămânal.
