export type ServiceProvider = {
  endpoint: string
  delegateOwnerWallet: string

  // other stuff we're not using:
  // owner: string
  // spID: number
  // type: string
  // blockNumber: number
}

export type CurrentServerInfo = {
  ip: string
  nkey: string
  publicKey: Uint8Array
}

export type DiscoveryPeer = CurrentServerInfo & {
  wallet: string
  host: string
  isSelf: boolean
}

export type RPC = {
  id?: string
  method: string
  params?: any
}
