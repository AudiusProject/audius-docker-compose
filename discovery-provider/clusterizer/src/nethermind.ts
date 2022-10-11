import * as secp from '@noble/secp256k1'
import { DiscoveryPeer } from './types'

export function printNethermindConfigForPeers(peers: DiscoveryPeer[]) {
  peers.forEach(printNethermindConfigForPeer)
}

function printNethermindConfigForPeer(peer: DiscoveryPeer) {
  const pubkeyHex = secp.utils.bytesToHex(peer.publicKey)
  const user = pubkeyHex.startsWith('04') ? pubkeyHex.substring(2) : pubkeyHex
  const enode = `enode://${user}@${peer.ip}:30300`
  const signer = peer.wallet.startsWith('0x')
    ? peer.wallet.substring(2)
    : peer.wallet

  // here we would call:
  // admin_addPeer and clique_propose
  console.log({
    msg: 'todo: nethermind admin_addPeer',
    enode,
    addToStaticNodes: true,
  })

  console.log({
    msg: 'todo: nethermind clique_propose',
    signer,
    vote: true,
  })
}
