#!/bin/bash
set -e

cd audius-docker-compose/discovery-provider
git checkout nats
git pull

# cleanup old volume
sudo rm -rf nats

audius-cli launch discovery-provider -y