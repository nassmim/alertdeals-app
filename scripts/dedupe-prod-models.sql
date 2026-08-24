-- Dédoublonne vehicle_models sur (brand_id, nom normalisé) AVANT la migration
-- 0024 qui crée l'index unique vehicle_models_brand_id_normalized_name_key.
-- À lancer UNE FOIS sur la base cible, puis relancer `pnpm db:push:prod`.
--
-- Normalisation = même règle que la colonne générée `normalized_name` du
-- schéma (sans accents, MAJUSCULES, tout sauf A-Z0-9+ supprimé).
-- Pour chaque groupe de doublons : on garde le plus petit id, on remappe
-- ads.model_id, on supprime les autres.
--
-- Usage :
--   pnpm _with-env-prod bash -c '/opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DATABASE_URL" -f scripts/dedupe-prod-models.sql'

begin;

-- Garde-fou : si des MARQUES sont aussi en doublon normalisé, on s'arrête
-- (leur fusion remappe ads/brands_hunts/vehicle_models et doit être traitée à part).
do $$
declare dup_count int;
begin
  select count(*) into dup_count from (
    select 1
    from brands
    group by upper(regexp_replace(translate(name,
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'), '[^A-Za-z0-9+]', '', 'g'))
    having count(*) > 1
  ) d;
  if dup_count > 0 then
    raise exception 'Des marques sont en doublon normalisé (% groupe(s)) : à fusionner manuellement avant ce script', dup_count;
  end if;
end $$;

create temp table model_dups on commit drop as
with normalized as (
  select id, brand_id,
    upper(regexp_replace(translate(name,
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'), '[^A-Za-z0-9+]', '', 'g')) as norm
  from vehicle_models
)
select id, min(id) over (partition by brand_id, norm) as keep_id
from normalized;

-- Remappe les annonces des doublons vers la ligne conservée
update ads
set model_id = d.keep_id
from model_dups d
where ads.model_id = d.id
  and d.id <> d.keep_id;

-- Supprime les doublons
delete from vehicle_models
where id in (select id from model_dups where id <> keep_id);

-- Récap
do $$
declare removed int;
begin
  get diagnostics removed = row_count;
  raise notice 'vehicle_models dédoublonnés (voir lignes supprimées ci-dessus)';
end $$;

select count(*) as remaining_dup_groups from (
  select 1
  from vehicle_models
  group by brand_id, upper(regexp_replace(translate(name,
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'), '[^A-Za-z0-9+]', '', 'g'))
  having count(*) > 1
) d;

commit;
