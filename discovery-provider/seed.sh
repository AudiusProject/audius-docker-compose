#!/usr/bin/bash
set -e

NETWORK=$1
AUTOSEED=$2

MIN_DB_SIZE="2147483648"  # 2GB

function should_auto_seed() {
  db_size="$(psql "$audius_db_url" -t -c "SELECT pg_database_size(current_database());")"
  echo Current DB size detected as "$db_size"
  if [ -n "$db_size" ] && [[ "$db_size" -gt "0" ]] && [[ "$db_size" -lt "$MIN_DB_SIZE" ]]; then
    return 0
  else
    return 1
  fi
}

if [[ "$AUTOSEED" = "true" ]] && ! should_auto_seed; then
  echo "(auto-seed) skipping seeding as database appears to already be populated."
  exit 0
fi

if [[ "$NETWORK" == "prod" ]]; then
  echo "Downloading $NETWORK database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvProduction.dump -O
  echo "Restoring $NETWORK database to $audius_db_url..."
  pg_restore -d $audius_db_url --username postgres --no-privileges --clean --if-exists --verbose -j 8 discProvProduction.dump
elif [[ "$NETWORK" == "stage" ]]; then
  echo "Downloading $NETWORK database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvStaging.dump -O
  echo "Restoring $NETWORK database to $audius_db_url..."
  pg_restore -d $audius_db_url --username postgres --no-privileges --clean --if-exists --verbose -j 8 discProvStaging.dump
elif [[ "$NETWORK" == "dev" ]]; then
  echo "Skipping seeding for dev network"
else
  echo "Invalid network: $NETWORK"
  exit 1
fi
