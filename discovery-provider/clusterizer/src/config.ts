import * as secp from '@noble/secp256k1'
import { Address, hexToBytes } from 'micro-eth-signer'
import { Prefix, fromSeed } from 'nkeys.js'
import { Codec } from 'nkeys.js/lib/codec'
import { promises, writeFile } from 'node:fs'
import { ChantCodec } from './codec'
import { exec } from './junk'

//
// get values on boot
//
if (!process.env.audius_delegate_private_key) {
  console.error(`audius_delegate_private_key is required`)
  process.exit(1)
}

const privateKey = hexToBytes(process.env.audius_delegate_private_key)
const publicKey = secp.getPublicKey(privateKey)
const wallet = Address.fromPublicKey(publicKey)

const seed = Codec.encodeSeed(Prefix.User, privateKey)
const nkey = fromSeed(seed)

const codec = new ChantCodec(privateKey)

//
// getter thing
//
export function getConfig() {
  return { publicKey, wallet, nkey, codec }
}

//
// constants
//
export const contentType = 'application/x-audius-msg'

// also in ecosystem.config.cjs
export const natsConfFile = '/nats/server.conf'

export const jetstreamSubject = 'audius_jetstream2'

//
// helpers
//
async function configureNatsTools() {
  const nkeyFile = '/tmp/nkey_seed.txt'
  await promises.writeFile(nkeyFile, nkey.getSeed(), 'utf8')

  await exec(`nats context save --nkey ${nkeyFile} default`)
  await exec(`nats context select default`)
}

configureNatsTools()
