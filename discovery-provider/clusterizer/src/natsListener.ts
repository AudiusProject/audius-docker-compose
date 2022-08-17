import { Prisma } from '@prisma/client'
import { Address } from 'micro-eth-signer'
import { consumerOpts, createInbox, NatsConnection } from 'nats'
import { db } from '../prisma/db'
import { ChantCodec } from './codec'
import { jetstreamSubject } from './config'
import { RPC } from './types'

export async function startJetstreamListener(
  nats: NatsConnection,
  codec: ChantCodec,
  consumerName: string
) {
  const jetstream = nats.jetstream()

  const opts = consumerOpts()
  opts.durable(consumerName)
  // opts.manualAck()
  // opts.ackExplicit()
  opts.deliverTo(createInbox())

  let sub = await jetstream.subscribe(jetstreamSubject, opts)

  for await (const m of sub) {
    const decoded = await codec.decode<RPC>(m.data)
    if (!decoded) {
      continue
    }

    const rpc = decoded.data
    const fromWallet = Address.fromPublicKey(decoded.publicKey)

    try {
      await db.rpcLog.create({
        data: {
          cuid: rpc.id!,
          wallet: fromWallet,
          method: rpc.method,
          params: rpc.params,

          jetstream_seq: m.info.streamSequence,
          jetstream_ts: new Date(m.info.timestampNanos / 1000000),
          processed_at: new Date(),
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          console.log('unique violation... skipping')
          continue
        }
      }
      console.log('failed', e)
    }
  }
  console.log('subscription closed')
}
