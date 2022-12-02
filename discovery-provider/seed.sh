#!/usr/bin/bash
set -e

NETWORK=$1

if [[ "$NETWORK" == "prod" ]]; then
  echo "Downloading $NETWORK database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvProduction.dump -O
  echo "Restoring $NETWORK database to $audius_db_url..."
  pg_restore -d $audius_db_url --username postgres --no-privileges --clean --if-exists --verbose discProvProduction.dump
elif [[ "$NETWORK" == "stage" ]]; then
  echo "Downloading $NETWORK database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvStaging.dump -O
  echo "Restoring $NETWORK database to $audius_db_url..."
  pg_restore -d $audius_db_url --username postgres --no-privileges --clean --if-exists --verbose discProvStaging.dump
else
  echo "Invalid network: $NETWORK"
  exit 1
fi
