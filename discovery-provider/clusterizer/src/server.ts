import { request } from 'undici'
import Fastify from 'fastify'
import { Address, hexToBytes } from 'micro-eth-signer'
import { ChantCodec } from './codec'
import { myPrivateKeyHex } from './config'
import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import { PeerInfo } from './types'
import { fromSeed, Prefix } from 'nkeys.js'
import { Codec } from 'nkeys.js/lib/codec'
const fastify = Fastify({
  logger: true,
})

// TODO: config
const privateKey = hexToBytes(myPrivateKeyHex)
const publicKey = secp.getPublicKey(privateKey)

const seed = Codec.encodeSeed(Prefix.User, privateKey)
const nkey = fromSeed(seed)
console.log(` nkey is: `, nkey.getPublicKey())

const codec = new ChantCodec(privateKey)

// ROUTES
fastify.get('/', async function (request, reply) {
  const ip = await ip2()
  reply.send({ hello: 'world100', name: 'dave', ip })
})

fastify.get('/pubkey', function (req, resp) {
  resp.send({ publicKeyBase64: base64.encode(publicKey) })
})

fastify.post('/swap', async function (req, resp) {
  try {
    const raw = base64.decode(req.body as string)
    const unsigned = await codec.decode(raw)
    if (unsigned) {
      const wallet = Address.fromPublicKey(unsigned.publicKey)

      // verify wallet is in list of known wallets
      console.log('todo: verify wallet is in list of known wallets')

      // add peer info for wallet
      const peerInfo = unsigned.data as PeerInfo
      console.log('todo: add peer info for wallet', peerInfo)

      // send our peer info

      resp.send({ wallet, data: unsigned.data })
    }
  } catch (e: any) {
    fastify.log.info(e.message, 'invalid message')
    resp.status(400).send({ error: 'invliad message' })
  }
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})

async function ip2() {
  const { body } = await request('http://ip-api.com/json')
  const data = await body.json()
  const ip = data.query
  return ip
}

async function ip1() {
  const { body } = await request('http://ifconfig.me')
  const ip = await body.text()
  return ip
}

async function main() {
  await ip1()
  await ip2()
}

// main()
