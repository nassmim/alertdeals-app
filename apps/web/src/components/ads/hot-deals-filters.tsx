'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPTY_HOT_DEALS_FILTERS,
  HOT_DEALS_FILTER_PARAMS,
  hasAnyHotDealsFilter,
  THotDealsFilters,
} from '@/validation-schemas';
import type { TBrand, TVehicleModel, TVehicleState } from '@alertdeals/db';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

// Représentation minimale d'une alerte pour le filtre. La page passe seulement
// id/name pour éviter d'envoyer toute l'alerte (location, channels, etc.) au client.
export type THotDealsFilterAlert = { id: string; name: string | null };

type Props = {
  // Valeurs initiales reconstruites depuis l'URL côté serveur. Sert d'initial
  // state du form local et de point de re-sync quand l'URL change (back/forward).
  initialFilters: THotDealsFilters;
  alerts: THotDealsFilterAlert[];
  brands: TBrand[];
  vehicleModels: TVehicleModel[];
  vehicleStates: TVehicleState[];
};

// Sentinelle pour "toutes les alertes" — le <Select> shadcn n'accepte pas
// `value=""`, donc on utilise une string réservée qu'on convertit en null.
const ALL_ALERTS_VALUE = '__all__';

export function HotDealsFilters({
  initialFilters,
  alerts,
  brands,
  vehicleModels,
  vehicleStates,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Panneau replié par défaut. L'user clique sur "Filtrer" pour l'ouvrir.
  const [isOpen, setIsOpen] = useState(false);

  // State local du form, séparé de l'URL : tant que l'user n'a pas validé,
  // ses modifs ne sont pas appliquées (cf. ticket : bouton "Valider" explicite).
  const [draft, setDraft] = useState<THotDealsFilters>(initialFilters);

  // Si l'URL change ailleurs (back/forward navigateur, ou clic sur un lien
  // de pagination/tri qui préserve les filtres), on resync le draft pour ne
  // pas afficher une version désynchronisée à la prochaine ouverture du panneau.
  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters]);

  // Modèles affichables = ceux dont la marque est dans la sélection locale.
  // Tant qu'aucune marque n'est cochée, on renvoie [] → le <MultiSelect>
  // se désactive automatiquement via son prop `disabled`.
  const availableModels = useMemo(() => {
    if (draft.brandIds.length === 0) return [];
    return vehicleModels.filter((m) => draft.brandIds.includes(m.brandId));
  }, [draft.brandIds, vehicleModels]);

  // Quand l'user change ses marques, on doit retirer les modèles devenus
  // orphelins (ex : il a coché "Peugeot 208" puis retire Peugeot → 208 part).
  const handleBrandChange = (ids: number[]) => {
    setDraft((prev) => ({
      ...prev,
      brandIds: ids,
      modelIds: prev.modelIds.filter((modelId) => {
        const model = vehicleModels.find((m) => m.id === modelId);
        return model != null && ids.includes(model.brandId);
      }),
    }));
  };

  // "Valider" → on construit la nouvelle URL à partir du draft, on push,
  // on referme le panneau. Le `page` est volontairement dropped pour repartir
  // à la page 1 (autrement l'user pourrait être sur p.5 d'un résultat à 2 pages).
  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    // On wipe les anciens params filtres avant de réinjecter ceux du draft,
    // sinon un filtre désélectionné resterait dans l'URL.
    for (const key of Object.values(HOT_DEALS_FILTER_PARAMS)) {
      params.delete(key);
    }
    params.delete('page');

    if (draft.alertId) params.set(HOT_DEALS_FILTER_PARAMS.alert, draft.alertId);
    if (draft.brandIds.length > 0)
      params.set(HOT_DEALS_FILTER_PARAMS.brand, draft.brandIds.join(','));
    if (draft.modelIds.length > 0)
      params.set(HOT_DEALS_FILTER_PARAMS.model, draft.modelIds.join(','));
    if (draft.vehicleStateIds.length > 0)
      params.set(
        HOT_DEALS_FILTER_PARAMS.vehicleState,
        draft.vehicleStateIds.join(','),
      );
    if (draft.hasPhone) params.set(HOT_DEALS_FILTER_PARAMS.hasPhone, 'true');

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setIsOpen(false);
    });
  };

  // "Réinitialiser" → vide le draft ET applique l'URL sans filtres (ticket :
  // "remet à zéro et relance la recherche"). On préserve sort et autres params
  // non-filtres en réutilisant l'URL courante. Le panneau reste ouvert (différence
  // avec Valider) pour que l'user puisse enchaîner sur une nouvelle sélection
  // sans avoir à recliquer "Filtrer".
  const handleReset = () => {
    setDraft(EMPTY_HOT_DEALS_FILTERS);

    const params = new URLSearchParams(searchParams.toString());
    for (const key of Object.values(HOT_DEALS_FILTER_PARAMS)) {
      params.delete(key);
    }
    params.delete('page');

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  // Badge "X filtres actifs" sur la barre repliée : compte les filtres APPLIQUÉS
  // (URL), pas le draft, pour refléter ce qui filtre réellement la liste.
  const hasActiveFilters = hasAnyHotDealsFilter(initialFilters);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          Filtrer
          {hasActiveFilters && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              actifs
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Alerte</Label>
              <Select
                value={draft.alertId ?? ALL_ALERTS_VALUE}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    alertId: v === ALL_ALERTS_VALUE ? null : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les alertes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ALERTS_VALUE}>Toutes les alertes</SelectItem>
                  {alerts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name ?? 'Alerte sans nom'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Marques</Label>
              <MultiSelect
                options={brands.map((b) => ({ id: b.id, name: b.name }))}
                selectedIds={draft.brandIds}
                onChange={handleBrandChange}
                placeholder="Toutes les marques"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Modèles</Label>
              <MultiSelect
                options={availableModels.map((m) => ({ id: m.id, name: m.name }))}
                selectedIds={draft.modelIds}
                onChange={(ids) => setDraft((prev) => ({ ...prev, modelIds: ids }))}
                placeholder={
                  draft.brandIds.length === 0
                    ? 'Sélectionnez une marque'
                    : 'Tous les modèles'
                }
                disabled={draft.brandIds.length === 0}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">État du véhicule</Label>
              <MultiSelect
                options={vehicleStates.map((s) => ({ id: s.id, name: s.name }))}
                selectedIds={draft.vehicleStateIds}
                onChange={(ids) =>
                  setDraft((prev) => ({ ...prev, vehicleStateIds: ids }))
                }
                placeholder="Tous les états"
              />
            </div>

            <div className="flex items-end">
              <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
                <Checkbox
                  id="hot-deals-has-phone"
                  checked={draft.hasPhone}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, hasPhone: checked === true }))
                  }
                />
                <Label htmlFor="hot-deals-has-phone" className="cursor-pointer text-sm">
                  Avec numéro de téléphone
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={handleReset} disabled={isPending}>
              Réinitialiser
            </Button>
            <Button onClick={handleApply} disabled={isPending}>
              Valider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
