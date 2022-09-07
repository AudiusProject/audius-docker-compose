import { base64 } from '@scure/base'
import bodyParser from 'body-parser'
import express, { response } from 'express'
import { Address } from 'micro-eth-signer'

import cors from 'cors'
import { contentType, getConfig, jetstreamSubject } from './config'
import { getNatsClient, startNatsBabysitter } from './natsBabysitter'
import {
  compareWallets,
  getCurrentServerInfo,
  getRegisteredDiscoveryNodes,
} from './peering'
import { CurrentServerInfo, RPC } from './types'
import { RpclogTable } from './db'
import { sleep } from './junk'
import { getWalletPublicKey } from './recover'

const app = express()
const port = process.env.PORT || 8925
app.use(cors())
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

app.get('/clusterizer/pubkey/:wallet', async (req, resp) => {
  const pubkey = await getWalletPublicKey(req.params.wallet)
  resp.send(pubkey)
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

app.post('/clusterizer/query', async (req, resp) => {
  try {
    const raw = req.body as Uint8Array
    const unsigned = await codec.decode<RPC>(raw)
    if (unsigned) {
      const rpc = unsigned.data
      const wallet = Address.fromPublicKey(unsigned.publicKey)

      switch (rpc.method) {
        case 'dm.get':
          // TODO: this should just return DMs for `wallet`
          // not all the dms in the db
          const allDms = await RpclogTable().where('method', 'dm.send')
          return resp.json(allDms)
      }
    }
  } catch (e) {
    console.log('bad request', e)
  }
  return resp.status(400).send('invalid query')
})

app.post('/clusterizer/op', async (req, res) => {
  const raw = req.body as Uint8Array
  const unsigned = await codec.decode(raw)
  if (!unsigned) {
    return res.status(400).send('bad request')
  }

  let errMsg = 'unknown error'
  for (let attempt = 1; attempt < 8; attempt++) {
    const nats = await getNatsClient()
    if (!nats) {
      errMsg = 'no nats'
    } else {
      try {
        const jetstream = nats.jetstream()
        const receipt = await jetstream.publish(jetstreamSubject, raw)
        return res.json(receipt)
      } catch (e: any) {
        errMsg = e.message
      }
    }

    console.log({ attempts: attempt, errMsg })
    await sleep(200 * attempt)
  }

  res.status(502).send(errMsg)
})

app.listen(port, () => {
  console.log({
    msg: 'start express server',
    port,
    wallet,
    nkey: nkey.getPublicKey(),
  })
})
