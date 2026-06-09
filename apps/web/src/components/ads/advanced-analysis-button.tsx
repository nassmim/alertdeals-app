'use client';

import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

// Bouton placeholder : la vraie analyse avancée (estimation IA, comparables,
// historique de prix…) sera branchée plus tard. Pour l'instant on affiche
// juste un toast pour signaler que la feature est connue mais pas prête.
// Marqué "use client" parce qu'il déclenche un toast au clic — le reste de
// la page détail reste un Server Component.
//
// CTA primaire de la page détail : on garde le variant par défaut (qui
// utilise `bg-primary` du thème), full-width et `size="lg"` pour qu'il
// ressorte naturellement dans la colonne droite.
export function AdvancedAnalysisButton() {
  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() =>
        toast.info('Analyse avancée bientôt disponible', {
          description:
            'Cette fonctionnalité est en cours de développement.',
        })
      }
    >
      <BarChart3 className="size-4" />
      Voir l'analyse détaillée
    </Button>
  );
}
