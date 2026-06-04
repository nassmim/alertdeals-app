'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pages } from '@/config/routes';
import {
  DEFAULT_HOT_DEALS_SORT,
  EHotDealsSort,
  HOT_DEALS_SORT_LABELS,
} from '@/validation-schemas';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

type Props = {
  value: EHotDealsSort;
};

// Select "Trier par :" affiché à droite du titre de la liste des hot deals.
// Sur changement, on push une nouvelle URL avec `?sort=X` et on reset à page=1
// (l'utilisateur n'a aucune raison de rester sur la page 5 si l'ordre change).
// Le `useTransition` permet de griser le select pendant que la page reload.
export function HotDealsSortSelect({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const sort = next as EHotDealsSort;
    // On part de l'URL courante pour conserver les filtres actifs (brand,
    // model, etc.), on override juste `sort` et on reset `page`.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (sort === DEFAULT_HOT_DEALS_SORT) {
      // On omet `?sort=` quand on revient au tri par défaut pour garder l'URL propre.
      params.delete('sort');
    } else {
      params.set('sort', sort);
    }
    const query = params.toString();
    const href = query ? `${pages.hotDeals}?${query}` : pages.hotDeals;
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Trier par :</span>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(EHotDealsSort).map((option) => (
            <SelectItem key={option} value={option}>
              {HOT_DEALS_SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
