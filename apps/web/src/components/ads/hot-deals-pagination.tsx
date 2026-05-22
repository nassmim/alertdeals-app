import { Button } from '@/components/ui/button';
import { pages } from '@/config/routes';
import { DEFAULT_HOT_DEALS_SORT, type EHotDealsSort } from '@/validation-schemas';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Props = {
  page: number;
  totalPages: number;
  sort: EHotDealsSort;
};

// Construit l'URL d'une page de la liste en conservant le tri courant (`?sort=`).
// Si le tri est celui par défaut, on omet le param pour garder l'URL propre.
function buildPageHref(targetPage: number, sort: EHotDealsSort): string {
  const params = new URLSearchParams();
  params.set('page', String(targetPage));
  if (sort !== DEFAULT_HOT_DEALS_SORT) params.set('sort', sort);
  return `${pages.hotDeals}?${params.toString()}`;
}

export function HotDealsPagination({ page, totalPages, sort }: Props) {
  if (totalPages <= 1) return null;

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
          <Link href={buildPageHref(page - 1, sort)}>
            <ChevronLeft className="size-4" />
            Précédent
          </Link>
        ) : (
          <span>
            <ChevronLeft className="size-4" />
            Précédent
          </span>
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
          <Link href={buildPageHref(page + 1, sort)}>
            Suivant
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span>
            Suivant
            <ChevronRight className="size-4" />
          </span>
        )}
      </Button>
    </nav>
  );
}
