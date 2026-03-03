import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StudyFlow - Sistema de Revisão Espaçada',
  description: 'Gerencie seus estudos com revisões automáticas de 1, 7, 15 e 30 dias.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
