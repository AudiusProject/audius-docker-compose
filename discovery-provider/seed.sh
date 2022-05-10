#!/usr/bin/bash

if [[ $ENV == 'prod' ]]; then
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvProduction.dump -O
  pg_restore -d $audius_db_url discProvProduction.dump

elif [[ $ENV == 'stage']]; then
  curl https://audius-pgdump.s3-us-west-2.amazonaws.com/discProvStaging.dump -O
  pg_restore -d $audius_db_url discProvStaging.dump

else
  echo "Invalid env: $ENV"
  exit 1
fi