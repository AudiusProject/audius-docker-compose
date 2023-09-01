<p align="center">
  <br/>
  <a target="_blank" href="https://audius.co">
    <img src="https://user-images.githubusercontent.com/2731362/90302695-e5ae8a00-de5c-11ea-88b5-24c1408affc6.png" alt="audius-client" width="200">
  </a>
  <br/>


  <p align="center">
    <b>audius-cli</b>
    <br/>
    🚀 🎧 🐳
    <br/>
    Launch and manage Audius services using Docker Compose
  </p>
</p>

> Hardware [requirements](https://docs.audius.org/token/running-a-node/hardware-requirements)


## Installation

On a VM that meets the minimum requirements from above run:

```sh
bash <(curl https://raw.githubusercontent.com/AudiusProject/audius-docker-compose/main/install.sh)
```

During installation there will be prompts for required environment variables.
After setting the variables, they are exported to an `override.env` file in the respective service directory.

### Content Node (Creator Node)

| Variable      | Description | Example |
| ----------- | ----------- | ----------- |
| creatorNodeEndpoint      | The DNS of your content node. If you haven't registered the service yet, please enter the url you plan to register       | https://cn1.operator.xyz |
| delegateOwnerWallet   | Public key for the service used to sign responses from the server. This wallet holds no tokens.       | `0x07bC80Cc29bb15a5CA3D9DB9D80AcA25eB967aFc` |
| delegatePrivateKey   | Private key associated with `delegateOwnerWallet`        | `2ef5a28ab4c39199085eb4707d292c980fef3dcc9dc854ba8736a545c11e81c4` |
| spOwnerWallet   | Public key that registered (or will register) the content node on chain. This wallet holds tokens.        | `0x92d3ff660158Ec716f1bA28Bc65a7a0744E26A98` |


### Discovery Node (Discovery Provider)

| Variable      | Description | Example |
| ----------- | ----------- | ----------- |
| audius_discprov_url      | The DNS of the discovery node. If you haven't registered the service yet, please enter the url you plan to register      | https://dn1.operator.xyz |
| audius_delegate_owner_wallet      | Public key for the service used to sign responses from the server. This wallet holds no tokens.     | `0x07bC80Cc29bb15a5CA3D9DB9D80AcA25eB967aFc` |
| audius_delegate_private_key      | Private key associated with `audius_delegate_owner_wallet`    | `2ef5a28ab4c39199085eb4707d292c980fef3dcc9dc854ba8736a545c11e81c4` |


> If you're using an externally managed Postgres DB please see [advanced setup](ADVANCED_SETUP.md#external-discovery-provider-postgres-instance)

<br />

### Customizing override.env
If you would like to maintain environment variables externally to the repository, you can use the following commands to override the path for the `override.env` file

```
audius-cli set-override-path discovery-provider <path-to-your-override>
audius-cli set-override-path discovery-provider --unset
```

## Upgrading
You can upgrade your service to the latest release by setting up autoupgrade:
```
audius-cli auto-upgrade
```

Or manually:
```
audius-cli upgrade
```

## Logging
Logging is enabled by _default_ to stream logs to an external logging service for debugging purposes. It is *strongly* recommended to keep logging enabled. The Audius logging stack uses [vector.dev](vector.dev) to ship container logs.

If there's a reason to turn logging off, it can be disabled via config:
 ```
 audius-cli set-config discovery-provider audius_logging_disabled true
 audius-cli launch discovery-provider
 ```

## SSL configuration

[Caddy](https://caddyserver.com/) will automatically obtain certs from Let's Encrypt provided the following is true:

* DNS points to your machine
* The `audius_discprov_url` or `creatorNodeEndpoint` matches the DNS name.  (e.g. `https://discovery2.myhost.com`... **no trailing slash!**)
* Ports 80 and 443 are open to the internet

If SSL is not working after a minute, `docker logs caddy` can provide clues.

### SSL with CloudFlare Proxy

If you are using CloudFlare Proxy, configure Caddy to generate a self-signed cert instead of using Let's Encrypt.

For Creator Node:

```
audius-cli set-config creator-node CADDY_TLS 'tls internal'
audius-cli launch creator-node
```

For Discovery Provider:

```
audius-cli set-config discovery-provider CADDY_TLS 'tls internal'
audius-cli launch discovery-provider
```


## Utilities
The [utilities folder](/utilities/) contains a set of scripts and utilities to manage services like:
- Running pre-registration health checks
- Automatic rewards claim script

## Advanced options
For more advanced configuration options or migrating from Kubernetes check out the [Advanced Setup Guide](ADVANCED_SETUP.md)


## Migrate from RDS to postgres container

```
cd audius-docker-compose/creator-node

audius-cli down
docker compose -f docker-compose-pgonly.yml up -d
```

dump data from db
```
docker exec -ti postgres bash
pg_dump -v --no-owner $dbUrl > /creator-node-db-backup/cn-db-latest.sql
```

stop postgres
```
docker compose -f docker-compose-pgonly.yml down
```

remove anything in local pgdata dir
```
sudo rm -rf /var/k8s/creator-node-db
sudo mkdir /var/k8s/creator-node-db
```

comment out or remove any previous rds config
```
cat ~/audius-docker-compose/creator-node/override.env
# dbUrl=
```

re up and restore from backup
```
docker compose -f docker-compose-pgonly.yml up -d

docker exec -ti postgres bash
psql -U postgres -d audius_creator_node < /creator-node-db-backup/cn-db-latest.sql

# may need to add any required roles if it fails i.e.
CREATE ROLE rdsadmin;
```

down pgonly and up creator node
```
docker compose -f docker-compose-pgonly.yml down
audius-cli launch creator-node -y
```

cleanup
```
sudo rm -f /var/k8s/creator-node-db-backup/cn-db-latest.sql
```
