import { base64 } from '@scure/base'
import { promises } from 'fs'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { contentType, getConfig } from './config'
import { getDiscoveryNodeList } from './discoveryNodes'
import { DiscoveryPeer, ServiceProvider } from './types'

const { codec } = getConfig()

// entrypoint
writeNatsConfig()

// gets list of all peer servers
// calls each one to get IP + nkey
// writes config file
async function writeNatsConfig() {
  const servers = await getDiscoveryNodeList(false)

  const peers = await Promise.all(
    servers.map(async (server) => {
      try {
        const peerRequest = await getPeerInfo(server)
        if (!peerRequest) {
          console.log(server.endpoint, 'no response')
          return
        }
        const peerInfo = peerRequest.data
        peerInfo.host = server.endpoint
        return peerInfo
      } catch (e: any) {
        console.warn(`failed on ${server.endpoint}`, e.message)
      }
    })
  )

  const validPeers = peers.filter(Boolean) as DiscoveryPeer[]
  const config = buildNatsConfig(validPeers)
  console.log(config)
  await promises.writeFile('/nats/generated.conf', config, 'utf8')
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
    if (wallet != server.delegateOwnerWallet) {
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

//
// config template
//
function buildNatsConfig(peers: DiscoveryPeer[]) {
  return `
server_name: $audius_delegate_owner_wallet

websocket {
  port: 4242
  no_tls: true
}

jetstream {
  store_dir: /nats/storage
  max_mem: 1G
  max_file: 10G
}

cluster {
  name: C1
  listen: 0.0.0.0:6222
  authorization {
    user: eee1f87
    password: e380342b14ce42520cc9602f
  }
  routes: [
${peers.map((p) => `nats://${p.ip}:6222 # ${p.host} `).join('\n')}
  ]
}

authorization: {
  DISCOVERY_NODE = {
    publish: [
      "testing.>"
    ]
    subscribe: ["PUBLIC.>", "_INBOX.>", "testing.>"]
  }

  # todo: remove
  ADMIN = {
    publish = {
      deny: [
        "$JS.API.STREAM.UPDATE.*"
        "$JS.API.STREAM.DELETE.*"
      ]
    }
    subscribe = ">"
  }
  users: [
{user: test, password: test, permissions: $DISCOVERY_NODE} # todo: remove
{user: admin, password: admin, permissions: $ADMIN} # todo: remove
${peers
  .map((p) => `{nkey: ${p.nkey}, permissions: $DISCOVERY_NODE} # ${p.host} `)
  .join('\n')}
  ]
}

monitor_port: 8222
`
}
