import * as secp from '@noble/secp256k1'
import { Address, hexToBytes } from 'micro-eth-signer'
import { Prefix, fromSeed } from 'nkeys.js'
import { Codec } from 'nkeys.js/lib/codec'
import { ChantCodec } from './codec'

export function getConfig() {
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

  const codec = new ChantCodec(privateKey)

  return { publicKey, wallet, nkey, codec }
}

export const contentType = 'application/x-audius-msg'

export const natsHost = 'localhost:4222'

export const jetstreamSubject = 'audius_jetstream1'
