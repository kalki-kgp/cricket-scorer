import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Libre_Franklin, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
});

const sans = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'LLR Hall Cricket · IIT Kharagpur',
  description:
    'Lala Lajpat Rai Hall of Residence — live scores for the intra-hall cricket tournament at IIT Kharagpur.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05070c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className={`${sans.className} bg-llr-void text-llr-cream antialiased`}>{children}</body>
    </html>
  );
}
