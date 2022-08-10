import { promises } from 'fs'
import { PeerInfo } from './types'

function buildNatsConfig(peers: PeerInfo[]) {
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
${peers.map((p) => `nats://${p.ip}:6222`).join('\n')}
  ]
}

authorization: {
  DISCOVERY_NODE = {
    publish: [
      "testing.>"
    ]
    subscribe: ["PUBLIC.>", "_INBOX.>", "testing.>"]
  }
  users: [
${peers
  .map((p) => `{nkey: ${p.nkey}, permissions: $DISCOVERY_NODE}`)
  .join('\n')}
  ]
}

monitor_port: 8222
`
}

async function generateNatsConfig() {
  const config = buildNatsConfig([
    {
      ip: '1.1',
      nkey: 'U123',
    },
    {
      ip: '1.2',
      nkey: 'U125',
    },
    {
      ip: '1.2',
      nkey: 'U125',
    },
  ])

  await promises.writeFile('/nats_config/generated.conf', config, 'utf8')
}

generateNatsConfig()
