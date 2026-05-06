// prisma/seed.ts
// Date demo pentru testare locală
// Rulare: npm run db:seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Curățăm datele existente (opțional)
  await prisma.comment.deleteMany();
  await prisma.savedPost.deleteMany();
  await prisma.postFile.deleteMany();
  await prisma.post.deleteMany();
  await prisma.authLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Creăm un admin
  const adminHash = await bcrypt.hash('Admin@2026!Strong', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@robolab.local',
      name: 'Ion Gadarenco',
      passwordHash: adminHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });
  console.log('✓ Admin creat:', admin.email);

  // Creăm un user obișnuit
  const userHash = await bcrypt.hash('User@2026!Strong', 12);
  const user = await prisma.user.create({
    data: {
      email: 'user@robolab.local',
      name: 'Test User',
      passwordHash: userHash,
      role: 'USER',
      emailVerified: new Date(),
    },
  });
  console.log('✓ User creat:', user.email);

  // Creăm câteva articole demo
  const posts = [
    {
      slug: 'arduino-uno-prima-led',
      titleRo: 'Arduino UNO: primul tău LED clipitor',
      titleEn: 'Arduino UNO: your first blinking LED',
      excerptRo: 'Tutorial pas cu pas pentru începători. Învață cum să faci un LED să clipească folosind Arduino UNO și câteva linii de cod.',
      excerptEn: 'Step by step tutorial for beginners. Learn how to make an LED blink using Arduino UNO and a few lines of code.',
      contentRo: 'Arduino UNO este una dintre cele mai populare plăci pentru începători...\n\nÎn acest tutorial vom învăța cum să facem un LED să clipească. Avem nevoie de:\n- O placă Arduino UNO\n- Un LED\n- O rezistență de 220Ω\n- Cabluri de conexiune\n\nPasul 1: Conectează LED-ul la pinul 13...',
      contentEn: 'Arduino UNO is one of the most popular boards for beginners...\n\nIn this tutorial we will learn how to make an LED blink. We need:\n- An Arduino UNO board\n- An LED\n- A 220Ω resistor\n- Connection wires\n\nStep 1: Connect the LED to pin 13...',
      category: 'ROBOTICS' as const,
      published: true,
      publishedAt: new Date('2026-04-01'),
      authorId: admin.id,
    },
    {
      slug: 'imprimare-3d-prima-piesa',
      titleRo: 'Imprimare 3D: cum să printezi prima ta piesă',
      titleEn: '3D Printing: how to print your first piece',
      excerptRo: 'Ghid complet pentru a începe cu imprimarea 3D. De la alegerea modelului STL până la calibrarea imprimantei și prima piesă cu adevărat reușită.',
      excerptEn: 'Complete guide to start with 3D printing. From choosing the STL model to calibrating the printer and the first truly successful piece.',
      contentRo: 'Imprimarea 3D a devenit accesibilă oricui...\n\nÎn acest articol vom acoperi:\n1. Alegerea unei imprimante\n2. Software-ul necesar (Cura, PrusaSlicer)\n3. Calibrarea patului\n4. Prima piesă\n\nSă începem cu calibrarea...',
      contentEn: '3D printing has become accessible to everyone...\n\nIn this article we will cover:\n1. Choosing a printer\n2. Required software (Cura, PrusaSlicer)\n3. Bed calibration\n4. The first piece\n\nLet\'s start with calibration...',
      category: 'THREE_D_PRINT' as const,
      published: true,
      publishedAt: new Date('2026-04-10'),
      authorId: admin.id,
    },
    {
      slug: 'nextjs-securitate-aplicatii-web',
      titleRo: 'Next.js: 10 practici de securitate pentru aplicații web',
      titleEn: 'Next.js: 10 security practices for web applications',
      excerptRo: 'De la headers HTTP la rate limiting și autentificare 2FA — un ghid practic pentru securizarea aplicațiilor moderne Next.js.',
      excerptEn: 'From HTTP headers to rate limiting and 2FA authentication — a practical guide to securing modern Next.js applications.',
      contentRo: 'Securitatea aplicațiilor web este o disciplină vastă...\n\nÎn acest articol vom discuta despre:\n1. Headers HTTP de securitate (CSP, HSTS, X-Frame-Options)\n2. Validarea input-urilor cu Zod\n3. Hashing parole cu bcrypt\n4. Autentificare în doi pași (2FA)\n5. Rate limiting\n6. Sanitizare HTML împotriva XSS\n7. Apărare împotriva CSRF\n8. Logging și audit\n9. Deploy securizat\n10. Monitorizare continuă',
      contentEn: 'Web application security is a vast discipline...\n\nIn this article we will discuss:\n1. Security HTTP headers (CSP, HSTS, X-Frame-Options)\n2. Input validation with Zod\n3. Password hashing with bcrypt\n4. Two-factor authentication (2FA)\n5. Rate limiting\n6. HTML sanitization against XSS\n7. CSRF defense\n8. Logging and audit\n9. Secure deployment\n10. Continuous monitoring',
      category: 'WEB_DEV' as const,
      published: true,
      publishedAt: new Date('2026-04-20'),
      authorId: admin.id,
    },
  ];

  for (const post of posts) {
    const created = await prisma.post.create({ data: post });
    console.log('✓ Post creat:', created.slug);
  }

  console.log('\n✅ Seed complet!');
  console.log('\n📋 Credențiale demo:');
  console.log('   Admin: admin@robolab.local / Admin@2026!Strong');
  console.log('   User:  user@robolab.local  / User@2026!Strong');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
