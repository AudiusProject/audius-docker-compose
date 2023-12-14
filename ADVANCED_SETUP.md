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
audius-cli set-config creator-node
audius-cli set-config discovery-provider

# to set all the required environment variables for a service, use the --required flag
audius-cli set-config --required creator-node
audius-cli set-config --required discovery-provider
```

#### Creator Node
There are four required creator node environment variables, available in the creator node section [here](README.md#creator-node).

The full list of variables and explanations can be found on the wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Content-Node:-Configuration-Details#required-environment-variables). Generally node operators will not need to modify any other environment variables

#### Discovery Provider
There are two required discovery provider environment variables, available in the discovery provider section [here](README.md#discovery-provider).

The full list of variables and explanations can be found on the wiki [here](https://github.com/AudiusProject/audius-protocol/wiki/Discovery-Node:-Configuration-Details#required-environment-variables). Generally node operators will not need to modify any other environment variables

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

```sh
# Clone and install related dependencies
git clone https://github.com/AudiusProject/audius-docker-compose.git ~/audius-docker-compose
bash ~/audius-docker-compose/setup.sh

# Get configs from k8s-manifests and set them again via set-config
cat ~/audius-k8s-manifests/config.yaml
audius-cli set-config <service>

# Remember to configure firewalls and load balancers to allow the service port through

# Turn off Postgres on the host. If this command returns an error it's not a problem.
sudo systemctl stop postgresql.service

# Remove kube
audius-cli auto-upgrade --remove
kubectl delete --all-namespaces --all deployments
kubectl delete --all-namespaces --all pods
sudo kubeadm reset

# Launch the service
audius-cli launch <service>
```
