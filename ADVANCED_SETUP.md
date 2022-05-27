# Advanced Setup

## Table of Contents
- [Launching a new node from scratch](#launching-a-new-node-from-scratch)
  - [Setting environment variables](#setting-environment-variables)
  - [Creator Node](#creator-node)
  - [Discovery Provider](#discovery-provider)
  - [Launch](#launch)
- [Migration from Kubernetes](#migration-from-kubernetes)
## Launching a new node from scratch

### Setting environment variables

```sh
# to set individual environment variables
# valid service-names are "creator-node" or "discovery-provider"
audius-cli set-config <service-name> <key> <value>

# to set all the required environment variables for a service
audius-cli set-config --required creator-node
audius-cli set-config --required discovery-provider
```

#### Creator Node
There are four required creator node environment variables, available [here](README.md#creator-node)

The full list of variables and explanations can be found on the wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Content-Node:-Configuration-Details#required-environment-variables).

#### Discovery Provider
There are two required discovery provider environment variables, available [here](README.md#discovery-provider)

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

In the managed postgres database and set the `temp_file_limit` flag to `2147483647` and run the following SQL command on the destination db.
```
CREATE EXTENSION pg_trgm;
```

Make sure that your service exposes all the required environment variables. See wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Discovery-Node:-Configuration-Details#required-environment-variables) for full list of env vars and descriptions.

### Launch
```sh
audius-cli launch creator-node

# or

audius-cli launch discovery-provider (--seed)

# Options:
# --seed
#     Seeds the database from a snapshot. Required for first-time discovery setup.
```

## Migration from Kubernetes

For existing machines running audius services via kube, first run the following commands,
```sh
audius-cli auto-upgrade --remove
kubectl delete --all-namespaces --all deployments
kubectl delete --all-namespaces --all pods
sudo kubeadm reset

git clone https://github.com/AudiusProject/audius-docker-compose.git ~/audius-docker-compose
cd ~/audius-docker-compose
bash setup.sh
```

Following this, you will have to reset the keys from before, you can preview old keys with,
```
cat audius-k8s-manifests/config.yaml
```
and set them similarly to before with audius-cli