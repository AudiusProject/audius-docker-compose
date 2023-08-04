# Service Provider Utilities

This project is a set of common scripts and utilities to manage services.

## Setup

```
npm install
```

## Discovery Node

### Health Checks

Run before registering your service to ensure it complies with network specs:
```
export discoveryProviderEndpoint=https://discoveryprovider.domain.co

npm run discovery:health
```

## Creator Node

### Health Checks

Run before registering your service to ensure it complies with network specs:
```
export creatorNodeEndpoint=https://creatornode.domain.co
export delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc
export spId=1 # if your node is not registered, set this env var to empty

npm run creator:health
```

### Delist Content

If you'd like to manually delist or undelist content on your node, run this script after ensuring the necessary env vars are set:
```
export creatorNodeEndpoint=https://creatornode.domain.co
export delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc
export discoveryProviderEndpoint=https://discoveryprovider.domain.co
npm run creator:delist track 1,abcde,3
npm run creator:undelist user 4,fghij,5
```

## Automatic claims

If you would like to automatically run claim operations whenever a new round is initiated, `claim.js` is included for your convenience in the claim folder.

See [README](./claim)