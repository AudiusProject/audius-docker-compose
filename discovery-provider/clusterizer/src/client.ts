import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import { promises } from 'fs'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { buildNatsConfig } from './buildNatsConfig'
import { getConfig } from './config'
import { getDiscoveryNodeList } from './discoveryNodes'
import { PeerInfo, ServiceProvider } from './types'

const { codec, wallet } = getConfig()

async function newKeypair() {
  const privateKey = secp.utils.randomPrivateKey()
  const publicKey = secp.getPublicKey(privateKey)
  const wallet = Address.fromPublicKey(publicKey)

  const privateKeyHex = secp.utils.bytesToHex(privateKey)
  const publicKeyHex = secp.utils.bytesToHex(publicKey)

  console.log({ privateKeyHex, publicKeyHex, wallet })
}

async function getPeerPublicKey(host: string) {
  const { statusCode, body } = await request(`${host}/clusterizer`, {
    headers: {
      'content-type': 'text/plain',
    },
  })
  const b64 = await body.text()
  if (statusCode != 200) {
    throw new Error(`${statusCode}: ${b64}`)
  }
  return base64.decode(b64)
}

async function getPeerInfo(server: ServiceProvider) {
  // first get server public key
  const host = server.endpoint
  const friendPublicKey = await getPeerPublicKey(host)

  // we _could_ preemptively send our connection details...
  // but for now we'll use a string
  const msg = 'please send me your deets!'
  const signed = await codec.encode(msg, { encPublicKey: friendPublicKey })
  const b = base64.encode(signed)

  const { statusCode, body } = await request(`${host}/clusterizer`, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: b,
  })

  const b64 = await body.text()
  if (statusCode != 200) {
    throw new Error(`${statusCode}: ${b64}`)
  }
  const clear = await codec.decode(base64.decode(b64))
  if (clear) {
    const data = clear.data as PeerInfo
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

// newKeypair()
// main('http://127.0.0.1:8925')

async function demo() {
  const servers = await getDiscoveryNodeList(false)

  const peers = await Promise.all(
    servers.map(async (server) => {
      // skip self
      if (server.delegateOwnerWallet == wallet) return
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

  const validPeers = peers.filter(Boolean)
  const config = buildNatsConfig(validPeers as PeerInfo[])
  console.log(config)
  await promises.writeFile('/nats/generated.conf', config, 'utf8')
}

demo()
