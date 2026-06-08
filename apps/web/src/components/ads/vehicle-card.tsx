import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pages } from '@/config/routes';
import type { TAdWithRelations } from '@/services/ad.service';
import {
  Calendar,
  CalendarClock,
  Car,
  Eye,
  ExternalLink,
  Gauge,
  ImageOff,
  Lock,
  MapPin,
  Phone,
  Repeat,
  Settings,
  Tag,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

type Props = {
  ad: TAdWithRelations;
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
  month: 'long',
  year: 'numeric',
});

const DESCRIPTION_MAX_LENGTH = 200;

export function VehicleCard({ ad, isLocked = false }: Props) {
  const medianPrice =
    ad.priceMin != null && ad.priceMax != null ? (ad.priceMin + ad.priceMax) / 2 : null;

  const marginAmountRange = formatEuroRange(ad.marginAmountMin, ad.marginAmountMax);
  const marginPercentRange = formatPercentRange(ad.marginPercentageMin, ad.marginPercentageMax);

  const description = ad.description
    ? ad.description.length > DESCRIPTION_MAX_LENGTH
      ? `${ad.description.slice(0, DESCRIPTION_MAX_LENGTH)}…`
      : ad.description
    : null;

  if (isLocked) {
    return (
      <Card className="relative h-full overflow-hidden">
        <div className="pointer-events-none select-none blur-sm">
          <CardHeader>
            <CardTitle className="truncate" title={ad.title}>{ad.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ad.picture && (
              <img
                src={ad.picture}
                alt=""
                className="aspect-video w-full rounded-md object-cover"
              />
            )}
            <div className="space-y-1 text-sm">
              <div>Prix annonce : {eurosFormatter.format(ad.price)}</div>
              {medianPrice != null && (
                <div>Prix marché médian : {eurosFormatter.format(medianPrice)}</div>
              )}
            </div>
          </CardContent>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center backdrop-blur-sm">
          <Lock className="size-8" />
          <p className="text-sm font-medium">Annonce réservée aux abonnés</p>
          <Button asChild size="sm">
            <Link href={pages.subscription}>S'abonner</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="overflow-hidden">
        <div className="flex min-h-7 items-center justify-between gap-2 overflow-hidden">
          <CardTitle className="min-w-0 truncate" title={ad.title}>{ad.title}</CardTitle>
          {ad.hasBeenReposted && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Repeat className="size-3" />
              Republiée
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-4">
        {ad.picture ? (
          <img
            src={ad.picture}
            alt={ad.title}
            className="aspect-video w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}

        <section className="space-y-1 text-sm">
          <h3 className="font-semibold">Analyse</h3>
          <div>Prix annonce : {eurosFormatter.format(ad.price)}</div>
          {medianPrice != null && <div>Prix marché médian : {eurosFormatter.format(medianPrice)}</div>}
          {marginAmountRange && <div>Marge potentielle (EUR) : {marginAmountRange}</div>}
          {marginPercentRange && <div>Marge potentielle (%) : {marginPercentRange}</div>}
        </section>

        <section className="space-y-1 text-sm">
          <h3 className="font-semibold">Caractéristiques</h3>
          {ad.brand?.name && (
            <div className="flex items-center gap-2">
              <Tag className="size-4" />
              <span>Marque : {ad.brand.name}</span>
            </div>
          )}
          {ad.vehicleModel?.name && (
            <div className="flex items-center gap-2">
              <Car className="size-4" />
              <span>Modèle : {ad.vehicleModel.name}</span>
            </div>
          )}
          {ad.modelYear != null && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4" />
              <span>Année : {ad.modelYear}</span>
            </div>
          )}
          {ad.mileage != null && (
            <div className="flex items-center gap-2">
              <Gauge className="size-4" />
              <span>Kilométrage : {kmFormatter.format(ad.mileage)} km</span>
            </div>
          )}
          {ad.gearBox?.name && (
            <div className="flex items-center gap-2">
              <Settings className="size-4" />
              <span>Boîte de vitesse : {ad.gearBox.name}</span>
            </div>
          )}
          {ad.dinPower != null && (
            <div className="flex items-center gap-2">
              <Zap className="size-4" />
              <span>Puissance DIN : {ad.dinPower} ch</span>
            </div>
          )}
        </section>

        {ad.location?.name && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4" />
            <span>
              {ad.location.name}
              {ad.location.region ? ` · ${ad.location.region}` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4" />
          <span>Publié le {dateFormatter.format(new Date(ad.lastPublicationDate))}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4" />
          <span>{ad.phoneNumber ?? 'Numéro non renseigné'}</span>
        </div>

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        {/*
          Deux actions au bas de la carte, empilées verticalement :
          - "Voir détails" (primaire) → page interne avec toutes les infos
          - "Voir sur LeBonCoin" (outline) → annonce d'origine, nouvel onglet
          On stack volontairement (pas de flex-row) parce que dans une grille
          3 colonnes, les cartes sont étroites : côte à côte, "Voir sur
          LeBonCoin" wrappe sur 2 lignes et "Voir détails" reste sur 1 →
          hauteurs différentes, alignement décalé. L'empilement est uniforme.
        */}
        <div className="mt-auto flex flex-col gap-2">
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
      </CardContent>
    </Card>
  );
}

function formatEuroRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `Entre ${eurosFormatter.format(min)} et ${eurosFormatter.format(max)}`;
  if (min != null) return `≥ ${eurosFormatter.format(min)}`;
  return `≤ ${eurosFormatter.format(max!)}`;
}

function formatPercentRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  // Le worker stocke la marge sous forme de fraction pas en pourcentage. On convertit donc ici en %
  // affichable et on arrondit pour éviter des valeurs du type "14.999%".
  const toPercent = (v: number) => Math.round(v * 100);
  if (min != null && max != null)
    return `Entre ${toPercent(min)}% et ${toPercent(max)}%`;
  if (min != null) return `≥ ${toPercent(min)}%`;
  return `≤ ${toPercent(max!)}%`;
}
