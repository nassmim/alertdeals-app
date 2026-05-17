import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TAdWithRelations } from '@/services/ad.service';
import {
  Calendar,
  Car,
  ExternalLink,
  Gauge,
  MapPin,
  Phone,
  Settings,
  Tag,
  Zap,
} from 'lucide-react';

type Props = {
  ad: TAdWithRelations;
};

const eurosFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const kmFormatter = new Intl.NumberFormat('fr-FR');

const DESCRIPTION_MAX_LENGTH = 200;

export function VehicleCard({ ad }: Props) {
  const medianPrice =
    ad.priceMin != null && ad.priceMax != null ? (ad.priceMin + ad.priceMax) / 2 : null;

  const marginAmountRange = formatEuroRange(ad.marginAmountMin, ad.marginAmountMax);
  const marginPercentRange = formatPercentRange(ad.marginPercentageMin, ad.marginPercentageMax);

  const description = ad.description
    ? ad.description.length > DESCRIPTION_MAX_LENGTH
      ? `${ad.description.slice(0, DESCRIPTION_MAX_LENGTH)}…`
      : ad.description
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ad.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {ad.picture && (
          <img
            src={ad.picture}
            alt={ad.title}
            className="aspect-video w-full rounded-md object-cover"
          />
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
          <Phone className="size-4" />
          <span>{ad.phoneNumber ?? 'Numéro non renseigné'}</span>
        </div>

        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <Button asChild>
          <a href={ad.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Voir sur LeBonCoin
          </a>
        </Button>
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
  if (min != null && max != null) return `Entre ${min}% et ${max}%`;
  if (min != null) return `≥ ${min}%`;
  return `≤ ${max}%`;
}
