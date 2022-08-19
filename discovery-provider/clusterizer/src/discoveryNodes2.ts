import { fetch } from 'undici'
import { DiscoveryPeer, ServiceProvider } from './types'

const prodEndpoint =
  'https://api.thegraph.com/subgraphs/name/audius-infra/audius-network-mainnet'

const stagingEndpoint =
  'https://api.thegraph.com/subgraphs/name/audius-infra/audius-network-ropsten'

const gql = `
query ServiceProviders($type: String) {
  serviceNodes(where: {isRegistered: true, type: $type}) {
    endpoint
    delegateOwnerWallet
    isRegistered
  }
}
`

export const theGraphFetcher = (
  env: 'staging' | 'prod',
  type: 'content-node' | 'discovery-node'
) =>
  fetch(env == 'staging' ? stagingEndpoint : prodEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: gql,
      variables: {
        type,
      },
    }),
  }).then(async (resp) => {
    const data: any = await resp.json()
    const sps: ServiceProvider[] = data.data.serviceNodes
    return sps
  })
