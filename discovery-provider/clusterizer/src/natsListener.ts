import { base64 } from '@scure/base'
import { Address } from 'micro-eth-signer'
import { consumerOpts, createInbox, NatsConnection } from 'nats'
import { ChantCodec } from './codec'
import { jetstreamSubject } from './config'
import { PubkeyTable, RpclogTable } from './db'
import { compareWallets, getRegisteredDiscoveryNodes } from './peering'
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

    /// "attest" RPCs are special... they come from peer discovery providers
    /// atm everything is on a single jetstream topic and we handle attest here
    /// we could have a dedicated topic for attest specifically
    if (rpc.method.startsWith('attest')) {
      const registeredNodes = await getRegisteredDiscoveryNodes()
      const sp = registeredNodes.find((n) =>
        compareWallets(n.delegateOwnerWallet, fromWallet)
      )
      if (!sp) {
        console.warn(`skipping attest from non-registered wallet ${fromWallet}`)
        continue
      }

      switch (rpc.method) {
        case 'attest.publicKey':
          // TODO: SCHEMA: should validate rpc.params to be:
          // { wallet: string, pubkey: string }
          try {
            await PubkeyTable().insert(rpc.params).onConflict().ignore()
          } catch (e) {
            console.error('failed', rpc.method, e)
          }
          break
        default:
          console.warn(`unknown attest rpc method: ${rpc.method}`)
      }

      continue
    }

    /// typical "user" RPC
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
