# Capitolul 2.2 — Componente de securitate implementate

Material-suport pentru lucrarea de licență „Securitatea informației în rețele
computerizate", ULIM 2026, specializarea 0613.5 Informatică aplicată.

Studiu de caz: platforma **RoboLab** — blog comunitar de robotică, accesibilă
public la <https://robotics-blog-three.vercel.app>, cod-sursă la
<https://github.com/IonGadarenco/robotics-blog>.

---

## 2.2.1 — Stocarea sigură a credențialelor (hashing parole)

**Atac contracarat:** dacă baza de date e furată (SQL injection, backup-uri
neprotejate, angajat compromis), atacatorul nu poate recupera parolele
utilizatorilor. Hash-urile sunt funcții unidirecționale — din hash nu
reconstruiești parola.

**Implementare:** algoritmul **bcrypt** cu cost factor 12 (4096 de iterații
de hashing). Cost-ul a fost ales conform recomandării OWASP 2024 — durează
~250 ms pe un CPU modern, suficient pentru a face brute-force impracticabil
pe parole puternice. Folosim librăria `bcryptjs` (compatibilă Node.js +
Edge runtime).

**Fișier-cheie:** [`src/lib/security.ts`](../src/lib/security.ts) — funcțiile
`hashPassword()` și `verifyPassword()`. Constanta `BCRYPT_ROUNDS = 12`.

**Standard:** NIST SP 800-63B (Memorized Secret Verifiers) — recomandă
hashing cu funcție de derivare key-stretching. OWASP ASVS V2.4.

**Demonstraţie live:** la fiecare login, durata de procesare ~3-4 secunde
e _intenţionată_ — bcrypt rulează 4096 iteraţii. Un atacator care încearcă
1 milion de parole pe un singur thread modern ar avea nevoie de ~46 zile.

---

## 2.2.2 — Gestionarea sesiunilor

**Atac contracarat:** session hijacking (XSS), session fixation, sesiuni care
nu expiră, token-uri expuse JavaScript-ului ostil din browser.

**Implementare:** **NextAuth.js** cu strategia JWT, semnate criptografic cu
`NEXTAUTH_SECRET` (32 bytes random). Cookie-ul de sesiune e marcat:
- `HttpOnly` — JavaScript-ul nu poate citi cookie-ul (apărare contra XSS)
- `Secure` — trimis doar pe HTTPS
- `SameSite=Lax` — apărare contra CSRF de bază
- `maxAge=24h` — sesiunea expiră zilnic

**Fișier-cheie:** [`src/lib/auth.ts`](../src/lib/auth.ts) — `authOptions`
cu `session.strategy = 'jwt'`, `maxAge: 60*60*24`, `updateAge: 60*60`.

**Standard:** OWASP Session Management Cheat Sheet — recomandă cookie-uri
HttpOnly + Secure + SameSite. RFC 6265 (HTTP State Management).

---

## 2.2.3 — Autentificarea în doi pași (2FA)

**Atac contracarat:** dacă atacatorul fură parola (phishing, credential stuffing,
keylogger), tot nu se poate loga fără telefonul user-ului.

**Implementare:** algoritmul **TOTP** (Time-based One-Time Password)
conform RFC 6238 — secret 160-bit, cod de 6 cifre, fereastră de 30 secunde,
toleranţă ±30s. Compatibil cu **Google Authenticator**, **Authy**, **Microsoft
Authenticator** etc. Setup-ul afişează QR code generat cu URI standard
`otpauth://totp/...`.

**Securitate la activare:** secretul NU se salvează în BD până când user-ul
NU demonstrează că poate genera un cod valid. Asta evită starea inconsistentă
„secret salvat dar app neconfigurată" (utilizatorii ar fi blocaţi la login).

**Securitate la dezactivare:** cere parola user-ului pentru reverificare —
chiar dacă atacatorul fură sesiunea, nu poate dezactiva 2FA fără parolă.

