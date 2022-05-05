#!/usr/bin/bash
git clone https://github.com/AudiusProject/audius-docker-compose.git ~

while read -p "Service to install (creator-node, discovery-provider): "; do
    if [[ $REPLY =~ ^(creator-node|discovery-provider)$ ]]; then
        break
    fi
    echo "Invalid service name"
done

~/audius-docker-compose/setup.sh $REPLY
