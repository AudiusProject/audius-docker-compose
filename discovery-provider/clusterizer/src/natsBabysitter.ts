import { connect, JSONCodec, NatsConnection, nkeyAuthenticator } from 'nats'
import { getConfig, jetstreamSubject } from './config'
import { getAnnotatedDiscoveryPeers } from './peering'
import { writeNatsConfig } from './natsClusterConfig'
import { startJetstreamListener } from './natsListener'
import { exec } from './junk'
import { DiscoveryPeer } from './types'

let natsClient: NatsConnection | undefined

// use json for crappy array deep equal
let lastPeersJson = ''
let noDiffCounter = 0

const jc = JSONCodec()
const { nkey, wallet, codec } = getConfig()

export async function startNatsBabysitter() {
  while (true) {
    const peers = await getAnnotatedDiscoveryPeers()
    const peersJson = JSON.stringify(peers)

    // if no changes, linear backoff up to x minutes
    if (lastPeersJson == peersJson) {
      // ensure nats client
      // todo: make client less hacky
      await dialNats(peers)

      noDiffCounter++
      const sleepMinutes = Math.min(noDiffCounter, 3)
      await sleep(1000 * 60 * sleepMinutes)
      continue
    }

    if (peers.length < 2) {
      console.log(`${peers.length} is not enough peers... `)
      await sleep(1000 * 10)
      continue
    }

    console.log({ msg: 'updating nats config', peerCount: peers.length })
    await writeNatsConfig(peers)
    await reloadNats()

    // nats client trash
    // todo: make better
    await dialNats(peers)

    // while things are changing, update every minute
    noDiffCounter = 0
    lastPeersJson = peersJson
    await sleep(1000 * 60)
  }
}

export function getNatsClient() {
  return natsClient
}

async function dialNats(peers: DiscoveryPeer[]) {
  // TODO: this is a dumb race condition...
  // TODO: better nats client stuff
  if (natsClient) {
    console.log('natsClient already exists...... skipping')
    return
  }
  const servers = peers.map((s) => s.ip)
  console.log({ msg: 'creating nats client', servers })
  natsClient = await connect({
    servers,
    authenticator: nkeyAuthenticator(nkey.getSeed()),
    // debug: true,
  })
    .then(async (nats) => {
      try {
        // ensure jetstream
        const jsm = await nats.jetstreamManager({ timeout: 20000 })

        const created = await jsm.streams.add({
          name: jetstreamSubject,
          subjects: [jetstreamSubject],
          num_replicas: 3,
          deny_delete: true,
          deny_purge: true,
        })
        console.log('jetstream created')
      } catch (e) {
        console.log('create jetstream failed', e)
      }

      // // start in separate "thread"
      startJetstreamListener(nats, codec, `consumer999:${wallet}`)

      return nats
    })
    .catch((err) => {
      console.log('dial nats failed', err)
      console.log('probably need to: generate config file + restart local nats')
      return undefined
    })
}

async function reloadNats() {
  try {
    const { stdout, stderr } = await exec(`nats-server --signal reload`)
    console.log('reload nats OK')
  } catch (e) {
    return restartNats()
  }
  await sleep(1000)
}

async function restartNats() {
  const { stdout, stderr } = await exec(
    `pm2 start ecosystem.config.cjs --only nats2`
  )
  console.log('started nats')
  await sleep(3000)
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
