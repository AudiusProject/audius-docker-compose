import { PeerInfo } from './types'

export function buildNatsConfig(peers: PeerInfo[]) {
  return `
server_name: $audius_delegate_owner_wallet

websocket {
  port: 4242
  no_tls: true
}

jetstream {
  store_dir: /nats/storage
  max_mem: 1G
  max_file: 10G
}

cluster {
  name: C1
  listen: 0.0.0.0:6222
  routes: [
${peers.map((p) => `nats://${p.ip}:6222 # ${p.host} `).join('\n')}
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
  .map((p) => `{nkey: ${p.nkey}, permissions: $DISCOVERY_NODE} # ${p.host} `)
  .join('\n')}
  ]
}

monitor_port: 8222
`
}
