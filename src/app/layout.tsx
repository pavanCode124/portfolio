import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { profile } from '@/data/profile';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description:
    'Software engineer building real-time 3D, physics simulation and cross-platform products. Projects: DroneLab, GroomTap, Green Sortie, MBFS Billing.',
  metadataBase: new URL('https://pavansai.dev'),
  openGraph: {
    title: `${profile.name} — ${profile.role}`,
    description: 'A 3D portfolio where a procedurally built robot opens each project for you.',
    url: '/',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#05060d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
