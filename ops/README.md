
# node ops

## migrate from rds to postgres container

```
cd audius-docker-compose/creator-node
audius-cli down
docker compose -f ops/docker-compose-pgonly.yml up -d
```

dump data from db
```
docker exec -ti postgres bash
pg_dump -v --no-owner $dbUrl > /creator-node-db-backup/cn-db-latest.sql
```

stop postgres
```
docker compose -f ops/docker-compose-pgonly.yml down
```

remove anything in local pgdata dir
```
sudo rm -rf /var/k8s/creator-node-db
sudo mkdir /var/k8s/creator-node-db
```

comment out or remove any previous rds config
```
cat ~/audius-docker-compose/creator-node/override.env
# dbUrl=
```

re up and restore from backup
```
docker compose -f ops/docker-compose-pgonly.yml up -d
docker exec -ti postgres bash
psql -U postgres -d audius_creator_node < /creator-node-db-backup/cn-db-latest.sql
# may need to add any required roles if it fails i.e.
CREATE ROLE rdsadmin;
```

down pgonly and up creator node
```
docker compose -f ops/docker-compose-pgonly.yml down
audius-cli launch creator-node -y
```

cleanup
```
sudo rm -f /var/k8s/creator-node-db-backup/cn-db-latest.sql
```
