import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin', 'cyrillic'] });
export const metadata: Metadata = {
  title: 'Qoldan — техника, аренда и материалы в Жетісу',
  description: 'Найдите сельхозтехнику, арендуйте инструмент или купите остатки стройматериалов рядом с вами.',
  openGraph: { title: 'Qoldan — всё нужное для дела рядом', description: 'Техника, аренда и стройматериалы в Талдыкоргане и Жетісу.', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: 'Qoldan — всё нужное для дела рядом', description: 'Техника, аренда и стройматериалы в Талдыкоргане и Жетісу.', images: ['/og.png'] }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body className={manrope.variable}>{children}</body></html>; }
