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
}

export type DiscoveryPeer = {
  ip: string
  nkey: string
  wallet: string
  host: string
  isSelf: boolean
}

export type RPC = {
  id?: string
  method: string
  params: any
}
