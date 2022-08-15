import { base64 } from '@scure/base'
import bodyParser from 'body-parser'
import express from 'express'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { contentType, getConfig } from './config'
import { getDiscoveryNodeList } from './discoveryNodes'
import { DiscoveryPeer } from './types'

const app = express()
const port = process.env.PORT || 8925
app.use(bodyParser.raw({ type: contentType }))

const { codec, publicKey, nkey } = getConfig()

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
      resp.send(base64.encode(encrypted))
    }
  } catch (e: any) {
    console.log(e.message, 'invalid message')
    resp.status(400).send('invliad message')
  }
})

app.post('/clusterizer/op', async (req, res) => {
  try {
    const raw = req.body as Uint8Array
    const unsigned = await codec.decode(raw)
    if (unsigned) {
      console.log(raw)
      console.log(unsigned)
      // put message into nats
      return res.end(raw)
    }
  } catch (e) {}

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