**Fișiere-cheie:**
- [`src/app/api/auth/2fa/setup/route.ts`](../src/app/api/auth/2fa/setup/route.ts) — generare secret + QR
- [`src/app/api/auth/2fa/enable/route.ts`](../src/app/api/auth/2fa/enable/route.ts) — verificare cod + activare
- [`src/app/api/auth/2fa/disable/route.ts`](../src/app/api/auth/2fa/disable/route.ts) — dezactivare cu parolă
- [`src/app/profile/2fa/page.tsx`](../src/app/profile/2fa/page.tsx) — UI

**Standard:** RFC 6238 (TOTP), RFC 4226 (HOTP de bază), NIST SP 800-63B
nivelul AAL2.

---

## 2.2.4 — Apărarea împotriva injecțiilor SQL

**Atac contracarat:** SQL injection clasică (`' OR 1=1--`, `; DROP TABLE`)
prin care atacatorul ar putea citi/altera/şterge orice din BD.

**Implementare în straturi:**

1. **Toate query-urile prin Prisma ORM** — folosesc parametri liaţi (prepared
   statements), niciodată concatenare de string-uri SQL. Imposibil de injectat.
2. **Whitelist pe parametri URL** — pentru filtre ca `?category=ROBOTICS`,
   valorile permise sunt hard-codate într-un array. Orice altă valoare e
   ignorată tăcut, nu ajunge la BD.
3. **Validare format ID** — toţi cuid-urile Prisma sunt verificaţi cu regex
   `/^[a-z0-9]+$/i` înainte de query — apărare DoS contra inputurilor uriaşe.

**Fișiere-cheie:**
- [`src/app/posts/page.tsx`](../src/app/posts/page.tsx) — array `CATEGORIES`
  whitelist pentru filtru
- [`src/app/api/posts/[id]/route.ts`](../src/app/api/posts/[id]/route.ts) —
  validare ID cu regex
- [`src/lib/validation.ts`](../src/lib/validation.ts) — schema Zod cu format
  strict cuid

**Standard:** OWASP Top 10 A03:2021 (Injection). CWE-89.

---

## 2.2.5 — Sanitizarea conținutului (anti-XSS)

**Atac contracarat:** Cross-Site Scripting — atacatorul lasă `<script>alert(1)`
într-un comentariu, iar la afișare scriptul s-ar executa în browserul altor
utilizatori, putând fura cookie-uri de sesiune.

**Implementare cu 3 straturi independente (defense in depth):**

1. **Validare la intrare** — Zod cere lungimi 2-2000 caractere, format
   strict pentru ID-uri.
2. **Sanitizare la salvare** — `stripHtml()` elimină tot HTML-ul iterativ
   (apără contra bypass-urilor cu nesting `<scr<script>ipt>`).
3. **Auto-escape la randare** — React escape-uiește automat `<` ca `&lt;`
   etc. Chiar dacă un payload ar trece de stratul 2, browser-ul nu-l
   interpretează ca HTML.

Pentru articolele Markdown, **react-markdown** NU permite HTML brut —
`<script>` rămâne text literal.

**Demonstraţie reproductibilă:** payload `<script>alert('HACK')</script>`
trimis prin API la un comentariu se salvează în BD ca string gol (după strip).
La randare, browserul afișează nimic. Verificat prin curl + grep pe HTML-ul
generat — nicio etichetă `<script>` ostilă nu apare.

**Fișiere-cheie:**
- [`src/lib/security.ts`](../src/lib/security.ts) — `stripHtml()` iterativ
- [`src/app/api/comments/route.ts`](../src/app/api/comments/route.ts) — sanitizare
- [`src/components/MarkdownContent.tsx`](../src/components/MarkdownContent.tsx) —
  randare safe Markdown

**Standard:** OWASP Top 10 A03:2021 (Injection — XSS subset). CWE-79.

---

## 2.2.6 — Apărarea împotriva CSRF

**Atac contracarat:** Cross-Site Request Forgery — un site malefic forțează
browserul user-ului să facă cereri autentificate către aplicația noastră
(ex: șterge contul, schimbă parola).

**Implementare:**

1. **Token CSRF NextAuth** — orice cerere de login include un token
   one-time generat de server, verificat la submit. Atacatorul nu-l poate
   ghici sau prezice.
