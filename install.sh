#!/usr/bin/bash
set -e

git clone https://github.com/AudiusProject/audius-docker-compose.git ~/audius-docker-compose
cd audius-docker-compose/
git checkout dm-readme-rework

while read -p "Service to install (creator-node, discovery-provider): "; do
    if [[ $REPLY =~ ^(creator-node|discovery-provider)$ ]]; then
        break
    fi
    echo "Invalid service name"
done

./setup.sh $REPLY
