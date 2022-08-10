import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { getConfig } from './config'
import { getDiscoveryNodeList } from './discoveryNodes'
import { PeerInfo } from './types'

const { codec, publicKey, nkey } = getConfig()

async function newKeypair() {
  const privateKey = secp.utils.randomPrivateKey()
  const publicKey = secp.getPublicKey(privateKey)
  const wallet = Address.fromPublicKey(publicKey)

  const privateKeyHex = secp.utils.bytesToHex(privateKey)
  const publicKeyHex = secp.utils.bytesToHex(publicKey)

  console.log({ privateKeyHex, publicKeyHex, wallet })
}

async function getFriendPublicKey(host: string) {
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

async function getFriendServerInfo(host: string) {
  // first get server public key
  const friendPublicKey = await getFriendPublicKey(host)

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
    // todo: verify wallet matches the expected one for this host
    return { wallet, data }
  }
}

// newKeypair()
// main('http://127.0.0.1:8925')

async function demo() {
  const servers = await getDiscoveryNodeList(false)
  for (let server of servers) {
    console.log('----------------')
    console.log(server)
    try {
      const deets = await getFriendServerInfo(server.endpoint)
      console.log(deets)
    } catch (e: any) {
      console.warn(`failed on ${server.endpoint}`, e.message)
    }
  }
}

demo()
