'use client';

import { Button } from '@/components/ui/button';
import { pages } from '@/config/routes';
import {
  DEFAULT_HOT_DEALS_LAYOUT,
  EHotDealsLayout,
  HOT_DEALS_LAYOUT_LABELS,
} from '@/validation-schemas';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

type Props = {
  value: EHotDealsLayout;
};

// Toggle "Grille / Liste" affiché à côté du select "Trier par :" sur la
// liste des hot deals. Permet à l'utilisateur de basculer entre la vue
// historique (grille 2-3 colonnes) et la vue "ligne" pleine largeur,
// utile pour comparer rapidement prix/marge entre annonces.
//
// On synchronise le choix dans `?layout=` pour qu'il survive aux refresh
// et au partage de lien. Pattern identique à HotDealsSortSelect : push
// d'une nouvelle URL en préservant les autres params (filtres, sort).
export function HotDealsLayoutToggle({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: EHotDealsLayout) => {
    // Inutile de re-push si l'user clique sur le mode déjà actif.
    if (next === value) return;

    // On part de l'URL courante pour préserver filtres + sort. On reset
    // `page` parce qu'un changement de layout n'a aucune raison de
    // conserver une pagination déjà parcourue.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    if (next === DEFAULT_HOT_DEALS_LAYOUT) {
      // On omet `?layout=` quand on revient au défaut pour garder l'URL propre.
      params.delete('layout');
    } else {
      params.set('layout', next);
    }

    const query = params.toString();
    const href = query ? `${pages.hotDeals}?${query}` : pages.hotDeals;
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    // Petit segmented control. On utilise `aria-pressed` plutôt qu'un
    // RadioGroup pour rester léger : deux boutons toggle suffisent et c'est
    // accessible (les lecteurs d'écran annoncent l'état actif).
    <div
      className="inline-flex items-center gap-1 rounded-md border bg-background p-0.5"
      role="group"
      aria-label="Choisir la disposition"
    >
      <Button
        type="button"
        size="sm"
        variant={value === EHotDealsLayout.GRID ? 'secondary' : 'ghost'}
        aria-pressed={value === EHotDealsLayout.GRID}
        disabled={isPending}
        onClick={() => handleChange(EHotDealsLayout.GRID)}
        className="h-8 px-2"
        title={HOT_DEALS_LAYOUT_LABELS[EHotDealsLayout.GRID]}
      >
        <LayoutGrid className="size-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1.5">
          {HOT_DEALS_LAYOUT_LABELS[EHotDealsLayout.GRID]}
        </span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === EHotDealsLayout.ROW ? 'secondary' : 'ghost'}
        aria-pressed={value === EHotDealsLayout.ROW}
        disabled={isPending}
        onClick={() => handleChange(EHotDealsLayout.ROW)}
        className="h-8 px-2"
        title={HOT_DEALS_LAYOUT_LABELS[EHotDealsLayout.ROW]}
      >
        <Rows3 className="size-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1.5">
          {HOT_DEALS_LAYOUT_LABELS[EHotDealsLayout.ROW]}
        </span>
      </Button>
    </div>
  );
}
