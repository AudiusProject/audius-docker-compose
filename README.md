# Audius Docker Compose

Launch Audius services using docker-compose. Minimum system requirements:

- Ubuntu 20.04 LTS
- 8 vCPU (16 core recommended)
- 16 GB RAM (32 recommended)
- 250 GB SSD for discovery-provider or 2TB SSD for creator-node

## Installation

```sh
bash <(curl https://raw.githubusercontent.com/AudiusProject/audius-docker-compose/main/install.sh)
```

For more advanced configuration options or migrating from Kubernetes check out the [Advanced Setup Guide](ADVANCED_SETUP.md)