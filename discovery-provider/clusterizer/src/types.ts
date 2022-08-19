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
  wallet?: string
  host?: string
  isSelf?: boolean
}

export type RPC = {
  id?: string
  method: string
  params: any
}
