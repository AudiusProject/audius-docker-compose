# audius-docker-compose

Actively under development, not recommended for production use!

sample config.yaml:
```yaml
discovery-provider:
    backend:
        some-key: value
        another-key: different value
    cache:
        cache-key: another-value
creator-node:
    ...
```

for every key do
audius-cli set-config <service-name> <key> <value>

Note: pod can be ignored
