# Service Provider Utilities & Actions

This project is a set of common scripts and utilities to manage services.

# Setup

```
npm install
```

## [Discovery Node](https://github.com/AudiusProject/audius-docker-compose/tree/master/sp-utilities/discovery-provider)

### Health Checks

Run before registering your service to ensure it complies with network specs:
```
export discoveryProviderEndpoint=https://discoveryprovider.domain.co

npm run discovery:health
```

## [Creator Node](https://github.com/AudiusProject/audius-docker-compose/tree/master/sp-utilities/creator-node)

### Health Checks

Run before registering your service to ensure it complies with network specs:
```
export creatorNodeEndpoint=https://creatornode.domain.co
export delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc
export spId=1 # if your node is not registered, set this env var to empty

npm run creator:health
```

### Delist Content

```
export creatorNodeEndpoint=https://creatornode.domain.co
export delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc
export discoveryProviderEndpoint=https://discoveryprovider.domain.co

npm run creator:delist -- -a add -l 1,3,7 -t track
npm run creator:delist -- --help
```

## [Automatic claims](https://github.com/AudiusProject/audius-docker-compose/tree/master/sp-utilities/claim)

If you would like to automatically run claim operations whenever a new round is initiated, `claim.js` is included for your convenience in the claim folder.
