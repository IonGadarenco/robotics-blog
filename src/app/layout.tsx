// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: {
    default: 'RoboLab — Blog de Robotică',
    template: '%s | RoboLab',
  },
  description:
    'Platformă educațională pentru proiecte de robotică, imprimare 3D și dezvoltare web. Comunitate de pasionați și formatori.',
  keywords: ['robotică', 'imprimare 3D', 'arduino', 'raspberry pi', 'programare', 'web development'],
  authors: [{ name: 'Ion Gadarenco' }],
  creator: 'Ion Gadarenco',
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    title: 'RoboLab — Blog de Robotică',
    description: 'Comunitate educațională pentru robotică, 3D printing și programare',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="dark">
      <body className="bg-carbon-950 text-carbon-100 min-h-screen">
        {/* SessionProvider permite useSession() în client components */}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
