import type { MetadataRoute } from 'next';
import { pages } from '@/config/routes';

// Manifest PWA (route native Next 16) : sert `/manifest.webmanifest` et permet
// l'installation d'AlertDeals sur l'écran d'accueil (mobile + desktop).
// Next injecte automatiquement le <link rel="manifest"> dans le <head>.
//
// Couleurs alignées sur le thème (globals.css) :
//  - theme_color = primaire (violet), teinte la barre système de l'app installée
//  - background_color = fond sombre de l'app, affiché sur le splash au lancement
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AlertDeals',
    short_name: 'AlertDeals',
    description: 'Vos alertes deals auto, en temps réel.',
    // L'app installée s'ouvre directement sur le dashboard (le middleware
    // redirige vers /login si l'utilisateur n'est pas connecté).
    start_url: pages.dashboard,
    // standalone = plein écran sans barre d'URL, comme une app native.
    display: 'standalone',
    theme_color: '#6D56F5',
    background_color: '#141221',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Icône maskable : Android la recadre dans sa forme système (cercle,
      // squircle…) sans rogner la cloche grâce à sa safe-zone.
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
