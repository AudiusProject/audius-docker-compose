import { base64 } from '@scure/base'
import { Address } from 'micro-eth-signer'
import { consumerOpts, createInbox, NatsConnection } from 'nats'
import { ChantCodec } from './codec'
import { jetstreamSubject } from './config'
import { PubkeyTable, RpclogTable } from './db'
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

    // collect the pubkey
    await PubkeyTable()
      .insert({
        wallet: fromWallet,
        pubkey: base64.encode(decoded.publicKey),
      })
      .onConflict()
      .ignore()

    // apply changes
    // for now this just records the input to the rpclog table
    try {
      await RpclogTable()
        .insert({
          cuid: rpc.id!,
          wallet: fromWallet,
          method: rpc.method,
          params: rpc.params,
          jetstream_seq: m.info.streamSequence,
          // jetstream_ts: new Date(m.info.timestampNanos / 1000000),
          // processed_at: new Date(),
        })
        .onConflict()
        .ignore()
    } catch (e) {
      console.log('failed', e)
    }
  }
  console.log('subscription closed')
}