2. **Cookie SameSite=Lax** pe sesiune — browser-ul nu trimite cookie-ul
   în request-uri cross-origin (de exemplu, când un site terț încearcă să
   facă POST către noi).
3. **Verificare Origin/Referer** implicit prin Next.js Server Actions și
   `getServerSession()`.

**Fişier-cheie:** [`src/lib/auth.ts`](../src/lib/auth.ts) — NextAuth
configurat cu CSRF-protected callbacks.

**Standard:** OWASP CSRF Prevention Cheat Sheet. RFC 6749 §10.12.

---

## 2.2.7 — Limitarea ratei (rate limiting)

**Atac contracarat:** brute-force pe parole, flood pe formulare (spam
register, spam comentarii), DDoS la aplicaţie.

**Implementare:** rate limiter in-memory cu strategie token-bucket per
cheie (IP sau ID utilizator). Limite distincte per endpoint, configurabile:

| Endpoint | Limită | Cheie |
|---|---|---|
| Login | 10/minut | IP |
| Register | 30/oră (dev), 3/oră (prod) | IP |
| Forgot password | 5/oră IP, 3/oră email | IP + email (dual) |
| Reset password | 10/oră | IP |
| Comentarii | 10/minut | utilizator |

**Fişier-cheie:** [`src/lib/security.ts`](../src/lib/security.ts) —
funcția `rateLimit()` + `setInterval` pentru cleanup intrări expirate
(anti memory-leak).

**Limita designului:** in-memory funcționează pe o singură instanță. În
producție multi-region (ex: Vercel cu 10 funcții), s-ar muta în **Redis**
(Upstash). Pentru proiect didactic e adecvat.

**Standard:** OWASP ASVS V11 (Business Logic). NIST SP 800-92.

---

## 2.2.8 — Headers HTTP de securitate

**Atac contracarat:** clickjacking (atacator face iframe la site-ul nostru),
XSS prin scripturi externe, downgrade attack la HTTP, MIME sniffing.

**Implementare:** [`next.config.js`](../next.config.js) trimite la fiecare
răspuns următoarele headere:

