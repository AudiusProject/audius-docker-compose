#!/bin/bash
set -e

cd audius-docker-compose/discovery-provider
git checkout nats
git pull

audius-cli launch discovery-provider -y