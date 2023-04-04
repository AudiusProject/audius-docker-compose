#!/usr/bin/bash
set -e

if [ ! -d ~/audius-docker-compose ]
then
    # if not called via
    # `bash <(curl https://raw.githubusercontent.com/AudiusProject/audius-docker-compose/main/install.sh)`
    git clone --single-branch --branch main https://github.com/AudiusProject/audius-docker-compose.git ~/audius-docker-compose
fi

while read -p "Service to install (creator-node, discovery-provider): "; do
    if [[ $REPLY =~ ^(creator-node|discovery-provider)$ ]]; then
        break
    fi
    echo "Invalid service name"
done

~/audius-docker-compose/setup.sh $REPLY
