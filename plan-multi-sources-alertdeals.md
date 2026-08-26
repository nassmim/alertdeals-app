# Prompt de reprise — Multi-sources sur AlertDeals

## Mission

Répliquer sur AlertDeals (`/Users/nassim/Projets/One Month Ship/AlertDeals/alertdeals-app`) le chantier multi-sources déjà **terminé et testé** sur auto-prospect (`/Users/nassim/Projets/auto-prospect/auto-prospect-app`, branche `feat/multi-sources`) : ingérer AutoScout24, LaCentrale et ParuVendu en plus de Leboncoin via les squids Lobstr.

**Différence de périmètre** : AlertDeals n'a **pas de prospection intégrée** → ne PAS répliquer tout ce qui touche au contact des annonces (orchestrateur quotidien, dédup par téléphone, priorité de contact entre sources, canaux/credits/templates, variable `{{plateforme}}`/`{{vendeur_nom}}`, warning LaCentrale "crédits vocaux"). Seule l'**ingestion + affichage** compte.

## Comment les deux apps sont liées

Lobstr n'accepte qu'une seule URL de webhook : auto-prospect reçoit le webhook et le **forwarde tel quel** à AlertDeals (`forwardToAlertDeals` dans `apps/worker/src/routes/webhook.routes.ts` d'auto-prospect, URL = env `ALERTDEALS_LOBSTR_WEBHOOK_URL`). Tous les squids sont forwardés, y compris ceux inconnus d'auto-prospect. AlertDeals reçoit donc le même payload `{id, squid:{id,name}, event}` et va chercher les résultats via `GET https://api.lobstr.io/v1/results?run=…` (pagination : `page`, `page_size`, réponse `total_results`/`total_pages`).

## Étape 0 — explorer AlertDeals (structure inconnue à ce jour)

Personne n'a encore cartographié ce repo dans ce contexte. Commencer par explorer : où est le handler du webhook Lobstr, le service d'ingestion, le schéma `ads` (Drizzle ? Supabase ?), comment les valeurs Leboncoin sont mappées, s'il existe des tables de référence (`brands`, `vehicle_models`, `fuels`, `gear_boxes`, types/carrosseries), un équivalent des "recherches" utilisateur, et les conventions (CLAUDE.md, scripts db). **Adapter le plan ci-dessous à ce qui existe réellement — répliquer la logique, pas copier les fichiers aveuglément.**

## Le modèle à répliquer (tout est dans auto-prospect, branche `feat/multi-sources`)

Fichiers de référence côté auto-prospect :
- `plan-multi-sources.md` — plan complet, grille de couverture des champs par source, attributs difficiles, requêtes de nettoyage hebdo.
- `packages/shared/src/config/ad-source.config.ts` — enum sources, labels, `FILTER_SOURCE_AVAILABILITY`.
- `apps/worker/src/config/worker.config.ts` — `LOBSTR_SQUIDS` (env `LOBSTR_SQUID_LEBONCOIN/_AUTOSCOUT24/_LACENTRALE/_PARUVENDU`) + `getSourceFromSquidId`.
- `apps/worker/src/services/lobstr/` — un mapper par source (`leboncoin`, `autoscout24`, `lacentrale`, `paruvendu`), helpers `shared.mapper.ts` (parsePhone via libphonenumber `/max`, dates, dictionnaires → valeurs canoniques, resolveBrandId/resolveModelId), `aliases.ts` (variantes de marques/modèles), registre `index.ts`, tests `__tests__/` (36 tests, à adapter).
- `packages/db/src/schema/ad.schema.ts` — enum `ad_source`, `ads.source` + `UNIQUE(source, original_ad_id)`, colonnes générées `normalized_name` sur `brands`/`vehicle_models` + index uniques, `needs_review`, `ads.unmapped_values` (jsonb).
- `scripts/dedupe-seed-models.py` — dédoublonnage des modèles dans les seeds (obligatoire AVANT d'appliquer l'index unique : les données Leboncoin contiennent déjà des doublons type `Coupe`/`Coupé`).

Points d'architecture à conserver :
1. `squid.id` → source (mapping env). Squid inconnu → 400 + log/alerte.
2. Une ligne `ads` par `(source, original_ad_id)` ; upsert `onConflictDoUpdate` sur cette paire.
3. Dictionnaires de vocabulaire **en code** par source → valeurs canoniques des tables de référence ; valeurs inconnues → `ads.unmapped_values` (jsonb) pour nettoyage manuel hebdo (PAS d'alerte).
4. Marques/modèles : résolution exact → alias → `normalized_name` (colonne générée Postgres : sans accents, MAJUSCULES, tout sauf `A-Z0-9+` supprimé — le `+` distingue `Prius`/`Prius+`) → création flaggée `needs_review`.
5. Logs d'ingestion : chaque annonce droppée est tracée (mapper failed / skip volontaire / no typeId), + compteurs fetched/persisted/inserted.
6. UI : badge source sur les annonces ; si AlertDeals a des recherches/alertes utilisateur → sélection des plateformes (`sources[]`, défaut leboncoin) + warnings par filtre non supporté (matrice `FILTER_SOURCE_AVAILABILITY`).

## Enseignements des payloads RÉELS (ne pas se fier à la doc du provider)

Payloads réels sauvegardés côté session auto-prospect (récupérables à tout moment via l'API : `GET /v1/runs?squid=<id>&page_size=1` puis `GET /v1/results?run=<id>`, header `Authorization: Token $LOBSTR_API_KEY` — clés dans `.env.local` d'auto-prospect).

**AutoScout24** (squid scrape autoscout24.fr → tout en FRANÇAIS, la doc donnait de l'anglais) :
- `gearbox: "Boîte manuelle"/"Boîte automatique"`, `body_type: "Berline"/"SUV/4x4/Pick-Up"`, `fuel_type: "Diesel"/"Electrique"` (sans accent).
- `seller_name: "Particulier"` pour tous les particuliers (AS24 masque les noms), `seller_type: "PrivateSeller"`.
- Prix : préférer `functions.json_data.price.priceEvaluation` (numérique, 1 super-price → 5 high-price) au label affiché `price_label` ("Bon prix", "Pas d'information"). Mapping 1→Très bonne affaire, 2→Bonne affaire, 3→Prix équitable, 4→Légèrement supérieur, 5→Supérieur au marché.
- Absents en réalité (null partout) : `emission_class`, `general_inspection`, `number_of_previous_owners`, `colour`. `first_online_date` ≈ heure de scraping. `drivetrain` contient la boîte (champ recyclé).
- Pas d'année modèle : dériver de `first_registration` ("MM/YYYY").

**LaCentrale** :
- `category: "SUV_4X4_CROSSOVER"` / `"CITADINE"` (et `all_characteristics.vehicle.category: "TOUS_CHEMINS"`), `gearbox: "AUTO"/"MANUAL"` (+ `MECANIQUE`/`AUTOMATIQUE` dans all_characteristics), `energy: "ESSENCE"/"DIESEL"/"ELECTRIC"`.
- `good_deal_badge` échelle complète : `VERY_GOOD_DEAL` / `GOOD_DEAL` / `EQUITABLE_DEAL` / `BAD_DEAL` / null (avec `classified.goodDealBadge: "NOT_COMPUTED"` en fallback).
- `seller_name: "M ou Mme X."` (particuliers anonymisés), `contact_name` souvent null.
- `display_phone: "33614930397"` (international sans `+`).
- `seller_comment` parfois null → fallback `all_characteristics.classified.description`.
- Cote : `all_characteristics.classified.refinedQuotation` (valeur unique, pas de fourchette).

**ParuVendu** : pas encore validé sur run réel (payload mixte immo/auto : ignorer les sections non-véhicule ; `reference` "ParuVendu WI…" sinon id depuis l'url ; dates "DD/MM/YYYY").

## Ordre de travail suggéré

1. Explorer AlertDeals (étape 0) et écrire un plan md adapté avec cases à cocher dans ce repo.
2. Schéma DB (source, unicité composite, normalized_name, needs_review, unmapped_values) — **respecter le workflow migrations d'AlertDeals ; si même règle qu'auto-prospect, ne jamais lancer les commandes de migration soi-même, les faire lancer par Nassim**.
3. Webhook : squid → source + env `LOBSTR_SQUID_*`.
4. Mappers par source (reprendre ceux d'auto-prospect, retirer ce qui n'existe pas dans le schéma AlertDeals) + tests + logs.
5. Dédoublonner les seeds/données existantes avant l'index unique (réutiliser `dedupe-seed-models.py`).
6. UI : badge source + sélection de plateformes si des recherches existent.
7. Vérif : typecheck, lint, tests, run réel par squid.

## Règles (si AlertDeals suit les mêmes conventions qu'auto-prospect — à vérifier dans son CLAUDE.md)

Ne pas lancer les commandes de migration/reset DB (les faire lancer par Nassim), ne pas éditer les migrations à la main, préserver les commentaires existants, commits sans Co-Authored-By.

---

## ÉTAT : IMPLÉMENTÉ (branche `feat/multi-sources`)

Fait :
- `packages/shared` : `ad-source.config.ts` (EAdSource, DEFAULT_ALERT_SOURCES, FILTER_SOURCE_AVAILABILITY {marginMin: LBC+LC, vehicleState: LBC}), `reference-name.utils.ts`.
- `packages/db` : `ads.source` + `UNIQUE(source, original_ad_id)` + `unmapped_values` ; `brands`/`vehicle_models` : `normalized_name` (colonne générée) + index uniques + `needs_review` ; `alerts.sources ad_source[] DEFAULT '{leboncoin}'`.
- Seeds dédoublonnées (`scripts/dedupe-seed-models.py`) : seed.sql (40), nassmim (43, 3 ads remappées), sanaahamliri (40).
- Worker : `LOBSTR_SQUIDS`/`getSourceFromSquidId` (env `LOBSTR_SQUID_*`, `.env.example` mis à jour), webhook lit `squid.id` (400 si inconnu), `services/lobstr/` (4 mappers + aliases + shared + registre), `getResultsFromRun` paginé (`total_pages`), logs de drop par annonce, upsert `(source, original_ad_id)`, marges via `computeMarketComparison` (LC = cote en min/max → les alertes MARGIN_MIN marchent sur LaCentrale), `dinPower` (AS24 extrait de "50 kW (68 Ch)", LC = engine_power_hp).
- Matching : `inArray(ads.source, alert.sources)`.
- Web : card "Plateformes" dans le formulaire d''alerte + warning mode marge ; badges source et CTA "Voir sur {plateforme}" activés (vehicle-card, vehicle-details).
- Tests : vitest ajouté au worker, 28 tests mappers (`SUPABASE_DATABASE_URL=postgres://x:y@127.0.0.1:5432/test pnpm --filter @alertdeals/worker test`).

Reste (à faire par Nassim / plus tard) :
1. `pnpm db:generate` puis `pnpm db:reset` (migrations : enum ad_source, ads.source+unique, unmapped_values, normalized_name ×2, needs_review ×2, alerts.sources). Committer la migration.
2. Renseigner `LOBSTR_SQUID_*` dans `.env.local` (mêmes ids que côté auto-prospect).
3. Smoke test réel par squid.
4. Optionnel : filtre source dans hot-deals (`hot-deals.validation.ts`, `hot-deals-filters.tsx`, `ad.service.ts`) — non fait, le badge suffit pour l''instant.
5. `next lint` est cassé dans le repo (Next 16 a retiré la commande) — préexistant.
