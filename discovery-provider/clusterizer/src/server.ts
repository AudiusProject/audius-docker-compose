import { base64 } from '@scure/base'
import bodyParser from 'body-parser'
import express from 'express'
import { Address } from 'micro-eth-signer'
import { connect, nkeyAuthenticator, usernamePasswordAuthenticator } from 'nats'
import { request } from 'undici'

import { contentType, getConfig, jetstreamSubject, natsHost } from './config'
import { getDiscoveryNodeList } from './discoveryNodes'
import { startJetstreamListener } from './natsListener'
import { DiscoveryPeer } from './types'

const app = express()
const port = process.env.PORT || 8925
app.use(bodyParser.raw({ type: contentType }))

const { codec, publicKey, nkey, wallet } = getConfig()

const natsPromise = connect({
  servers: natsHost,
  // authenticator: usernamePasswordAuthenticator('public', 'public'),
  authenticator: nkeyAuthenticator(nkey.getSeed()),
}).then(async (nats) => {
  // ensure jetstream
  const jsm = await nats.jetstreamManager()

  const created = await jsm.streams.add({
    name: jetstreamSubject,
    subjects: [jetstreamSubject],
    num_replicas: 3,
    deny_delete: true,
    deny_purge: true,
  })
  console.log('jetstream created', created)

  // start in separate "thread"
  startJetstreamListener(nats, codec, `consumer999:${wallet}`)

  return nats
})

app.get('/', (req, resp) => {
  resp.send(base64.encode(publicKey))
})

app.get('/clusterizer', (req, resp) => {
  resp.send(base64.encode(publicKey))
})

app.post('/clusterizer', async function (req, resp) {
  // todo: reuse across requests
  // todo: prod config
  const stagingNodes = await getDiscoveryNodeList(false)

  try {
    const unsigned = await codec.decode(req.body)
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
      const ourInfo: DiscoveryPeer = {
        ip: ip,
        nkey: nkey.getPublicKey(),
      }
      const encrypted = await codec.encode(ourInfo, {
        encPublicKey: unsigned.publicKey,
      })
      resp.end(encrypted)
    }
  } catch (e: any) {
    console.log(e.message, 'invalid message')
    resp.status(400).send('invliad message')
  }
})

app.post('/clusterizer/op', async (req, res) => {
  const nats = await natsPromise
  const jetstream = nats.jetstream()

  try {
    const raw = req.body as Uint8Array
    const unsigned = await codec.decode(raw)
    if (unsigned) {
      // TODO: validate op
      // put message into nats
      const receipt = await jetstream.publish(jetstreamSubject, raw)
      return res.json(receipt)
    }
  } catch (e) {
    // todo: jetstream error should be a 500
    console.log(e)
  }

  res.status(400).send('bad request')
})

app.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`)
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
