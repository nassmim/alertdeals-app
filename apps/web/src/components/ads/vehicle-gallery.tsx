"use client";

import { useState } from "react";

type Props = {
  // Liste d'images déjà dédoublonnée par le parent (image principale en tête).
  images: string[];
  alt: string;
};

// Galerie interactive : l'image active est affichée en grand, et cliquer
// sur une miniature la met en avant. Composant client car il porte un état
// local (index sélectionné) — le reste de la fiche reste server component.
export function VehicleGallery({ images, alt }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-sm">
        <img
          src={images[activeIndex]}
          alt={alt}
          className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.02]"
        />
        {images.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {images.map((src, i) => (
            <button
              type="button"
              key={`${src}-${i}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`Afficher la vue ${i + 1}`}
              aria-current={i === activeIndex}
              className={`overflow-hidden rounded-lg border bg-muted shadow-sm transition ${
                i === activeIndex
                  ? "ring-2 ring-primary ring-offset-1"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              <img
                src={src}
                alt={`${alt} — vue ${i + 1}`}
                className="aspect-square w-full object-cover transition duration-300 hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
