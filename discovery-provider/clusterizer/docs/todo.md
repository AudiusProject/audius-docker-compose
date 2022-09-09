## Pre Production

* test out what happens when a node doesn't expose ports 4222 / 6222 (can we use test-cluster.yml with two separate networks to test this?)
* message schema + validators: zod? JSONSchema? something else?
* code reuse: codec.ts + message schema + validators + HTTP client
* db migrations (in db.ts)... use a fancy migraiton tool?
* `rpclog` should retain the raw message
* revisit `todo` lines in code around NATS config management + client init... it's mostly okay now, but probably some edges to smooth there.

## Deploy

* Move `clusterizer` code to protocol repo, build `clusterizer` container in circle CI.
* Update docker compose to use built container... audit prod ENV config
* test on foundation nodes
* ship it!


## Monitoring

* TODO: doc for monitoring / troubleshooting... how's the cluster doing? Are there connectivity issues?
* maybe need an endpoint that gets `max(jetstream_seq)` from discovery database so we can check it on `healthz`

