#!/bin/bash
set -e

nvm use
npm i
npm run tsc

DOCKER_DEFAULT_PLATFORM=linux/amd64 docker build . -t audius/wip-cluster:latest
docker push audius/wip-cluster:latest

echo "---------- 2"
ssh stage-discovery-2 'bash -s' < scripts/pull.sh
echo "---------- 3"
ssh stage-discovery-3 'bash -s' < scripts/pull.sh
echo "---------- 5"
ssh stage-discovery-5 'bash -s' < scripts/pull.sh
echo "---------- 1"
ssh stage-discovery-1 'bash -s' < scripts/pull.sh