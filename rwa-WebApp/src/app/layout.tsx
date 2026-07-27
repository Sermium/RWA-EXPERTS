// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { NetworkGuard } from '@/components/NetworkGuard';
import { FeesInitializer } from '@/components/FeesInitializer';
import Header from '@/components/Header';
import Footer from '@/components/footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Qwilon - Real World Asset Tokenisation',
  description: 'Tokenize Real-World Assets',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body className="font-sans bg-surface-sunken text-ink antialiased">
        <Providers>
          <FeesInitializer>
            <NetworkGuard />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </FeesInitializer>
        </Providers>
      </body>
    </html>
  );
}
