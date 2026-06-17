'use client';

import { Button } from '@/components/ui/button';
import { pages } from '@/config/routes';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Props = {
  page: number;
  totalPages: number;
};

export function HotDealsPagination({ page, totalPages }: Props) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  // Construit l'URL de la page cible en conservant tous les autres params
  // (sort, filtres) tels qu'ils sont dans l'URL courante. On override juste
  // `page`. Avantage : pas besoin de passer chaque param explicitement en
  // prop, ça scale tout seul si on rajoute un nouveau filtre demain.
  const buildPageHref = (targetPage: number): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(targetPage));
    return `${pages.hotDeals}?${params.toString()}`;
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination des bonnes affaires"
      className="mt-6 flex items-center justify-center gap-3"
    >
      <Button
        asChild={hasPrev}
        variant="outline"
        size="sm"
        disabled={!hasPrev}
        aria-label="Page précédente"
      >
        {hasPrev ? (
          <Link href={buildPageHref(page - 1)}>
            <ChevronLeft className="size-4" />
            Précédent
          </Link>
        ) : (
          // Fragment (pas <span>) : sans wrapper, l'icône et le texte sont
          // enfants directs du <button> et héritent de son flex/gap, donc
          // l'espacement reste identique à l'état actif (le <Link>).
          <>
            <ChevronLeft className="size-4" />
            Précédent
          </>
        )}
      </Button>

      <span className="text-sm text-muted-foreground">
        Page {page} sur {totalPages}
      </span>

      <Button
        asChild={hasNext}
        variant="outline"
        size="sm"
        disabled={!hasNext}
        aria-label="Page suivante"
      >
        {hasNext ? (
          <Link href={buildPageHref(page + 1)}>
            Suivant
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          // Idem : Fragment pour conserver l'espacement icône/texte à l'état
          // désactivé, cohérent avec le bouton actif.
          <>
            Suivant
            <ChevronRight className="size-4" />
          </>
        )}
      </Button>
    </nav>
  );
}
