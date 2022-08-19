DOCKER_DEFAULT_PLATFORM=linux/amd64 docker build . -t audius/wip-cluster:latest
docker push audius/wip-cluster:latest

ssh stage-discovery-2 'bash -s' < scripts/pull.sh
ssh stage-discovery-3 'bash -s' < scripts/pull.sh
ssh stage-discovery-5 'bash -s' < scripts/pull.sh