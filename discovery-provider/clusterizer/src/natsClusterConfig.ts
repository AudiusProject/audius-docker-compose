import { promises } from 'fs'
import { natsConfFile } from './config'
import { DiscoveryPeer } from './types'

// gets list of all peer servers
// calls each one to get IP + nkey
// writes config file
export async function writeNatsConfig(peers: DiscoveryPeer[]) {
  const config = buildNatsConfig(peers)
  await promises.writeFile(natsConfFile, config, 'utf8')
}

//
// config template
//
function buildNatsConfig(peers: DiscoveryPeer[]) {
  return `
server_name: $audius_delegate_owner_wallet

jetstream {
  store_dir: /nats/storage
  max_mem: 1G
  max_file: 10G
}

cluster {
  name: C1
  listen: 0.0.0.0:6222
  authorization {
    user: eee1f87
    password: e380342b14ce42520cc9602f
  }
  

  routes: [
${peers
  .filter((p) => !p.isSelf)
  .map(
    (p) => `nats://eee1f87:e380342b14ce42520cc9602f@${p.ip}:6222 # ${p.host} `
  )
  .join('\n')}
  ]
}

authorization: {
  DISCOVERY_NODE = {
    publish: [
      "testing.>"
    ]
    subscribe: ["PUBLIC.>", "_INBOX.>", "testing.>"]
  }

  # todo: remove
  ADMIN = {
    publish = {
      deny: [
        "$JS.API.STREAM.UPDATE.*"
        "$JS.API.STREAM.DELETE.*"
      ]
    }
    subscribe = ">"
  }
  users: [
{user: test, password: test, permissions: $DISCOVERY_NODE} # todo: remove
{user: admin, password: admin, permissions: $ADMIN} # todo: remove
${peers
  .map(
    (p) =>
      `{nkey: ${p.nkey}, permissions: $DISCOVERY_NODE} # ${p.ip} ${p.host} ${p.wallet} `
  )
  .join('\n')}
  ]
}

monitor_port: 8222
`
}
