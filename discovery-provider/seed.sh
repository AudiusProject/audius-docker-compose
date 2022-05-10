#!/usr/bin/bash

ENV=$1

if [ "$ENV" == 'prod' ]
then
  echo "Downloading $ENV database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvProduction.dump -O
  echo "Restoring $ENV database to $audius_db_url..."
  pg_restore -d $audius_db_url --clean --if-exists discProvProduction.dump
elif [ "$ENV" == 'stage' ]
then
  echo "Downloading $ENV database..."
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvStaging.dump -O
  echo "Restoring $ENV database to $audius_db_url..."
  pg_restore -d $audius_db_url --clean --if-exists discProvStaging.dump
else
  echo "Invalid env: $ENV"
  exit 1
fi
