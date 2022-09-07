import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  publicToAddress,
} from '@ethereumjs/util'
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util'
import { base64 } from '@scure/base'
import Web3 from 'web3'
import type { Transaction } from 'web3-core'
import { pg, PubkeyTable } from './db'

const { libs } = require('@audius/sdk')
const AudiusABIDecoder = libs.AudiusABIDecoder

const isStage = process.env.audius_discprov_env == 'stage'

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
    if (user.txhash?.startsWith('0x')) {
      const tx = await web3.eth.getTransaction(user.txhash)
      const pubkey = await tryTransaction(tx)
      if (pubkey) return pubkey
    }

    // if user row doesn't have txhash it will instead have a placeholder like `unset_2dcbc7910`
    // in this case, get the block and try each transaction in block
    if (user.blocknumber) {
      const block = await web3.eth.getBlock(user.blocknumber)
      for (const txhash of block.transactions) {
        const tx = await web3.eth.getTransaction(txhash)
        const pubkey = await tryTransaction(tx)
        if (pubkey) return pubkey
      }
    }
  }

  console.warn(`recover public key failed for wallet ${wallet}`)
}

async function tryTransaction(tx: Transaction) {
  try {
    const decodedABI = AudiusABIDecoder.decodeMethod('UserFactory', tx.input)

    const params: Record<string, string> = {}
    for (const p of decodedABI.params) {
      params[p.name] = p.value
    }

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

// async function demo() {
//   for (let i = 1; i < 11; i++) {
//     console.log('-------------------', i)
//     const pubkey = await recoverPublicKey(i)
//     console.log(i, pubkey)
//   }
// }

// demo()
