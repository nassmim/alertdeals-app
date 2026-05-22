import { Button } from '@/components/ui/button';
import { pages } from '@/config/routes';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Props = {
  page: number;
  totalPages: number;
};

export function HotDealsPagination({ page, totalPages }: Props) {
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
          <Link href={`${pages.hotDeals}?page=${page - 1}`}>
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
          <Link href={`${pages.hotDeals}?page=${page + 1}`}>
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
