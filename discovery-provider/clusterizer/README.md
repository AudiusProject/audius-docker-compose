
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

