import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AlertDeals',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="fr">
    <body>{children}</body>
  </html>
);

export default RootLayout;
