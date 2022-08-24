import { base64 } from '@scure/base'
import { Address } from 'micro-eth-signer'
import { fetch, request } from 'undici'
import { contentType, getConfig } from './config'
import { DiscoveryPeer, ServiceProvider } from './types'

const { codec, wallet } = getConfig()

export async function getDiscoveryPeers(): Promise<ServiceProvider[]> {
  switch (process.env.audius_discprov_env) {
    case 'test':
      return Promise.resolve(testDiscoveryList)
    case 'stage':
      return getServiceProviders('staging', 'discovery-node')
    default:
      return getServiceProviders('prod', 'discovery-node')
  }
}

export async function getAnnotatedDiscoveryPeers() {
  const sps = await getDiscoveryPeers()
  const maybePeers = await Promise.all(
    sps.map(async (server) => {
      try {
        const peerRequest = await getPeerInfo(server)
        if (!peerRequest) {
          console.log(server.endpoint, 'no response')
          return
        }
        const peerInfo = peerRequest.data
        peerInfo.host = server.endpoint
        peerInfo.wallet = server.delegateOwnerWallet
        peerInfo.isSelf = compareWallets(wallet, server.delegateOwnerWallet)
        return peerInfo
      } catch (e: any) {
        console.warn(`failed on ${server.endpoint}`, e.message)
      }
    })
  )

  const peers = maybePeers.filter(Boolean) as DiscoveryPeer[]
  peers.sort((a, b) => (a.wallet < b.wallet ? -1 : 1))
  return peers
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

async function getPeerPublicKey(host: string) {
  const { statusCode, body } = await request(`${host}/clusterizer`)
  const b64 = await body.text()
  if (statusCode != 200) {
    throw new Error(`${statusCode}: ${b64}`)
  }
  return base64.decode(b64)
}

// calls out to a single peer server
//
async function getPeerInfo(server: ServiceProvider) {
  // first get server public key
  const host = server.endpoint
  const friendPublicKey = await getPeerPublicKey(host)

  // we _could_ preemptively send our connection details...
  // but for now we'll use a string
  const msg = 'please send me your deets!'
  const signed = await codec.encode(msg, { encPublicKey: friendPublicKey })
  const { statusCode, body } = await request(`${host}/clusterizer`, {
    method: 'POST',
    headers: {
      'content-type': contentType,
    },
    body: signed,
  })

  if (statusCode != 200) {
    const txt = await body.text()
    throw new Error(`${statusCode}: ${txt}`)
  }

  const buf2 = new Uint8Array(await body.arrayBuffer())
  const clear = await codec.decode(buf2)
  if (clear) {
    const data = clear.data as DiscoveryPeer
    const wallet = Address.fromPublicKey(clear.publicKey)
    if (!compareWallets(server.delegateOwnerWallet, wallet)) {
      console.log(
        server.endpoint,
        server.delegateOwnerWallet,
        'signed by unexpected wallet address',
        data
      )
      return
    }
    return { wallet, data }
  }
}