| Header | Valoare | Apărare |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; ...` | XSS, supply chain |
| `Strict-Transport-Security` | `max-age=63072000; preload` | downgrade HTTPS→HTTP |
| `X-Frame-Options` | `DENY` | clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME confusion |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | leak URL-uri |
| `Permissions-Policy` | `camera=(), microphone=()...` | API-uri sensibile dezactivate |

**CSP detaliat:** `default-src 'self'` — orice resursă neautorizată e
blocată. Whitelist explicit pe Google Fonts (`fonts.googleapis.com` /
`fonts.gstatic.com`), pe Vercel Blob (`https:` prefix pentru img/media).
`object-src 'none'` blochează plugin-uri legacy (Flash, Java).

**Standard:** OWASP Secure Headers Project. MDN HTTP Headers.

---

## 2.2.9 — Criptare în tranzit (TLS)

**Atac contracarat:** Man-in-the-middle — atacator pe rețeaua locală
(WiFi public, ISP compromis) interceptează și citește/modifică traficul.

**Implementare în două puncte:**

1. **Browser ↔ Aplicație:** Vercel oferă TLS 1.3 automat pe toate domeniile
   `*.vercel.app` (certificat Let's Encrypt). HSTS (`max-age=2 ani`)
   forțează browserul să refuze HTTP după prima vizită.
2. **Aplicație ↔ BD:** conexiune Postgres pe Neon cu `sslmode=require` în
   DATABASE_URL — dacă serverul nu prezintă certificat valid, conexiunea
   se refuză.

**Fişier-cheie:** [`.env.example`](../.env.example) — DATABASE_URL include
`sslmode=require&channel_binding=require`. `next.config.js` are HSTS.

**Standard:** RFC 8446 (TLS 1.3), NIST SP 800-52 Rev. 2.

---

## 2.2.10 — Audit log (jurnalizare evenimente sensibile)

**Atac contracarat:** atacuri ascunse — fără jurnal, după compromis nu poţi
şti ce s-a întâmplat (forensics impossible). Plus: detecţie atacuri în curs
(spike-uri de LOGIN_FAILED indică brute-force).

**Implementare:** tabel dedicat `AuthLog` în schema Prisma cu enum
`AuthEvent` ce acoperă 10 tipuri de evenimente:

```
LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED, LOGOUT,
PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_SUCCESS,
TWO_FA_ENABLED, TWO_FA_DISABLED, REGISTRATION
```

Fiecare înregistrare conține: `userId`, `email`, `event`, `ipAddress`,
`userAgent`, `createdAt`. Indecşi pe `userId`, `event`, `createdAt` pentru
query-uri rapide.

**UI vizual demonstrabil la susținere:** `/admin/audit` afișează tabelul
cu filtre pe tip eveniment + paginare 50/pagină. Dashboardul `/admin`
arată „eșecuri auth în 24h" — semnal de brute-force în desfășurare.

**Fișiere-cheie:**
- [`prisma/schema.prisma`](../prisma/schema.prisma) — model `AuthLog` + enum
- [`src/lib/security.ts`](../src/lib/security.ts) — `logAuthEvent()`
- [`src/app/admin/audit/page.tsx`](../src/app/admin/audit/page.tsx) — UI

**Standard:** OWASP ASVS V7 (Error Handling and Logging). NIST SP 800-92.

---

## 2.2.11 — Securitatea fișierelor uploadate

**Atac contracarat:** path traversal (`../../../etc/passwd`), MIME spoofing
(executabil cu nume `.png`), SVG cu JavaScript inline (XSS), DoS prin
fișiere uriașe, malware uploadat și apoi răspândit.

**Implementare cu 7 straturi:**

1. **Whitelist MIME** — doar JPG/PNG/WebP/PDF/ZIP/STL/MP4/WebM. **SVG
   exclus** intenționat (poate conține `<script>`).
2. **Whitelist extensie** — regex `^\.[a-z0-9]{1,8}$` pentru sanitizare.
3. **Cross-check MIME ⇔ extensie** — un `.pdf` trimis cu MIME
   `application/zip` e respins (MIME spoofing).
4. **Limită size** — 10 MB normal, 50 MB pentru video. Anti-DoS.
5. **Anti path-traversal pe nume** — regex respinge `../`, `/`, `\`,
   leading `.` în numele original.
6. **Nume random pe disk/Blob** — 32 bytes hex (256 bit entropie). Numele
   user-ului e salvat doar în BD ca metadată.
7. **Verificare path absolut** — `fullPath.startsWith(UPLOAD_DIR)`
   suprascris ca apărare ultimă în filesystem.

**Stocare cloud (producție):** Vercel Blob — fișierele NU se salvează pe
filesystem-ul aplicației (efemer), ci pe stocaj dedicat cu URL-uri publice
randomizate pe domeniul `*.public.blob.vercel-storage.com`.

**Fișiere-cheie:**
- [`src/lib/storage.ts`](../src/lib/storage.ts) — saveFile/deleteFile
- [`src/lib/validation.ts`](../src/lib/validation.ts) — `validateUpload()`
- [`src/app/api/posts/[id]/files/route.ts`](../src/app/api/posts/[id]/files/route.ts)
- [`src/app/api/posts/[id]/cover/route.ts`](../src/app/api/posts/[id]/cover/route.ts)

**Standard:** OWASP Unrestricted File Upload Cheat Sheet. CWE-434.

---

## 2.2.12 — Apărarea împotriva brute-force

**Atac contracarat:** atacator încearcă mii de parole pe un cont specific
sau credential stuffing cu liste publice de parole compromise.

**Implementare în straturi:**

1. **bcrypt cost 12** (subcap. 2.2.1) — fiecare încercare durează
   ~250 ms. 1 milion de parole = ~46 zile pe un singur thread.
2. **Lockout după N tentative eşuate** — la 5 eşecuri consecutive,
   contul se blochează pentru 15 minute (configurabil prin `MAX_LOGIN_ATTEMPTS`
   şi `LOCKOUT_DURATION_MINUTES`).
3. **Rate limiting per IP** — 10 login-uri/minut (subcap. 2.2.7).
4. **Audit log** (subcap. 2.2.10) — eveniment `LOGIN_LOCKED` apare în
   panoul admin → forensic + alertare.
5. **Reset clean al lockout-ului** — la login reușit sau reset parolă,
   `failedLoginAttempts` se resetează la 0 (user legitim nu rămâne blocat).

**Fişiere-cheie:**
- [`prisma/schema.prisma`](../prisma/schema.prisma) — câmpuri
  `failedLoginAttempts`, `lockedUntil` pe model User
- [`src/lib/security.ts`](../src/lib/security.ts) — `recordFailedLogin()`,
  `resetFailedAttempts()`, `isUserLocked()`
- [`src/lib/auth.ts`](../src/lib/auth.ts) — verificare lockout în
  `authorize()` callback

**Standard:** NIST SP 800-63B §5.2.2 (Rate Limiting). OWASP ASVS V2.2.

---

# Apărări suplimentare (extensii dincolo de cele 12)

## 2.2.13 — Apărarea împotriva enumerării utilizatorilor

**Atac contracarat:** atacator scanează endpoint-uri pentru a afla ce
email-uri au cont. Lista e folosită pentru phishing țintit, credential
stuffing, profilare.

**Implementare:** răspunsul HTTP la `/api/auth/register` și
`/api/auth/forgot-password` e **identic** indiferent dacă email-ul există
sau nu (200 + mesaj neutru). Atacatorul nu poate distinge cele două cazuri.

**Trade-off recunoscut:** UX-ul pierde puțin (user uitat parola nu primește
mesaj direct „nu există"), dar câștigul de securitate e major. Folosit de
GitHub, Discord, Slack, Microsoft.

**Fişiere-cheie:**
- [`src/app/api/auth/register/route.ts`](../src/app/api/auth/register/route.ts)
- [`src/app/api/auth/forgot-password/route.ts`](../src/app/api/auth/forgot-password/route.ts)

**Standard:** OWASP ASVS V3.2.

---

## 2.2.14 — Recuperare parolă cu token sigur

**Atac contracarat:** dacă user uită parola, are nevoie de o cale de recovery
care să nu fie ea însăși un vector de atac.

**Implementare cu apărări multiple:**

- **Token 256-bit** generat cu `crypto.randomBytes(32)` — imposibil de
  ghicit prin brute-force.
- **Hash SHA-256 stocat în BD** (nu raw token) — dacă BD e furată,
  atacatorul nu poate fabrica link-uri valide.
- **Expirare 1 oră** — fereastra de atac prin token interceptat e îngustă.
- **Single-use** — câmp `usedAt` setat la prima utilizare.
- **Invalidare token-uri concurente** la reset reușit — dacă atacatorul
  are unul interceptat, devine inutil.
- **Tranzacție atomică** — update parolă + marcare token + reset failed
  attempts + ștergere sesiuni active, totul atomic.
- **Email real prin Resend** — link trimis pe Gmail-ul user-ului real.
- **Rate limit dual** — per IP + per email (anti spam pe victima țintită).

**Fişiere-cheie:**
- [`src/app/api/auth/forgot-password/route.ts`](../src/app/api/auth/forgot-password/route.ts)
- [`src/app/api/auth/reset-password/route.ts`](../src/app/api/auth/reset-password/route.ts)
- [`prisma/schema.prisma`](../prisma/schema.prisma) — model `PasswordResetToken`

**Standard:** OWASP ASVS V2.5.

---

## 2.2.15 — Anti IDOR (Insecure Direct Object Reference)

**Atac contracarat:** user A schimbă ID-ul din URL la o resursă a user-ului
B (`/dashboard/posts/<id-altui-user>/edit`) și o modifică/șterge.

**Implementare:** la **fiecare** mutație (PATCH/DELETE pe articole,
comentarii, fișiere, salvări), server-ul verifică ownership:

```ts
if (role !== 'ADMIN' && resource.authorId !== userId) {
  return NextResponse.json({ error: 'Permisiuni insuficiente' }, { status: 403 });
}
```

Verificarea e **strict server-side** — UI-ul ascunde butoanele de la
non-owneri, dar API-ul refuză cererea oricum (nu se bazează pe UI).

**Fişiere-cheie:**
- [`src/app/api/posts/[id]/route.ts`](../src/app/api/posts/[id]/route.ts)
- [`src/app/api/comments/[id]/route.ts`](../src/app/api/comments/[id]/route.ts)
- [`src/app/api/posts/[id]/files/[fileId]/route.ts`](../src/app/api/posts/[id]/files/[fileId]/route.ts)

**Standard:** OWASP Top 10 A01:2021 (Broken Access Control). CWE-639.

---

## 2.2.16 — Anti self-lockout (admin)

**Atac contracarat:** un admin se retrogradează singur sau se șterge —
platforma rămâne fără administrator (irecuperabil fără acces direct la BD).

**Implementare cu 2 reguli suprapuse:**

1. **Anti self-modificare** — un user nu-și poate schimba propriul rol
   sau să se șteargă singur. Verificare server-side.
2. **Anti last-admin** — ULTIMUL admin rămas nu poate fi retrogradat sau
   șters de niciun alt admin (count check înainte de mutație).

**Fişiere-cheie:**
- [`src/app/api/admin/users/[id]/role/route.ts`](../src/app/api/admin/users/[id]/role/route.ts)
- [`src/app/api/admin/users/[id]/route.ts`](../src/app/api/admin/users/[id]/route.ts)

---

## 2.2.17 — Defense in depth (apărare în adâncime)

Toate apărările de mai sus respectă principiul **defense in depth** — niciun
strat singur nu e responsabil pentru securitatea unei resurse. Exemple:

- **Rute admin protejate la 3 niveluri:** middleware Next.js (filtru rol) +
  page-ul Server Component (re-verificare sesiune) + Prisma WHERE pe authorId
  (filtrare la BD).
- **Anti-XSS la 3 niveluri:** Zod validation + stripHtml regex iterativ +
  React auto-escape la randare.
- **Anti path-traversal la 3 niveluri:** validare nume input + nume random
  pe disk + verificare `startsWith(UPLOAD_DIR)`.

Logica: dacă atacatorul găseşte un bypass într-un strat, ceilalţi prind
atacul. Pentru a compromite resursa, trebuie să bypass-eze TOATE straturile
simultan.

**Standard:** NIST SP 800-160, OWASP Application Security Verification
Standard, principiul „security in depth" (Saltzer & Schroeder, 1975).

---

# Diagrame flux

## Flux autentificare cu 2FA

```
User                  Browser                Server (NextAuth)            Database
 |                       |                          |                         |
 |  email+parolă+TOTP    |                          |                         |
 |---------------------> |                          |                         |
 |                       |  POST /callback/credentials                        |
 |                       |------------------------> |                         |
 |                       |                          | 1. Zod validate         |
 |                       |                          | 2. Rate limit IP        |
 |                       |                          | 3. SELECT user by email |
 |                       |                          |------------------------>|
 |                       |                          |<------------------------|
 |                       |                          | 4. Check lockout        |
 |                       |                          | 5. bcrypt.compare ~250ms|
 |                       |                          | 6. Verify TOTP (RFC6238)|
 |                       |                          | 7. Reset failed counter |
 |                       |                          | 8. INSERT AuthLog SUCCESS
 |                       |                          |------------------------>|
 |                       |                          | 9. Sign JWT (HS256)     |
 |                       |  Set-Cookie HttpOnly+Secure                        |
 |                       |<-------------------------|                         |
 |                       |                          |                         |
 |   Acces resurse       |                          |                         |
 |---------------------> | Cookie -> JWT verified   |                         |
