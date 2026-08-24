import { DealBadge } from "@/components/ads/deal-badge";
import { MarginCallout } from "@/components/ads/margin-callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pages } from "@/config/routes";
import { cn } from "@/lib/utils";
import type { TAdWithRelations } from "@/services/ad.service";
import { getMarginPresentation } from "@/utils/margin.utils";
import { getAdSourceLabel } from "@alertdeals/shared";
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
  Zap,
} from "lucide-react";
import Link from "next/link";

type Props = {
  ad: TAdWithRelations;
  isLocked?: boolean;
};

const eurosFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const kmFormatter = new Intl.NumberFormat("fr-FR");

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Carte annonce en grille (carte verticale dans une grille 2-3 colonnes).
// Variante "locked" (paywall) pour les annonces au-delà du quota free.
//
// Design priorities (validé par le boss) :
//   1. Le prix + la marge doivent EXPLOSER visuellement (XL bold violet
//      pour le prix → couleur primaire du thème, emerald pour la marge =
//      sémantique "profit").
//   2. Certaines specs deviennent des badges (état véhicule, jours en
//      ligne) plutôt que des lignes texte plates.
//   3. Le reste (kilométrage, carburant, puissance, lieu) reste en gris
//      discret pour ne pas concurrencer le bloc prix.
export function VehicleCard({ ad, isLocked = false }: Props) {
  if (isLocked) return <LockedGrid ad={ad} />;
  return <VehicleCardGrid ad={ad} />;
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
        <CardImage ad={ad} />

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
//                          ATOMES PARTAGÉS
// ────────────────────────────────────────────────────────────────────────────

// Image + overlays (badge source top-left, badge "republiée" top-right
// si applicable). Ratio 16/9 fixe pour aligner toutes les cartes de la grille.
function CardImage({ ad }: { ad: TAdWithRelations }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
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
          {getAdSourceLabel(ad.source)}
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
// (violet du thème) XL bold, puis l'encart marge partagé (MarginCallout)
// dont la couleur dépend du signe des bornes (rouge/ambre/vert).
function PriceBlock({ ad }: { ad: TAdWithRelations }) {
  const margin = getMarginPresentation(ad);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-bold leading-tight text-primary sm:text-3xl">
        {eurosFormatter.format(ad.price)}
      </div>
      {margin && <MarginCallout presentation={margin} />}
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
    items.push({
      icon: <CalendarClock className="size-3.5" />,
      label: String(ad.modelYear),
    });
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
    items.push({
      icon: <Zap className="size-3.5" />,
      label: `${ad.dinPower} ch`,
    });
  }
  // Boîte en bonus si on a la place — laissée en dernier parce que c'est
  // l'info la moins discriminante du quatuor (année/km/carburant priment).
  if (ad.gearBox?.name) {
    items.push({
      icon: <Settings className="size-3.5" />,
      label: ad.gearBox.name,
    });
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

// Pills secondaires : qualité d'affaire, marque, modèle, jours en ligne.
// Tout en `variant="secondary"` pour rester cohérent avec le thème, sauf
// le badge qualité d'affaire (DealBadge) qui garde son code couleur
// business (ambre = top deal, vert = bonne affaire), repris d'auto-prospect.
function StatePills({ ad }: { ad: TAdWithRelations }) {
  const daysOnline = computeDaysOnline(ad.lastPublicationDate);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Qualité d'affaire : "Très bonne affaire" / "Bonne affaire" selon
          `goodDealName` (calculé par le worker). Ne s'affiche que si l'annonce
          est qualifiée comme une affaire. */}
      <DealBadge goodDealName={ad.goodDealName} variant="compact" />
      {ad.brand?.name && <Badge variant="secondary">{ad.brand.name}</Badge>}
      {ad.vehicleModel?.name && (
        <Badge variant="secondary">{ad.vehicleModel.name}</Badge>
      )}
      {daysOnline != null && (
        <Badge variant="secondary">{daysOnline} j en ligne</Badge>
      )}
      {ad.isUrgent && <Badge variant="destructive">Urgent</Badge>}
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
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
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
//  - "Voir sur <plateforme>" (outline) → annonce d'origine, nouvel onglet.
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
    <div className={cn("flex flex-col gap-2", className)}>
      <Button asChild className="w-full">
        <Link href={pages.hotDealDetails(ad.id)}>
          <Eye className="size-4" />
          Voir détails
        </Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <a href={ad.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" />
          Voir sur {getAdSourceLabel(ad.source)}
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
