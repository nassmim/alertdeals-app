'use client';

import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type TMultiSelectOption = {
  id: number;
  name: string;
};

// Au-delà de ce nombre de sélections, le trigger affiche un compteur
// ("{x} marques choisies") au lieu de la liste des noms. En dessous, on
// montre les noms : l'utilisateur garde la lisibilité sans casser la
// hauteur fixe du champ (cf. décision UX : pas de variation de hauteur).
const INLINE_NAMES_LIMIT = 5;

type Props = {
  options: TMultiSelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Cap dropdown results to avoid rendering thousands of options at once. */
  maxVisible?: number;
  /**
   * Nom au pluriel pour le compteur au-delà de INLINE_NAMES_LIMIT
   * (ex: "marques choisies", "modèles choisis").
   */
  countLabel?: string;
};

export function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat',
  disabled = false,
  maxVisible = 50,
  countLabel = 'sélectionnés',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = search
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Noms des éléments sélectionnés, dans l'ordre de sélection. Sert à
  // composer le libellé du trigger (noms ou compteur selon le seuil).
  const selectedNames = selectedIds
    .map((id) => options.find((o) => o.id === id)?.name)
    .filter((name): name is string => name != null);

  const triggerLabel =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length <= INLINE_NAMES_LIMIT
        ? selectedNames.join(', ')
        : `${selectedNames.length} ${countLabel}`;

  const hasSelection = selectedIds.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
            'hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          )}
        >
          {/* Partie gauche : icône + libellé tronqué. `min-w-0` permet au
              `truncate` de fonctionner dans un flex (sinon le texte déborde). */}
          <span
            className={cn(
              'flex min-w-0 items-center gap-2',
              hasSelection ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{triggerLabel}</span>
          </span>

          {/* Partie droite : "tout supprimer" (si sélection) puis chevron.
              `span role=button` et non `<button>` car on est déjà dans un
              <button> (HTML interdit l'imbrication). stopPropagation pour ne
              pas ouvrir le dropdown en vidant la sélection. */}
          <span className="flex shrink-0 items-center gap-1">
            {hasSelection && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Tout supprimer"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
                className="rounded-sm text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="size-4" />
              </span>
            )}
            <ChevronDown className="size-4 text-muted-foreground" />
          </span>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-ring bg-transparent py-1 pl-9 pr-3 text-sm shadow-xs outline-none ring-[3px] ring-ring/50"
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-input bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ul className="max-h-[220px] overflow-y-auto py-1 [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              {filtered.slice(0, maxVisible).map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <li
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                      // Élément sélectionné : fond plus foncé + petit "x" à
                      // gauche pour signaler qu'un clic le retire.
                      isSelected && 'bg-accent font-medium',
                    )}
                  >
                    {isSelected && (
                      <X className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    {option.name}
                  </li>
                );
              })}
              {filtered.length > maxVisible && (
                <li className="px-3 py-1.5 text-xs text-muted-foreground">
                  {filtered.length - maxVisible} résultats supplémentaires masqués — affinez la recherche.
                </li>
              )}
            </ul>
          )}

          {/* "Tout supprimer" accessible pendant la sélection (le trigger,
              et donc son "x", est masqué tant que le dropdown est ouvert). */}
          {hasSelection && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <X className="size-3.5" />
              Tout supprimer ({selectedIds.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
