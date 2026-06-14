import { PriceAnalysisButton } from '@/components/ads/price-analysis/price-analysis-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pages } from '@/config/routes';
import type { TAdWithFullRelations } from '@/services/ad.service';
import {
  ArrowLeft,
  Award,
  Calendar,
  CalendarClock,
  Car,
  ExternalLink,
  Fuel,
  Gauge,
  IdCard,
  LineChart,
  MapPin,
  Phone,
  Repeat,
  Rocket,
  Settings,
  Tag,
  TagsIcon,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

type Props = {
  ad: TAdWithFullRelations;
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

// Page détail "fiche d'analyse" : titre en chapeau, galerie à gauche,
// bloc analyse + CTAs sticky à droite, caractéristiques + équipements +
// contact en dessous. Inspiré directement de la maquette validée :
// la colonne droite est le centre de décision (prix / marge / actions),
// la galerie + spécifications sont du contenu narratif.
export function VehicleDetails({ ad }: Props) {
  const medianPrice =
    ad.priceMin != null && ad.priceMax != null
      ? (ad.priceMin + ad.priceMax) / 2
      : null;

  const marginAmountRange = formatEuroRange(
    ad.marginAmountMin,
    ad.marginAmountMax,
  );
  const marginPercentRange = formatPercentRange(
    ad.marginPercentageMin,
    ad.marginPercentageMax,
  );

  const priceRange =
    ad.priceMin != null && ad.priceMax != null && ad.priceMin !== ad.priceMax
      ? `${eurosFormatter.format(ad.priceMin)} – ${eurosFormatter.format(ad.priceMax)}`
      : null;

  // Galerie : on dédoublonne `picture` (image principale) au cas où elle
  // figure aussi dans `pictures`. Si tout est null on renvoie [].
  const gallery = buildGallery(ad.picture, ad.pictures);

  return (
    // Fond subtilement dégradé pour donner de la profondeur sans peser
    // visuellement (cf. décision design).
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Barre du haut : retour aux annonces uniquement. Le CTA "Analyse
            avancée" est désormais dans la colonne droite, là où l'oeil
            s'attend à trouver l'action principale. */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={pages.hotDeals}>
              <ArrowLeft className="size-4" />
              Retour aux annonces
            </Link>
          </Button>
        </div>

        {/*
          Bloc héro full-width : gros titre puis ligne de badges qui posent
          le contexte (source d'origine, catégorie, et stratégie de match).
          Le titre est en `uppercase` + tracking serré comme sur la maquette
          pour donner un look "fiche véhicule pro".
        */}
        <div className="mb-6 space-y-3 sm:mb-8">
          <h1 className="text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">
            {ad.title}
          </h1>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Source : alertdeals scrape exclusivement LeBonCoin pour le
                moment, mais on rend ce badge explicite pour la cohérence
                avec la maquette (et au cas où d'autres sources arrivent). */}
            <Badge
              variant="secondary"
              className="gap-1 border border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <ExternalLink className="size-3" />
              Source : LeBonCoin
            </Badge>

            {/* Catégorie LBC (type + sous-type). */}
            {ad.type?.name && (
              <Badge variant="secondary" className="gap-1">
                <Car className="size-3" />
                {ad.type.name}
              </Badge>
            )}
            {ad.subtype?.name && (
              <Badge variant="secondary">{ad.subtype.name}</Badge>
            )}

            {/*
              Stratégie : "Vise le prix" si l'ad est marquée low-price par
              le worker, sinon "Vise la marge" par défaut. Code couleur :
              vert = opportunité de marge, rouge = annonce à bas prix.
            */}
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
            {ad.hasBeenReposted && (
              <Badge variant="secondary" className="gap-1">
                <Repeat className="size-3" />
                Republiée
              </Badge>
            )}
            {ad.isUrgent && (
              <Badge variant="destructive" className="gap-1">
                Urgent
              </Badge>
            )}
            {ad.priceHasDropped && (
              <Badge variant="secondary" className="gap-1">
                <TrendingDown className="size-3" />
                Prix en baisse
              </Badge>
            )}
            {ad.hasBeenBoosted && (
              <Badge variant="secondary" className="gap-1">
                <Rocket className="size-3" />
                Boostée
              </Badge>
            )}
            {ad.goodDealName && (
              <Badge variant="secondary" className="gap-1">
                <Award className="size-3" />
                {ad.goodDealName}
              </Badge>
            )}
          </div>

          {/* Méta-infos discrètes sous les badges : lieu + dates. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {ad.location?.name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {ad.location.name}
                {ad.location.zipcode ? ` (${ad.location.zipcode})` : ''}
                {ad.location.region ? ` · ${ad.location.region}` : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" />
              Publiée le {dateFormatter.format(new Date(ad.lastPublicationDate))}
            </span>
            {ad.initialPublicationDate &&
              ad.initialPublicationDate !== ad.lastPublicationDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  En ligne depuis le{' '}
                  {dateFormatter.format(new Date(ad.initialPublicationDate))}
                </span>
              )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* COLONNE GAUCHE : galerie + description + caractéristiques + équipements + contact */}
          <div className="space-y-6">
            {/*
              Galerie : image principale en grand avec un compteur "1 / N"
              en overlay haut-droite (façon site marchand). Pas de carrousel
              interactif pour rester en server component — c'est l'image
              principale qu'on veut mettre en avant, les autres sont
              accessibles via les miniatures.
            */}
            {gallery.length > 0 && (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-sm">
                  <img
                    src={gallery[0]}
                    alt={ad.title}
                    className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.02]"
                  />
                  {gallery.length > 1 && (
                    <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      1 / {gallery.length}
                    </div>
                  )}
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                    {gallery.slice(1, 9).map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="overflow-hidden rounded-lg border bg-muted shadow-sm"
                      >
                        <img
                          src={src}
                          alt={`${ad.title} — vue ${i + 2}`}
                          className="aspect-square w-full object-cover transition duration-300 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description complète, non tronquée. */}
            {ad.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {ad.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/*
              Caractéristiques : grille de tuiles "plates" (sans bordure
              par tuile) — l'icône (en gris) coiffe la valeur (en bold) avec
              un petit label dessus. Donne un look fiche véhicule comme sur
              la maquette, plus propre qu'une cascade de bordures.
            */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                  {ad.brand?.name && (
                    <FlatSpec
                      icon={<Tag className="size-4" />}
                      label="Marque"
                      value={ad.brand.name}
                    />
                  )}
                  {ad.vehicleModel?.name && (
                    <FlatSpec
                      icon={<TagsIcon className="size-4" />}
                      label="Modèle"
                      value={ad.vehicleModel.name}
                    />
                  )}
                  {ad.modelYear != null && (
                    <FlatSpec
                      icon={<Calendar className="size-4" />}
                      label="Année modèle"
                      value={ad.modelYear}
                    />
                  )}
                  {ad.entryYear != null && (
                    <FlatSpec
                      icon={<Calendar className="size-4" />}
                      label="1ère immatriculation"
                      value={ad.entryYear}
                    />
                  )}
                  {ad.mileage != null && (
                    <FlatSpec
                      icon={<Gauge className="size-4" />}
                      label="Kilométrage"
                      value={`${kmFormatter.format(ad.mileage)} km`}
                    />
                  )}
                  {ad.fuel?.name && (
                    <FlatSpec
                      icon={<Fuel className="size-4" />}
                      label="Carburant"
                      value={ad.fuel.name}
                    />
                  )}
                  {ad.gearBox?.name && (
                    <FlatSpec
                      icon={<Settings className="size-4" />}
                      label="Boîte de vitesse"
                      value={ad.gearBox.name}
                    />
                  )}
                  {ad.dinPower != null && (
                    <FlatSpec
                      icon={<Zap className="size-4" />}
                      label="Puissance DIN"
                      value={`${ad.dinPower} ch`}
                    />
                  )}
                  {ad.vehicleState?.name && (
                    <FlatSpec
                      icon={<Settings className="size-4" />}
                      label="État"
                      value={ad.vehicleState.name}
                    />
                  )}
                  {ad.vehicleSeats?.name && (
                    <FlatSpec
                      icon={<Users className="size-4" />}
                      label="Places"
                      value={ad.vehicleSeats.name}
                    />
                  )}
                  {ad.drivingLicence?.name && (
                    <FlatSpec
                      icon={<IdCard className="size-4" />}
                      label="Permis"
                      value={ad.drivingLicence.name}
                    />
                  )}
                  {ad.technicalInspectionYear != null && (
                    <FlatSpec
                      icon={<CalendarClock className="size-4" />}
                      label="Contrôle technique"
                      value={ad.technicalInspectionYear}
                    />
                  )}
                  {ad.marketPosition?.name && (
                    <FlatSpec
                      icon={<LineChart className="size-4" />}
                      label="Position marché"
                      value={ad.marketPosition.name}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Équipements + spécifications complémentaires si présents. */}
            {(ad.equipments || ad.otherSpecifications) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Équipements & spécifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {ad.equipments && (
                    <div>
                      <h4 className="mb-1 font-medium">Équipements</h4>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {ad.equipments}
                      </p>
                    </div>
                  )}
                  {ad.otherSpecifications && (
                    <div>
                      <h4 className="mb-1 font-medium">Autres spécifications</h4>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {ad.otherSpecifications}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact : déplacé en bas de la colonne gauche pour libérer la
                colonne droite, dédiée aux actions (analyse + CTAs). */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <ContactRow icon={<Phone className="size-4" />} label="Téléphone">
                  {ad.phoneNumber ?? 'Non renseigné'}
                </ContactRow>
                {ad.ownerName && (
                  <ContactRow icon={<Users className="size-4" />} label="Vendeur">
                    {ad.ownerName}
                  </ContactRow>
                )}
              </CardContent>
            </Card>
          </div>

          {/*
            COLONNE DROITE : analyse + CTAs, sticky pour rester visibles
            quand l'utilisateur scrolle la galerie et la description.
            Card standard du thème (pas de teinte ad hoc) — la mise en
            avant vient de la ligne "Marge" surlignée en interne.
          */}
          <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyse de l'annonce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/*
                  Lignes paramètre / valeur, alignées à droite façon fiche
                  comptable. Les deux lignes "Marge" sont mises en
                  surbrillance verte parce qu'elles portent la valeur
                  business — c'est elles qui justifient de cliquer.
                */}
                <AnalyseRow
                  label="Prix annonce"
                  value={eurosFormatter.format(ad.price)}
                />
                {medianPrice != null && (
                  <AnalyseRow
                    label="Prix marché médian"
                    value={eurosFormatter.format(medianPrice)}
                  />
                )}
                {priceRange && (
                  <AnalyseRow label="Fourchette marché" value={priceRange} />
                )}
                {marginAmountRange && (
                  <AnalyseRow
                    label="Marge potentielle"
                    value={marginAmountRange}
                    highlight
                  />
                )}
                {marginPercentRange && (
                  <AnalyseRow
                    label="% de marge"
                    value={marginPercentRange}
                    highlight
                  />
                )}
              </CardContent>
            </Card>

            {/*
              CTAs empilés sous la card analyse. Primaire = analyse tarifaire
              avancée (ouvre la modale), outline = sortie vers LeBonCoin.
            */}
            <div className="space-y-2">
              <PriceAnalysisButton adId={ad.id} />
              <Button asChild variant="outline" className="w-full" size="lg">
                <a href={ad.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Voir sur LeBonCoin
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tuile spec "plate" : icône en gris, label en muted small, valeur en
// bold dessous. Pas de bordure ni fond — l'aération vient des gaps de
// la grille parente. Match la maquette "fiche véhicule".
function FlatSpec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}

// Ligne de la card "Analyse" : label à gauche (muted), valeur à droite
// (bold). Quand `highlight` est vrai, on encadre dans une bande verte
// pour signaler que la valeur porte la décision (marge potentielle).
function AnalyseRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <span className="font-medium text-emerald-800 dark:text-emerald-300">
          {label}
        </span>
        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
          {value}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-2.5 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Bloc icône + label + valeur, version "contact" (label dessus, valeur
// dessous, plus textuel que les FlatSpec).
function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </div>
  );
}

// Construit la liste finale d'images : image principale en tête, puis
// les images additionnelles, sans doublons. Si tout est null on renvoie [].
function buildGallery(picture: string | null, pictures: string[] | null): string[] {
  const all: string[] = [];
  if (picture) all.push(picture);
  if (pictures) {
    for (const p of pictures) {
      if (p && !all.includes(p)) all.push(p);
    }
  }
  return all;
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
