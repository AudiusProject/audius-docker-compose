import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import { Address } from 'micro-eth-signer'
import { request } from 'undici'
import { ChantCodec } from './codec'
import { myPrivateKeyHex } from './config'

async function newKeypair() {
  const privateKey = secp.utils.randomPrivateKey()
  const publicKey = secp.getPublicKey(privateKey)
  const wallet = Address.fromPublicKey(publicKey)

  const privateKeyHex = secp.utils.bytesToHex(privateKey)
  const publicKeyHex = secp.utils.bytesToHex(publicKey)

  console.log({ privateKeyHex, publicKeyHex, wallet })
}

async function main() {
  const privateKey = secp.utils.hexToBytes(myPrivateKeyHex)
  const codec = new ChantCodec(privateKey)
  const msg = {
    host: 'one.com',
    ip: '1.2.3',
  }

  const signed = await codec.encode(msg)
  const b = base64.encode(signed)

  const { body } = await request('http://localhost:3000/cool', {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: b,
  })

  const data = await body.json()
  console.log(data)

  // const unsigned = await codec.decode(signed)
  // if (unsigned) {
  //   const wally = Address.fromPublicKey(unsigned.publicKey)
  //   console.log(wally, unsigned.data)
  // }
}

// newKeypair()
main()
