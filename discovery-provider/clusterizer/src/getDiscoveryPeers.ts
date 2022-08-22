import { fetch } from 'undici'
import { ServiceProvider } from './types'

export function getDiscoveryPeers() {
  switch (process.env.NETWORK) {
    case 'test':
      return Promise.resolve(testDiscoveryList)
    case 'staging':
      return getServiceProviders('staging', 'discovery-node')
    default:
      return getServiceProviders('prod', 'discovery-node')
  }
}

async function getServiceProviders(
  env: 'staging' | 'prod',
  type: 'content-node' | 'discovery-node'
) {
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

  const endpoint = env == 'staging' ? stagingEndpoint : prodEndpoint

  const resp = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: gql,
      variables: {
        type,
      },
    }),
  })

  const data: any = await resp.json()
  const sps: ServiceProvider[] = data.data.serviceNodes
  return sps
}

const testDiscoveryList: ServiceProvider[] = [
  {
    endpoint: 'http://clusterizer1:8925',
    delegateOwnerWallet: '0x1c185053c2259f72fd023ED89B9b3EBbD841DA0F',
  },
  {
    endpoint: 'http://clusterizer2:8925',
    delegateOwnerWallet: '0x90b8d2655A7C268d0fA31758A714e583AE54489D',
  },
  {
    endpoint: 'http://clusterizer3:8925',
    delegateOwnerWallet: '0xb7b9599EeB2FD9237C94cFf02d74368Bb2df959B',
  },
]

// the graph has wallets lowercase'd...
// which seems questionable to me
export function compareWallets(a: string, b: string) {
  return a.toLowerCase() == b.toLowerCase()
}
