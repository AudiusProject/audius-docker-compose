```
# build + push locally for now
DOCKER_DEFAULT_PLATFORM=linux/amd64 docker build . -t audius/wip-cluster:latest
docker push audius/wip-cluster:latest

# update nats branch
cd audius-docker-compose/discovery-provider
git checkout nats
git pull

# build local clusterizer container
audius-cli launch discovery-provider

# run client, view result
docker exec clusterizer npm run generate
cat nats/generated.conf

docker compose restart nats
docker logs nats

# if nats is up, can instead send reload signal to pid 1:
docker compose exec nats nats-server --signal reload=1

# publish some test values
# you can run this on stage 2, 3, 5 and you'll see values print from peers
docker exec clusterizer npm run pub
```

## TODO

* each server could have a different `authorization` set depending on when they run the `generate` command.
  I suspect if stage2 is missing stage3 nkey it wont get messages from stage3... but need to test that.
  If so... should use `nsc` tool to create + publish jwts instead of inlining to config.
  This might make sense anyway since it'll require fewer nats reloads over time.
* remove hardcoded test / admin accounts
* build `clusterizer` docker container and push to dockerhub... maybe move out of this codebase.