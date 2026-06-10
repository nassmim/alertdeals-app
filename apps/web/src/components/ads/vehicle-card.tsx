import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pages } from '@/config/routes';
import { cn } from '@/lib/utils';
import type { TAdWithRelations } from '@/services/ad.service';
import { EHotDealsLayout } from '@/validation-schemas';
import {
  CalendarClock,
  ExternalLink,
  Eye,
  Fuel,
  Gauge,
  Lock,
  MapPin,
  Repeat,
  Settings,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

type Props = {
  ad: TAdWithRelations;
  layout: EHotDealsLayout;
  isLocked?: boolean;
};

const eurosFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const kmFormatter = new Intl.NumberFormat('fr-FR');

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

// Carte annonce avec deux variantes de layout :
// - GRID (défaut historique) : carte verticale dans une grille 2-3 colonnes
// - ROW (nouvelle) : carte horizontale pleine largeur, façon Pistoneo,
//   avec image à gauche, contenu au centre, bloc prix + actions à droite.
//
// Le `layout` est piloté par l'URL (`?layout=row`) → le parent passe la
// valeur ici. Locked variant (paywall) supportée pour les deux layouts.
//
// Design priorities (validé par le boss) :
//   1. Le prix + la marge doivent EXPLOSER visuellement (XL bold violet
//      pour le prix → couleur primaire du thème, emerald pour la marge =
//      sémantique "profit").
//   2. Certaines specs deviennent des badges (état véhicule, jours en
//      ligne) plutôt que des lignes texte plates.
//   3. Le reste (kilométrage, carburant, puissance, lieu) reste en gris
//      discret pour ne pas concurrencer le bloc prix.
export function VehicleCard({ ad, layout, isLocked = false }: Props) {
  if (isLocked) {
    return layout === EHotDealsLayout.ROW ? (
      <LockedRow ad={ad} />
    ) : (
      <LockedGrid ad={ad} />
    );
  }
  return layout === EHotDealsLayout.ROW ? (
    <VehicleCardRow ad={ad} />
  ) : (
    <VehicleCardGrid ad={ad} />
  );
}

// ────────────────────────────────────────────────────────────────────────────
//                                  GRID
// ────────────────────────────────────────────────────────────────────────────

// Variante grille (historique revisitée). Carte verticale, image en haut
// avec badge source en overlay, contenu compact, bloc prix avant les CTAs.
function VehicleCardGrid({ ad }: { ad: TAdWithRelations }) {
  return (
    <Card className="h-full overflow-hidden p-0">
      <div className="flex h-full flex-col">
        {/* Image + overlays. La carte n'a plus de CardHeader : on attaque
            direct par l'image pour donner du poids visuel à la photo,
            comme sur les sites de petites annonces pro. */}
        <CardImage ad={ad} aspect="aspect-video" />

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          {/* Titre tronqué : le détail complet est sur la page interne. */}
          <h3
            className="line-clamp-2 text-base font-semibold leading-snug"
            title={ad.title}
          >
            {ad.title}
          </h3>

          {/* Bloc prix + marge — l'élément clé de la carte. */}
          <PriceBlock ad={ad} />

          {/* Specs inline (année · km · carburant · puissance). */}
          <InlineMeta ad={ad} />

          {/* Pills secondaires (état véhicule, jours en ligne, marque…). */}
          <StatePills ad={ad} />

          {/* Lieu + date publication, taille discrète. */}
          <CardFooterMeta ad={ad} />

          {/* CTAs empilés (cf. décision : "Voir détails" + LBC outline). */}
          <CardActions ad={ad} className="mt-auto" />
        </CardContent>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//                                  ROW
// ────────────────────────────────────────────────────────────────────────────

// Variante ligne pleine largeur (Pistoneo-like). Image fixe à gauche,
// contenu central qui prend l'espace restant, bloc prix + actions à
// droite. Sur mobile on retombe sur un layout empilé pour rester lisible.
function VehicleCardRow({ ad }: { ad: TAdWithRelations }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col sm:flex-row">
        {/* Image gauche : ratio carré-ish pour densité, largeur fixe sur
            desktop pour que les cartes soient parfaitement alignées en
            colonne (côté gauche = même axe vertical entre toutes les
            annonces, facilite la comparaison à l'œil). */}
        <div className="sm:w-64 sm:shrink-0">
          <CardImage ad={ad} aspect="aspect-video sm:aspect-[4/3]" />
        </div>

        {/* Contenu central + bloc droite. Sur mobile, tout est empilé. */}
        <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:gap-6">
          <div className="flex flex-1 flex-col gap-2.5 min-w-0">
            <h3
              className="line-clamp-2 text-lg font-semibold leading-snug"
              title={ad.title}
            >
              {ad.title}
            </h3>
            <InlineMeta ad={ad} />
            <StatePills ad={ad} />
            <CardFooterMeta ad={ad} className="mt-auto" />
          </div>

          {/* Colonne droite : prix XL + marge + CTAs. Largeur min pour
              que le prix ait toujours sa place sans s'écraser. */}
          <div className="flex flex-col gap-3 sm:w-48 sm:shrink-0 sm:items-end">
            <PriceBlock ad={ad} align="right" />
            <CardActions ad={ad} className="sm:w-full" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//                          ATOMES PARTAGÉS
// ────────────────────────────────────────────────────────────────────────────

// Image + overlays (badge source top-left, badge "republiée" top-right
// si applicable). Le composant accepte un `aspect` Tailwind pour que les
// deux layouts puissent imposer leur ratio (16/9 en grille, 4/3 en row).
function CardImage({ ad, aspect }: { ad: TAdWithRelations; aspect: string }) {
  return (
    <div className={cn('relative w-full overflow-hidden bg-muted', aspect)}>
      {ad.picture ? (
        <img
          src={ad.picture}
          alt={ad.title}
          className="size-full object-cover"
        />
      ) : (
        // Placeholder neutre si l'annonce n'a pas d'image (rare mais
        // arrive avec certains scrapes). Évite un "image cassée".
        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
          Aucune image
        </div>
      )}

      {/* Badge source en overlay : marqueur visuel rapide d'où vient
          l'annonce. Emerald = "validé / source connue" (cf. design). */}
      <div className="absolute left-2 top-2">
        <Badge className="gap-1 border border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ExternalLink className="size-3" />
          LeBonCoin
        </Badge>
      </div>

      {/* Republiée : signal important côté business (= vendeur qui
          a re-poussé son annonce, possiblement parce qu'elle ne part
          pas → marge à négocier). On le met sur l'image plutôt que
          dans les pills pour qu'il saute aux yeux. */}
      {ad.hasBeenReposted && (
        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="gap-1">
            <Repeat className="size-3" />
            Republiée
          </Badge>
        </div>
      )}
    </div>
  );
}

// Bloc prix + marge. C'est LE bloc qui doit accrocher l'œil — toute la
// hiérarchie de la carte est construite autour. Prix en `text-primary`
// (violet du thème) XL bold, marge en emerald juste en dessous.
function PriceBlock({
  ad,
  align = 'left',
}: {
  ad: TAdWithRelations;
  align?: 'left' | 'right';
}) {
  const marginAmount = formatEuroRange(ad.marginAmountMin, ad.marginAmountMax);
  const marginPercent = formatPercentRange(
    ad.marginPercentageMin,
    ad.marginPercentageMax,
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        align === 'right' ? 'sm:items-end sm:text-right' : '',
      )}
    >
      <div className="text-2xl font-bold leading-tight text-primary sm:text-3xl">
        {eurosFormatter.format(ad.price)}
      </div>
      {marginAmount && (
        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Marge : {marginAmount}
        </div>
      )}
      {marginPercent && (
        <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
          {marginPercent}
        </div>
      )}
    </div>
  );
}

// Specs inline avec icônes : année · km · carburant · puissance.
// Volontairement compact (une seule ligne sur desktop, wrap si manque
// de place). Sert à donner le contexte technique en 1 coup d'œil sans
// concurrencer le bloc prix.
function InlineMeta({ ad }: { ad: TAdWithRelations }) {
  const items: Array<{ icon: React.ReactNode; label: string }> = [];

  if (ad.modelYear != null) {
    items.push({ icon: <CalendarClock className="size-3.5" />, label: String(ad.modelYear) });
  }
  if (ad.mileage != null) {
    items.push({
      icon: <Gauge className="size-3.5" />,
      label: `${kmFormatter.format(ad.mileage)} km`,
    });
  }
  // Carburant en 3e (cf. inspiration : "Électrique", "Essence"…).
  // Hydraté côté service via `with: { fuel: true }`.
  if (ad.fuel?.name) {
    items.push({ icon: <Fuel className="size-3.5" />, label: ad.fuel.name });
  }
  if (ad.dinPower != null) {
    items.push({ icon: <Zap className="size-3.5" />, label: `${ad.dinPower} ch` });
  }
  // Boîte en bonus si on a la place — laissée en dernier parce que c'est
  // l'info la moins discriminante du quatuor (année/km/carburant priment).
  if (ad.gearBox?.name) {
    items.push({ icon: <Settings className="size-3.5" />, label: ad.gearBox.name });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {it.icon}
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Pills secondaires : marque, modèle, jours en ligne, stratégie de match
// (vise le prix vs marge). Tout en `variant="secondary"` pour rester
// cohérent avec le thème, sauf la stratégie qui a un code couleur
// sémantique (rouge bas-prix / vert marge).
function StatePills({ ad }: { ad: TAdWithRelations }) {
  const daysOnline = computeDaysOnline(ad.lastPublicationDate);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Stratégie : code couleur business (vert = opportunité marge,
          rouge = annonce sous le marché). */}
      {ad.isLowPrice ? (
        <Badge variant="destructive" className="gap-1">
          <TrendingDown className="size-3" />
          Vise le prix
        </Badge>
      ) : (
        <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
          <TrendingUp className="size-3" />
          Vise la marge
        </Badge>
      )}
      {ad.brand?.name && (
        <Badge variant="secondary">{ad.brand.name}</Badge>
      )}
      {ad.vehicleModel?.name && (
        <Badge variant="secondary">{ad.vehicleModel.name}</Badge>
      )}
      {daysOnline != null && (
        <Badge variant="secondary">{daysOnline} j en ligne</Badge>
      )}
      {ad.isUrgent && (
        <Badge variant="destructive">Urgent</Badge>
      )}
    </div>
  );
}

// Lieu + date de publication. Discret, en bas de la zone de contenu.
function CardFooterMeta({
  ad,
  className,
}: {
  ad: TAdWithRelations;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
    >
      {ad.location?.name && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {ad.location.name}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <CalendarClock className="size-3.5" />
        Publié le {dateFormatter.format(new Date(ad.lastPublicationDate))}
      </span>
    </div>
  );
}

// Deux CTAs empilés :
//  - "Voir détails" (primaire) → page interne avec l'analyse complète.
//  - "Voir sur LeBonCoin" (outline) → annonce d'origine, nouvel onglet.
// On stack (pas de flex-row) pour garder un alignement uniforme entre
// cartes étroites en grille (côte à côte, le label LBC wrappe et casse
// l'alignement). La page détail existe désormais sur main, on peut donc
// pointer dessus via `pages.hotDealDetails`.
function CardActions({
  ad,
  className,
}: {
  ad: TAdWithRelations;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button asChild className="w-full">
        <Link href={pages.hotDealDetails(ad.id)}>
          <Eye className="size-4" />
          Voir détails
        </Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <a href={ad.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" />
          Voir sur LeBonCoin
        </a>
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//                       LOCKED (paywall) VARIANTS
// ────────────────────────────────────────────────────────────────────────────

// Variante "verrouillée" pour les annonces au-delà du quota free.
// L'idée : on rend la même carte que la version débloquée (pour montrer
// qu'il y a bien de la valeur derrière) mais on l'overlay d'un voile
// avec CTA "S'abonner". Floutage = teaser, pas masquage total.
function LockedGrid({ ad }: { ad: TAdWithRelations }) {
  return (
    <Card className="relative h-full overflow-hidden p-0">
      <div className="pointer-events-none select-none blur-sm">
        <VehicleCardGrid ad={ad} />
      </div>
      <LockedOverlay />
    </Card>
  );
}

function LockedRow({ ad }: { ad: TAdWithRelations }) {
  return (
    <Card className="relative overflow-hidden p-0">
      <div className="pointer-events-none select-none blur-sm">
        <VehicleCardRow ad={ad} />
      </div>
      <LockedOverlay />
    </Card>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center backdrop-blur-sm">
      <Lock className="size-8" />
      <p className="text-sm font-medium">Annonce réservée aux abonnés</p>
      <Button asChild size="sm">
        <Link href={pages.subscription}>S'abonner</Link>
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//                                HELPERS
// ────────────────────────────────────────────────────────────────────────────

// Calcul du nombre de jours depuis la dernière publication. Renvoie
// `null` si la date est invalide (paranoïa de typage : la colonne est
// notNull en base, mais on garde une garde au cas où). On utilise
// `lastPublicationDate` plutôt que `initialPublicationDate` parce que
// "Xj en ligne" est compris comme "depuis la dernière mise en avant",
// pas depuis la toute première mise en ligne (cf. inspiration Pistoneo).
function computeDaysOnline(lastPublicationDate: string): number | null {
  const ts = new Date(lastPublicationDate).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatEuroRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max)
    return `${eurosFormatter.format(min)} – ${eurosFormatter.format(max)}`;
  if (min != null) return eurosFormatter.format(min);
  return eurosFormatter.format(max!);
}

function formatPercentRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  // Worker stocke des fractions (0.15 = 15%) — on convertit en % affichable.
  const toPercent = (v: number) => Math.round(v * 100);
  if (min != null && max != null && min !== max)
    return `${toPercent(min)}% – ${toPercent(max)}%`;
  if (min != null) return `${toPercent(min)}%`;
  return `${toPercent(max!)}%`;
}
