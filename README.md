# Audius Docker Compose

Launch audius services via docker compose

Actively under development, not recommended for production use.


### Setting an Audius Service

Currently, this has been tested on Ubuntu 20.04 LTS machines.

```sh
bash setup.sh
```


### Setting Keys

For every key do
```sh
audius-cli set-config <service-name> <key> <value>
```
#### Creator Node
The full list of variables and explanations can be found on the wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Content-Node:-Configuration-Details#required-environment-variables).

Some variables must be set, you can do this with the following commands:

```sh
audius-cli set-config creator-node
key   : spOwnerWallet
value : <address of wallet that contains audius tokens>

audius-cli set-config creator-node
key   : delegateOwnerWallet
value : <address of wallet that contains no tokens but that is registered on chain>

audius-cli set-config creator-node
key   : delegatePrivateKey
value : <private key>

audius-cli set-config creator-node
key   : creatorNodeEndpoint
value : <your service url>
```
**Note:** if you haven't registered the service yet, please enter the url you plan to register for `creatorNodeEndpoint`.

#### Discovery Provider
```sh
audius-cli set-config discovery-provider
key   : audius_delegate_owner_wallet
value : <delegate_owner_wallet>

audius-cli set-config discovery-provider
key   : audius_delegate_private_key
value : <delegate_private_key>
```

If you are using an external managed Postgres database (version 11.1+), replace the db url with,
```sh
audius-cli set-config discovery-provider backend
key   : audius_db_url
value : <audius_db_url>

audius-cli set-config discovery-provider backend
key   : audius_db_url_read_replica
value : <audius_db_url_read_replica>
```

**Note:** If there's no read replica, enter the primary db url for both env vars.

The below is only if using a managed posgres database:

You will have to replace the db seed job in `audius/discovery-provider/discovery-provider-db-seed-job.yaml` as well. Examples are provided.
In the managed postgres database and set the `temp_file_limit` flag to `2147483647` and run the following SQL command on the destination db.
```
CREATE EXTENSION pg_trgm;
```

Make sure that your service exposes all the required environment variables. See wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Discovery-Node:-Configuration-Details#required-environment-variables) for full list of env vars and descriptions.

### Launch
```sh
audius-cli launch <service-name>
```