```

## Flux reset parolă (anti-enumerare)

```
User                                 Server                              Email
 |                                      |                                  |
 |  email pe /auth/forgot               |                                  |
 |------------------------------------> |                                  |
 |                                      | Rate limit IP + email           |
 |                                      | SELECT user                      |
 |                                      |--+                               |
 |                                      |  |                               |
 |                                      |  +-- exists? ----+                |
 |                                      |                  |                |
 |                                      |   +---YES---+    +---NO---+      |
 |                                      |   |         |    |        |      |
 |                                      |   v         |    v        |      |
 |                                      | Generate 256-bit token            |
 |                                      | INSERT hash în BD                 |
 |                                      | sendEmail(reset link) ----------> |
 |                                      |   |         |    |        |      |
 |                                      |   +---------+    +--------+      |
 |  HTTP 200 + mesaj NEUTRU IDENTIC     |                                  |
 |  (nu trădează existența)             |                                  |
 |<------------------------------------ |                                  |
 |                                      |                                  |
 |  (dacă există) primește email cu link valid 1h, single-use              |
```

## Flux upload fișier (7 straturi)

```
Client (browser)               Server (Next.js)                      Vercel Blob
 |                                  |                                    |
 |  multipart/form-data file        |                                    |
 |--------------------------------->|                                    |
 |                                  | 1. getServerSession() — auth       |
 |                                  | 2. Role check AUTHOR/ADMIN         |
 |                                  | 3. Ownership check (post.authorId) |
 |                                  | 4. validateUpload():               |
 |                                  |    - MIME whitelist                |
 |                                  |    - extensie whitelist            |
 |                                  |    - cross-check MIME⇔extensie     |
 |                                  |    - size <= 10/50 MB              |
 |                                  |    - anti path-traversal pe nume   |
 |                                  | 5. generateStoredName(): 32B hex   |
 |                                  | 6. saveFile(blob) ---------------->|
 |                                  |    Vercel SDK put(name, buffer,    |
 |                                  |    {access:'public', addRandomSuffix:false})
 |                                  |<-----------------------------------|
 |                                  |    return { url: 'https://...' }   |
 |                                  | 7. INSERT PostFile { storedAs: url }
 |  201 + { storedAs }              |                                    |
 |<---------------------------------|                                    |
