export type ServiceProvider = {
  owner: string
  endpoint: string
  spID: number
  type: string
  blockNumber: number
  delegateOwnerWallet: string
}

export type DiscoveryPeer = {
  ip: string
  nkey: string
  host?: string
}

export type RPC = {
  id?: string
  method: string
  params: any
}
