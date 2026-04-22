import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Mono, Syne } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const syne = Syne({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--font-serif' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['300', '400'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Regalis — Property Ops',
  description: 'Portfolio, tenants, and leases. Built for South African rentals.',
  icons: { icon: '/regalis.svg' },
  metadataBase: new URL('https://regalis.co.za'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${cormorant.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
