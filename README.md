# Audius Docker Compose

Launch Audius services using docker-compose. Minimum system requirements:

- Ubuntu 20.04 LTS
- 8 vCPU (16 vCPU recommended)
- 16 GiB RAM (32 GiB recommended)
- 256 GiB SSD for discovery-provider or 2 TiB SSD for creator-node

## Installation

On a VM that meets the minimum requirements from above run:

```sh
bash <(curl https://raw.githubusercontent.com/AudiusProject/audius-docker-compose/main/install.sh)
```

During installation there will be prompts for required environment variables. The variables are:

#### Creator Node
`creatorNodeEndpoint` - The DNS of your content node. If you haven't registered the service yet, please enter the url you plan to register.\
`delegateOwnerWallet` - Address of wallet that contains no tokens but that is registered on chain, used to sign JSON responses from server\
`delegatePrivateKey` - Private key associated with `delegateOwnerWallet`\
`spOwnerWallet` - Wallet that registered (or will register) the content node on chain

If you're using an externally managed Postgres DB please see [this section](ADVANCED_SETUP.md#external-creator-node-postgres)

#### Discovery Provider
`audius_discprov_url` - The DNS of the discovery node. If you haven't registered the service yet, please enter the url you plan to register.\
`audius_delegate_owner_wallet` - Address of wallet that contains no tokens but that is registered on chain, used to sign JSON responses from server\
`audius_delegate_private_key` - Private key associated with `audius_delegate_owner_wallet`

If you're using an externally managed Postgres DB please see [this section](ADVANCED_SETUP.md#external-discovery-provider-postgres-instance)

## SP Utilities
This folder contains a set of scripts and utilities to manage services like:
- Pre-registration health checks
- Delist content scripts (for content node)
- Automatic rewards claim script

## Logging
Logging is enabled by default to stream logs to a logging service for ease of debugging. It's strongly recommended to keep logging enabled. However, if there's a reason to turn logging off, it can be disabled with:
 ```
 audius-cli set-config creator-node|discovery-provider audius_loggly_disable true
 audius-cli launch creator-node|discovery-provider
 ```

## More options
For more advanced configuration options or migrating from Kubernetes check out the [Advanced Setup Guide](ADVANCED_SETUP.md)
