'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Bouton placeholder : la vraie analyse avancée (estimation IA, comparables,
// historique de prix…) sera branchée plus tard. Pour l'instant on affiche
// juste un toast pour signaler que la feature est connue mais pas prête.
// Marqué "use client" parce qu'il déclenche un toast au clic — le reste de
// la page détail reste un Server Component.
export function AdvancedAnalysisButton() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.info('Analyse avancée bientôt disponible', {
          description:
            'Cette fonctionnalité est en cours de développement.',
        })
      }
    >
      <Sparkles className="size-4" />
      Analyse avancée
    </Button>
  );
}
