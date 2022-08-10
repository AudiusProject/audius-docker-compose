```
# update nats branch
cd audius-docker-compose/discovery-provider
git checkout nats
git pull

# build local clusterizer container
docker compose build
audius-cli launch discovery-provider

# run client, view result
docker exec clusterizer npm run generate
cat nats/generated.conf

docker compose restart nats
docker logs nats

# soon nats should be up... so instead of restart, can send reload signal to pid 1:
docker compose exec nats nats-server --signal reload=1
```