```

---

# Stack tehnologic — alegeri și de ce

| Tehnologie | De ce ales |
|---|---|
| **Next.js 14 App Router** | Server Components reduc surface XSS — JS-ul rulează pe server, doar HTML ajunge în client. CSP-ul devine eficient. |
| **TypeScript strict** | Tipuri verificate la compile-time elimină categorii întregi de bug-uri (null pointer, mismatch tipuri în request body). |
| **Prisma ORM** | Query-uri parametrizate by design — imposibil SQL injection prin sintaxă. Schema declarativă (single source of truth pentru BD). |
| **NextAuth.js** | Implementare audited a OAuth2/OIDC, JWT, CSRF tokens. Mai sigur decât roll-your-own. |
| **PostgreSQL Neon** | Cloud-native, conexiune obligatoriu TLS, auto-backup, point-in-time recovery. |
| **Vercel deploy + Blob** | TLS 1.3 automat, edge network, certificate Let's Encrypt, blob storage cu URL-uri public-randomizate. |
| **Zod** | Single source of truth pentru schema validare — același cod rulează server și client. |
| **react-markdown** | Randare safe a Markdown fără eval/innerHTML/raw HTML. |
| **bcryptjs** | Compatibil Node.js + Edge runtime, fără native bindings (deploy facil pe Vercel). |
| **Resend** | Furnizor email modern cu API simplu, SPF/DKIM/DMARC configurat automat (anti-spoofing). |

---

# Concluzii pentru capitolul 2.2

Platforma RoboLab implementează 12 componente principale + 5 apărări
suplimentare, totalizând **17 măsuri de securitate** verificabile prin
demonstrație live. Toate respectă principiul **defense in depth** —
fiecare resursă protejată prin minim 2-3 straturi independente.

Decizii arhitecturale-cheie:
- **Server-first** — toate verificările critice (auth, ownership, rate
  limit) sunt server-side. UI-ul oferă UX, dar nu securitate.
- **Validate at boundaries** — Zod la fiecare endpoint API, whitelist
  pe parametri URL.
- **Fail closed** — la orice ambiguitate (validare eșuată, sesiune
  invalidă), refuzăm cererea, nu permitem.
- **Audit-friendly** — fiecare eveniment sensibil produce intrare în
  AuthLog, demonstrabil în UI admin.
