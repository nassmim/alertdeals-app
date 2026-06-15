'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type TMultiSelectOption = {
  id: number;
  name: string;
};

type Props = {
  options: TMultiSelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Cap dropdown results to avoid rendering thousands of options at once. */
  maxVisible?: number;
};

export function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat',
  disabled = false,
  maxVisible = 50,
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

  return (
    <div ref={containerRef} className="relative">
      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const option = options.find((o) => o.id === id);
            if (!option) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {option.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-sm transition-colors hover:bg-destructive/20"
                  aria-label={`Retirer ${option.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

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
          <span className="flex items-center gap-2 text-muted-foreground">
            <Search className="size-4" />
            <span>
              {selectedIds.length > 0
                ? `${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
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
            <ul className="max-h-[220px] overflow-y-auto py-1">
              {filtered.slice(0, maxVisible).map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <li
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    className={cn(
                      'cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                      isSelected && 'bg-accent/50 font-medium',
                    )}
                  >
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
        </div>
      )}
    </div>
  );
}
