import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AlertDeals',
  // Nécessaire à l'installation iOS : Safari n'exploite pas le manifest, il lit
  // ces meta `apple-mobile-web-app-*` pour ouvrir l'app en mode plein écran.
  appleWebApp: {
    capable: true,
    title: 'AlertDeals',
    statusBarStyle: 'black-translucent',
  },
};

// themeColor teinte la barre système quand l'app est lancée en standalone ;
// séparé de `metadata` car Next 16 impose de l'exporter via `viewport`.
export const viewport: Viewport = {
  themeColor: '#6D56F5',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="fr" className="dark">
    <body>
      {children}
      <Toaster position="top-right" richColors />
    </body>
  </html>
);

export default RootLayout;
