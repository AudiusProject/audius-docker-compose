import { base64 } from '@scure/base'
import bodyParser from 'body-parser'
import express from 'express'
import { Address } from 'micro-eth-signer'

import { contentType, getConfig, jetstreamSubject } from './config'
import {
  compareWallets,
  getCurrentServerInfo,
  getRegisteredDiscoveryNodes,
} from './peering'
import { getNatsClient, startNatsBabysitter } from './natsBabysitter'
import { CurrentServerInfo } from './types'

const app = express()
const port = process.env.PORT || 8925
app.use(bodyParser.raw({ type: contentType }))

const { codec, publicKey, wallet, nkey } = getConfig()

// start in separate "thread"
startNatsBabysitter()

app.get('/', (req, resp) => {
  resp.send(base64.encode(publicKey))
})

app.get('/clusterizer', (req, resp) => {
  resp.send(base64.encode(publicKey))
})

app.post('/clusterizer', async function (req, resp) {
  // todo: reuse across requests
  const registeredNodes = await getRegisteredDiscoveryNodes()

  try {
    const unsigned = await codec.decode(req.body)
    if (unsigned) {
      const wallet = Address.fromPublicKey(unsigned.publicKey)
      const theirInfo = unsigned.data as CurrentServerInfo
      // console.log({ theirInfo })

      // verify wallet is in list of known service provider
      const sp = registeredNodes.find((n) =>
        compareWallets(n.delegateOwnerWallet, wallet)
      )
      if (!sp) {
        return resp
          .status(400)
          .send(`wallet ${wallet} not found in service provider list`)
      }

      // send peer our info
      const ourInfo = await getCurrentServerInfo()
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

app.get('/clusterizer/messages', async (req, res) => {
  // pubkey middleware would:
  //   recover public key from the request
  //     either post body, or maybe some header
  //   check pubkey table
  //   forward message if new
})

app.post('/clusterizer/op', async (req, res) => {
  const nats = getNatsClient()
  if (!nats) {
    return res.status(500).send('no nats connection')
  }
  console.log('using', nats.getServer())
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
  } catch (e: any) {
    console.log(e)
    return res.status(502).send(e.message)
  }

  res.status(400).send('bad request')
})

app.listen(port, () => {
  console.log({
    msg: 'start express server',
    port,
    wallet,
    nkey: nkey.getPublicKey(),
  })
})
