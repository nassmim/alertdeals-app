#!/bin/bash
set -e

# Dédoublonne vehicle_models sur la base pointée par SUPABASE_DATABASE_URL
# (voir scripts/dedupe-prod-models.sql). À lancer avant le db:push:prod qui
# crée l'index unique sur (brand_id, normalized_name).

SQL_FILE="scripts/dedupe-prod-models.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ SUPABASE_DATABASE_URL is not set"
  exit 1
fi

echo "⚠️  You are about to DEDUPE vehicle_models on the database at:"
echo "    $(echo "$SUPABASE_DATABASE_URL" | sed -E 's#//[^@]+@#//***@#')"
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

/opt/homebrew/opt/libpq/bin/psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "✓ Dedupe complete — you can now run: pnpm db:push:prod"
