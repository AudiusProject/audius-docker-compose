import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  publicToAddress,
} from '@ethereumjs/util'
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util'
import { base64, hex } from '@scure/base'
import Web3 from 'web3'
import type { Transaction } from 'web3-core'
import { add0x, Decoder, strip0x } from 'micro-web3'
import { pg, PubkeyTable } from './db'

const isStage = process.env.audius_discprov_env == 'stage'

// const { libs } = require('@audius/sdk')
// const AudiusABIDecoder = libs.AudiusABIDecoder

const config = isStage
  ? {
      gateway: 'https://poa-gateway.staging.audius.co',
      chainId: 77,
      verifyingContract: '0x39d26a6a138ddf8b447d651d5d3883644d277251',
    }
  : {
      gateway: 'https://poa-gateway.audius.co',
      chainId: 99,
      verifyingContract: '0x981c44040cb6150a2b8a7f63fb182760505bf666',
    }

const web3 = new Web3(config.gateway)
const decoder = new Decoder()
decoder.add('UserFactory', [
  {
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
      {
        name: '_handle',
        type: 'bytes16',
      },
      {
        name: '_nonce',
        type: 'bytes32',
      },
      {
        name: '_subjectSig',
        type: 'bytes',
      },
    ],
    name: 'addUser',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    type: 'function',
  },
])

export async function getWalletPublicKey(wallet: string) {
  const existing = await PubkeyTable().where('wallet', wallet).first()
  if (existing) return existing.pubkey

  // if miss, recover
  const pubkeyBuffer = await recoverPublicKey(wallet)
  if (pubkeyBuffer) {
    const pubkeyB64 = base64.encode(pubkeyBuffer)
    await PubkeyTable()
      .insert({
        wallet,
        pubkey: pubkeyB64,
      })
      .onConflict()
      .ignore()

    return pubkeyB64
  }
}

async function recoverPublicKey(wallet: string) {
  const userRows = await pg<UserRow>('users')
    .where('wallet', wallet.toLowerCase())
    .orderBy('blocknumber')

  if (!userRows.length) {
    console.error(`wallet ${wallet} not found`)
    return
  }

  for (const user of userRows) {
    // console.log(user.wallet, user.handle, user.blocknumber, user.txhash)
    if (user.txhash?.startsWith('0x')) {
      // console.time('web3.eth.getTransaction')
      const tx = await web3.eth.getTransaction(user.txhash)
      // console.timeEnd('web3.eth.getTransaction')
      // console.time('tryTransaction')
      const pubkey = await tryTransaction(tx)
      // console.timeEnd('tryTransaction')
      if (pubkey) return pubkey
    }

    // if user row doesn't have txhash it will instead have a placeholder like `unset_2dcbc7910`
    // in this case, get the block and try each transaction in block
    if (user.blocknumber) {
      const block = await web3.eth.getBlock(user.blocknumber)
      for (const txhash of block.transactions) {
        // console.time('web3.eth.getTransaction')
        const tx = await web3.eth.getTransaction(txhash)
        // console.timeEnd('web3.eth.getTransaction')
        const pubkey = await tryTransaction(tx)
        if (pubkey) return pubkey
      }
    }
  }

  console.warn(`recover public key failed for wallet ${wallet}`)
}

async function tryTransaction(tx: Transaction) {
  try {
    if (!tx.input) return

    // {
    //   const decodedABI = AudiusABIDecoder.decodeMethod('UserFactory', tx.input)
    //   const params: Record<string, string> = {}
    //   for (const p of decodedABI.params) {
    //     params[p.name] = p.value
    //   }
    //   const pubkey = recoverSignatureFromAddUserCall(params as AddUserParams)
    //   return pubkey
    // }

    const decodedABI = decoder.decode(
      'UserFactory',
      hex.decode(strip0x(tx.input)),
      {}
    )
    if (!decodedABI) return

    const signatureInfo = Array.isArray(decodedABI) ? decodedABI[0] : decodedABI
    const params = signatureInfo.value as any

    for (const [key, value] of Object.entries(params)) {
      if (value instanceof Uint8Array) {
        params[key] = add0x(hex.encode(value))
      }
    }
    console.log(params)

    const pubkey = recoverSignatureFromAddUserCall(params as AddUserParams)
    return pubkey
  } catch (e) {
    // console.log('nope:', e)
  }
}

// copy-pasted from `es-indexer/src/types/db.ts`
interface UserRow {
  bio?: string | null
  blockhash?: string | null
  blocknumber?: number | null
  cover_photo?: string | null
  cover_photo_sizes?: string | null
  created_at: Date
  creator_node_endpoint?: string | null
  handle?: string | null
  handle_lc?: string | null
  has_collectibles?: boolean
  is_current: boolean
  is_deactivated?: boolean
  is_verified?: boolean
  location?: string | null
  metadata_multihash?: string | null
  name?: string | null
  playlist_library?: any | null
  primary_id?: number | null
  profile_picture?: string | null
  profile_picture_sizes?: string | null
  replica_set_update_signer?: string | null
  secondary_ids?: any | null
  slot?: number | null
  txhash?: string
  updated_at: Date
  user_authority_account?: string | null
  user_id: number
  user_storage_account?: string | null
  wallet?: string | null
}

type AddUserParams = {
  _owner: string
  _handle: string
  _nonce: string
  _subjectSig: string
}

function recoverSignatureFromAddUserCall(params: AddUserParams) {
  const addUserAbi = {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      AddUserRequest: [
        {
          name: 'handle',
          type: 'bytes16',
        },
        {
          name: 'nonce',
          type: 'bytes32',
        },
      ],
    },
    domain: {
      name: 'User Factory',
      version: '1',
      chainId: config.chainId,
      verifyingContract: config.verifyingContract,
    },
    primaryType: 'AddUserRequest',
    message: {
      handle: params._handle,
      nonce: params._nonce,
    },
  }

  const msgHash = TypedDataUtils.eip712Hash(
    addUserAbi as any,
    SignTypedDataVersion.V3
  )

  const sigParams = fromRpcSig(params._subjectSig)
  const publicKey = ecrecover(msgHash, sigParams.v, sigParams.r, sigParams.s)

  // validate recovery
  const recoveredWallet = bufferToHex(publicToAddress(publicKey))
  if (recoveredWallet !== params._owner) {
    throw new Error(
      `recovered wallet ${recoveredWallet} != owner wallet ${params._owner}`
    )
  }

  return publicKey
}

const testWallets = `
0xb5f6a1b59feac1453cb9e768b8f0cf7fc172dca3
0x78b2443d008656ce227cb47a29f0da28ae5f2c33
0xb3cf6b24e90a908ed25539f958a6bb1923949c1e
0x176e3b1c349907e8fd04545f7188b9d0d80efde3
0xa14b08a2777f268604fd440621f3f244e76c710b
0x700da142d5f7686f73b712bca19a05824847fcee
0xacb25fb1c00de798021946da4784f2236b3bcb70
0xd16741e9ee3d6009b59e55e1a7e0e0dbba8aed3e
0xa9da020b2fc1bb4e67717bc9120f289e46222e62
0xd38729a3b7bb4b615050ff559996e0384760faa4
`

async function demo() {
  for (const wally of testWallets.trim().split('\n')) {
    if (!wally) continue
    console.log('-------------------', wally)
    const pubkey = await recoverPublicKey(wally)
    console.log(wally, pubkey)
  }
}

// demo()
