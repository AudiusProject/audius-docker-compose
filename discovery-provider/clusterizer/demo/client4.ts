import cuid from 'cuid'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { ChantCodec } from '../src/codec'
import { contentType, getConfig } from '../src/config'
import { RPC } from '../src/types'

const { codec, wallet } = getConfig()

class OpClient {
  constructor(private codec: ChantCodec, private endpoint: string) {}

  async send(rpc: RPC) {
    const signed = await codec.encode(rpc)

    const { statusCode, body } = await request(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': contentType,
      },
      body: signed,
    })

    const result = await body.json()
    console.log(statusCode, result)
    return result
  }
}

const opClient = new OpClient(codec, 'http://127.0.0.1:8925/clusterizer/op')
const queryClient = new OpClient(
  codec,
  'http://127.0.0.1:8925/clusterizer/query'
)

async function dm() {
  const msg = {
    id: cuid(),
    method: 'dm.send',
    params: {
      sentAt: new Date(),
      toWallet: wallet,
      message: 'hello there 2',
    },
  }
  await opClient.send(msg)

  const inbox = await queryClient.send({
    method: 'dm.get',
  })
  console.log({ inbox })
}

async function playlist() {
  const cx = cuid()
  const msg = {
    id: cuid(),
    method: 'playlist.create',
    params: {
      cuid: cx,
      name: 'hello there',
    },
  }

  await opClient.send(msg)
}

dm()
playlist()
