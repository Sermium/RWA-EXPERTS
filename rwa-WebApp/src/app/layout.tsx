// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { NetworkGuard } from '@/components/NetworkGuard';
import { FeesInitializer } from '@/components/FeesInitializer';
import Header from '@/components/Header';
import Footer from '@/components/footer';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en">
      <body className={inter.className}>
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
