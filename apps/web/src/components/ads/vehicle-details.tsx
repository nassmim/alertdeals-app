import { AdvancedAnalysisButton } from '@/components/ads/advanced-analysis-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pages } from '@/config/routes';
import type { TAdWithFullRelations } from '@/services/ad.service';
import {
  Award,
  ArrowLeft,
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
  Sparkles,
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

// Composant serveur : on reçoit l'ad entièrement hydratée (avec relations).
// Tout l'affichage se fait côté serveur ; le seul îlot client est le bouton
// "Analyse avancée" qui doit déclencher un toast.
export function VehicleDetails({ ad }: Props) {
  const medianPrice =
    ad.priceMin != null && ad.priceMax != null
      ? (ad.priceMin + ad.priceMax) / 2
      : null;

  const marginAmountRange = formatEuroRange(ad.marginAmountMin, ad.marginAmountMax);
  const marginPercentRange = formatPercentRange(
    ad.marginPercentageMin,
    ad.marginPercentageMax,
  );

  // Galerie : on dédoublonne `picture` (image principale) au cas où elle
  // figure aussi dans `pictures`. Si `pictures` est vide/null on retombe
  // sur la seule image principale, voire rien du tout.
  const gallery = buildGallery(ad.picture, ad.pictures);

  return (
    // Fond subtilement dégradé : donne de la profondeur sans peser visuellement.
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Barre du haut : retour à gauche, action analyse à droite. */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={pages.hotDeals}>
              <ArrowLeft className="size-4" />
              Retour aux annonces
            </Link>
          </Button>
          <AdvancedAnalysisButton />
        </div>

        {/*
          Bloc héro full-width : badges en chapeau, gros titre, méta-info
          en ligne (lieu, date). Le but est de poser l'identité de l'annonce
          avant même la galerie — l'utilisateur sait tout de suite quoi
          regarder.
        */}
        <div className="mb-6 space-y-3 sm:mb-8">
          <div className="flex flex-wrap items-center gap-1.5">
            {/*
              Stratégie : "Vise le prix" (rouge) si l'ad est marquée
              low-price par le worker, sinon "Vise la marge" (vert) par
              défaut. Le code couleur doit matcher la sémantique métier :
              vert = opportunité de marge, rouge = annonce à bas prix
              (donc à shooter vite).
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
            {/* Prix en baisse : signalé par LBC quand le vendeur a baissé. */}
            {ad.priceHasDropped && (
              <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300">
                <TrendingDown className="size-3" />
                Prix en baisse
              </Badge>
            )}
            {/* Annonce sponsorisée (boost LBC). */}
            {ad.hasBeenBoosted && (
              <Badge variant="secondary" className="gap-1 bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300">
                <Rocket className="size-3" />
                Boostée
              </Badge>
            )}
            {/* Label "bonne affaire" officiel LBC (texte stocké tel quel). */}
            {ad.goodDealName && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">
                <Award className="size-3" />
                {ad.goodDealName}
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {ad.title}
          </h1>

          {/*
            Méta-infos inline : type/sous-type, lieu, dates de publication.
            Le type aide à identifier rapidement la catégorie LBC
            (Voiture / Moto / Utilitaire…).
          */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(ad.type?.name || ad.subtype?.name) && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="size-4" />
                {[ad.type?.name, ad.subtype?.name].filter(Boolean).join(' · ')}
              </span>
            )}
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
            {/* Première publication : utile pour repérer une annonce qui dort. */}
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

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          {/*
            Colonne gauche : tout le contenu "narratif" (visuel + texte).
            Volontairement plus large que la colonne droite pour donner
            de la place à la galerie qui est l'élément qui vend le plus.
          */}
          <div className="space-y-6">
            {/*
              Galerie : on n'utilise pas un <Card> ici pour que l'image
              principale s'affiche directement à pleine largeur, en
              rounded-2xl, avec une légère élévation. Plus immersif qu'une
              image coincée dans une carte avec un padding.
            */}
            {gallery.length > 0 && (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-2xl border bg-muted shadow-sm">
                  <img
                    src={gallery[0]}
                    alt={ad.title}
                    className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.02]"
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {gallery.slice(1).map((src, i) => (
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

            {/* Description complète, pas tronquée comme sur la carte. */}
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
              Caractéristiques : grille de tuiles plutôt que des rows.
              Chaque tuile = icône + label + valeur empilés, ce qui donne
              une "dashboard feel" plus moderne qu'une liste textuelle.
            */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {/*
                    Marque / modèle / position marché : présents en tuiles
                    car même si la marque/modèle figurent dans le titre LBC,
                    on veut les exposer en données structurées (pratique
                    pour confirmation visuelle rapide + cohérence avec
                    l'analyse marché).
                  */}
                  {ad.brand?.name && (
                    <SpecTile
                      icon={<Tag className="size-4" />}
                      label="Marque"
                      value={ad.brand.name}
                    />
                  )}
                  {ad.vehicleModel?.name && (
                    <SpecTile
                      icon={<TagsIcon className="size-4" />}
                      label="Modèle"
                      value={ad.vehicleModel.name}
                    />
                  )}
                  {ad.marketPosition?.name && (
                    <SpecTile
                      icon={<LineChart className="size-4" />}
                      label="Position marché"
                      value={ad.marketPosition.name}
                    />
                  )}
                  {ad.modelYear != null && (
                    <SpecTile
                      icon={<Calendar className="size-4" />}
                      label="Année modèle"
                      value={ad.modelYear}
                    />
                  )}
                  {ad.entryYear != null && (
                    <SpecTile
                      icon={<Calendar className="size-4" />}
                      label="Mise en circulation"
                      value={ad.entryYear}
                    />
                  )}
                  {ad.mileage != null && (
                    <SpecTile
                      icon={<Gauge className="size-4" />}
                      label="Kilométrage"
                      value={`${kmFormatter.format(ad.mileage)} km`}
                    />
                  )}
                  {ad.gearBox?.name && (
                    <SpecTile
                      icon={<Settings className="size-4" />}
                      label="Boîte"
                      value={ad.gearBox.name}
                    />
                  )}
                  {ad.fuel?.name && (
                    <SpecTile
                      icon={<Fuel className="size-4" />}
                      label="Carburant"
                      value={ad.fuel.name}
                    />
                  )}
                  {ad.dinPower != null && (
                    <SpecTile
                      icon={<Zap className="size-4" />}
                      label="Puissance"
                      value={`${ad.dinPower} ch`}
                    />
                  )}
                  {ad.vehicleState?.name && (
                    <SpecTile
                      icon={<Settings className="size-4" />}
                      label="État"
                      value={ad.vehicleState.name}
                    />
                  )}
                  {ad.vehicleSeats?.name && (
                    <SpecTile
                      icon={<Users className="size-4" />}
                      label="Places"
                      value={ad.vehicleSeats.name}
                    />
                  )}
                  {ad.drivingLicence?.name && (
                    <SpecTile
                      icon={<IdCard className="size-4" />}
                      label="Permis"
                      value={ad.drivingLicence.name}
                    />
                  )}
                  {ad.technicalInspectionYear != null && (
                    <SpecTile
                      icon={<CalendarClock className="size-4" />}
                      label="Contrôle technique"
                      value={ad.technicalInspectionYear}
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
          </div>

          {/*
            Colonne droite : sticky pour que le prix + CTA restent visibles
            quand l'utilisateur scrolle la galerie et la description. C'est
            le pattern Leboncoin / AutoScout : le bloc "action" suit l'oeil.
          */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/*
              Carte héro prix + marge : c'est LE bloc qui doit accrocher
              l'oeil. Léger dégradé emerald pour évoquer le gain potentiel,
              prix en très gros, marge mise en évidence dans une sous-box.
            */}
            <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-background to-background dark:border-emerald-900/40 dark:from-emerald-950/30">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Prix annoncé
                  </p>
                  <p className="text-4xl font-bold tracking-tight">
                    {eurosFormatter.format(ad.price)}
                  </p>
                  {medianPrice != null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Marché médian : {eurosFormatter.format(medianPrice)}
                    </p>
                  )}
                  {/*
                    Fourchette marché : on l'affiche en plus du médian quand
                    on a min ET max distincts, ça donne le contexte (un
                    médian sans amplitude ne dit pas si c'est un marché
                    serré ou très dispersé).
                  */}
                  {ad.priceMin != null &&
                    ad.priceMax != null &&
                    ad.priceMin !== ad.priceMax && (
                      <p className="text-xs text-muted-foreground">
                        Fourchette : {eurosFormatter.format(ad.priceMin)} –{' '}
                        {eurosFormatter.format(ad.priceMax)}
                      </p>
                    )}
                </div>

                {/*
                  Bloc marge potentielle : encadré coloré pour qu'on
                  comprenne instantanément que c'est *le* chiffre qui
                  justifie de cliquer.
                */}
                {(marginAmountRange || marginPercentRange) && (
                  <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="size-3.5" />
                      Marge potentielle
                    </div>
                    {marginAmountRange && (
                      <p className="mt-1 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                        {marginAmountRange}
                      </p>
                    )}
                    {marginPercentRange && (
                      <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">
                        {marginPercentRange}
                      </p>
                    )}
                  </div>
                )}

                <Button asChild className="w-full" size="lg">
                  <a href={ad.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    Voir sur LeBonCoin
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Contact & localisation : bloc secondaire, plus discret. */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row icon={<Phone className="size-4" />} label="Téléphone">
                  {ad.phoneNumber ?? 'Non renseigné'}
                </Row>
                {ad.ownerName && (
                  <Row icon={<Users className="size-4" />} label="Vendeur">
                    {ad.ownerName}
                  </Row>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tuile spec : icône + label + valeur empilés.
// Utilisée dans la grille des caractéristiques pour donner un look
// "dashboard" plutôt qu'une liste à puces.
function SpecTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 transition hover:border-foreground/20 hover:shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

// Ligne icône + label + valeur, utilisée dans la card "Contact".
// Plus compacte qu'une tuile car le contenu y est plus textuel.
function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground">{label} :</span>
      <span>{children}</span>
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
  if (min != null && max != null)
    return `Entre ${eurosFormatter.format(min)} et ${eurosFormatter.format(max)}`;
  if (min != null) return `≥ ${eurosFormatter.format(min)}`;
  return `≤ ${eurosFormatter.format(max!)}`;
}

function formatPercentRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  // Worker stocke des fractions (0.15 = 15%) — on convertit en % affichable.
  const toPercent = (v: number) => Math.round(v * 100);
  if (min != null && max != null)
    return `Entre ${toPercent(min)}% et ${toPercent(max)}%`;
  if (min != null) return `≥ ${toPercent(min)}%`;
  return `≤ ${toPercent(max!)}%`;
}
