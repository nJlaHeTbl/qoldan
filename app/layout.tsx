import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import CookieNotice from '@/components/CookieNotice';
import LegalFooter from '@/components/LegalFooter';
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
});
export const metadata: Metadata = {
  metadataBase: new URL('https://qoldan-zhetisu.nuc9i218.chatgpt.site'),
  title: 'Qoldan — ресурсы, аренда и услуги по Казахстану',
  description:
    'Найдите сельхозтехнику, арендуйте оборудование или купите стройматериалы рядом в любом регионе Казахстана.',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Qoldan', statusBarStyle: 'default' },
  openGraph: {
    title: 'Qoldan — всё нужное для дела рядом',
    description: 'Техника, аренда, материалы и заявки по всему Казахстану.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qoldan — всё нужное для дела рядом',
    description: 'Техника, аренда, материалы и заявки по всему Казахстану.',
    images: ['/og.png'],
  },
};
export const viewport: Viewport = { themeColor: '#0d6b45' };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>
        <a className="skip-link" href="#main-content">
          К содержимому
        </a>
        {children}
        <LegalFooter />
        <CookieNotice />
      </body>
    </html>
  );
}
