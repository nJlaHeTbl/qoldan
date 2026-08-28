import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin', 'cyrillic'] });
export const metadata: Metadata = {
  title: 'Qoldan — ресурсы, аренда и услуги по Казахстану',
  description: 'Найдите сельхозтехнику, арендуйте оборудование или купите стройматериалы рядом в любом регионе Казахстана.',
  openGraph: { title: 'Qoldan — всё нужное для дела рядом', description: 'Техника, аренда, материалы и заявки по всему Казахстану.', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: 'Qoldan — всё нужное для дела рядом', description: 'Техника, аренда, материалы и заявки по всему Казахстану.', images: ['/og.png'] }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body className={manrope.variable}>{children}</body></html>; }
