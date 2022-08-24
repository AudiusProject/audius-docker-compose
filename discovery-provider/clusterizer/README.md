
### Local test cluster

```
npm run tsc && docker compose -f test-cluster.yml up --build
```

* Currently doing tsc outside of docker build for faster iteration.
  Dockerfile and .dockerignore has `TODO: for fast "local" iteration` comments.

### Deploy to staging

```
source scripts/deploy.sh
```



## TODO

* each server could have a different `authorization` set depending on when they run the `generate` command.
  I suspect if stage2 is missing stage3 nkey it wont get messages from stage3... but need to test that.
  If so... should use `nsc` tool to create + publish jwts instead of inlining to config.
  This might make sense anyway since it'll require fewer nats reloads over time.
* remove hardcoded test / admin accounts
* build `clusterizer` docker container and push to dockerhub... maybe move out of this codebase.