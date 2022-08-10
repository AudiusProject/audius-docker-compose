import { request } from 'undici'
import Fastify from 'fastify'
import { Address } from 'micro-eth-signer'
import { getConfig } from './config'
import { base64 } from '@scure/base'
import { PeerInfo } from './types'
import { getDiscoveryNodeList } from './discoveryNodes'
const fastify = Fastify({
  logger: true,
})

const { codec, publicKey, nkey } = getConfig()

// ROUTES
fastify.get('/clusterizer', async function (request, resp) {
  resp.send(base64.encode(publicKey))
})

fastify.post('/clusterizer', async function (req, resp) {
  // todo: reuse across requests
  // todo: prod config
  const stagingNodes = await getDiscoveryNodeList(false)

  try {
    const raw = base64.decode(req.body as string)
    const unsigned = await codec.decode(raw)
    if (unsigned) {
      const wallet = Address.fromPublicKey(unsigned.publicKey)

      // verify wallet is in list of known service provider
      const sp = stagingNodes.find((n) => n.delegateOwnerWallet == wallet)
      if (!sp) {
        return resp
          .status(400)
          .send(`wallet ${wallet} not found in service provider list`)
      }

      // send peer our info
      const ip = await ip2()
      const ourInfo: PeerInfo = {
        ip: ip,
        nkey: nkey.getPublicKey(),
      }
      const encrypted = await codec.encode(ourInfo, {
        encPublicKey: unsigned.publicKey,
      })
      resp.send(base64.encode(encrypted))
    }
  } catch (e: any) {
    fastify.log.info(e.message, 'invalid message')
    resp.status(400).send('invliad message')
  }
})

// Run the server!
fastify.listen({ host: '0.0.0.0', port: 8925 }, function (err, address) {
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
