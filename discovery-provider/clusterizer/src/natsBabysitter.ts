import { connect, JSONCodec, NatsConnection, nkeyAuthenticator } from 'nats'
import { getConfig, jetstreamSubject } from './config'
import { getAnnotatedDiscoveryPeers } from './peering'
import { writeNatsConfig } from './natsClusterConfig'
import { startJetstreamListener } from './natsListener'
import { exec, sleep } from './junk'
import { DiscoveryPeer } from './types'
import { printNethermindConfigForPeers } from './nethermind'

let natsPromise: Promise<NatsConnection> | undefined

let noDiffCounter = 0

const { nkey, wallet, codec } = getConfig()

export async function startNatsBabysitter() {
  while (true) {
    const peers = await getAnnotatedDiscoveryPeers()

    // TODO: should keep a persistent list of peers
    // that should be "add only" type of thing
    const changed = await writeNatsConfig(peers)

    // TODO: this is just here for now for testing...
    // since we don't keep a persistent list of peers
    // we use the local `peers` here
    printNethermindConfigForPeers(peers)

    // if no changes, linear backoff up to x minutes
    if (!changed) {
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
    await reloadNats()

    // nats client trash
    // todo: make better
    await dialNats(peers)

    // while things are changing, update every minute
    noDiffCounter = 0
    await sleep(1000 * 60)
  }
}

export async function getNatsClient() {
  return natsPromise
}

async function dialNats(peers: DiscoveryPeer[]) {
  if (natsPromise) {
    return
  }
  const servers = peers.map((s) => s.ip)
  console.log({ msg: 'creating nats client', servers })
  natsPromise = connect({
    servers,
    authenticator: nkeyAuthenticator(nkey.getSeed()),
  }).then(async (nats) => {
    await ensureJetstream(nats)

    // start in separate "thread"
    startJetstreamListener(nats, codec, `consumer999:${wallet}`)

    return nats
  })
}

async function ensureJetstream(nats: NatsConnection) {
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
