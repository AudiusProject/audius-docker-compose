import { request } from 'undici'
import Fastify from 'fastify'
import { Address, hexToBytes } from 'micro-eth-signer'
import { myPrivateKeyHex } from './config'
import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import { fromSeed, Prefix } from 'nkeys.js'
import { Codec } from 'nkeys.js/lib/codec'
const fastify = Fastify({
  logger: true,
})

if (!process.env.audius_delegate_private_key) {
  console.error(`audius_delegate_private_key is required`)
  process.exit(1)
}

const privateKey = hexToBytes(process.env.audius_delegate_private_key)
const publicKey = secp.getPublicKey(privateKey)
const wallet = Address.fromPublicKey(publicKey)
console.log(` wallet is: `, wallet)

const seed = Codec.encodeSeed(Prefix.User, privateKey)
const nkey = fromSeed(seed)
console.log(` nkey is: `, nkey.getPublicKey())

// ROUTES
fastify.get('/clusterizer', async function (request, reply) {
  const ip = await ip2()
  reply.send({
    ip: ip,
    nkey: nkey.getPublicKey(),
  })
})

fastify.get('/pubkey', function (req, resp) {
  resp.send({ publicKeyBase64: base64.encode(publicKey) })
})

// Run the server!
fastify.listen({ port: 8925 }, function (err, address) {
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
