import { exec as execCallback } from 'child_process'
import { connect, JSONCodec, NatsConnection, nkeyAuthenticator } from 'nats'
import util from 'node:util'
import { getConfig } from './config'
import { getAnnotatedDiscoveryPeers } from './getDiscoveryPeers'
import { writeNatsConfig } from './natsClusterConfig'

const exec = util.promisify(execCallback)

let natsClient: NatsConnection | undefined

// use json for crappy array deep equal
let lastPeersJson = ''
let noDiffCounter = 0

const jc = JSONCodec()
const { nkey, wallet } = getConfig()

export async function startNatsBabysitter() {
  while (true) {
    const peers = await getAnnotatedDiscoveryPeers()
    const peersJson = JSON.stringify(peers)

    // if no changes, linear backoff up to 10 minutes
    if (lastPeersJson == peersJson) {
      noDiffCounter++
      const sleepMinutes = Math.min(noDiffCounter, 10)
      await sleep(1000 * 60 * sleepMinutes)
      continue
    }

    if (peers.length == 0) {
      console.log('------------ NO PEERS!!')
      await sleep(1000 * 10)
      continue
    }

    console.log({ msg: 'updating nats config', peerCount: peers.length })
    await writeNatsConfig(peers)
    await reloadNats()

    const hostnames = peers.map((s) => s.ip)
    await dialNats(hostnames)

    // while things are changing, update every minute
    noDiffCounter = 0
    lastPeersJson = peersJson
    await sleep(1000 * 60)
  }
}

export function getNatsClient() {
  return natsClient
}

async function dialNats(servers: string[]) {
  // TODO: this is a dumb race condition...
  // TODO: better nats client stuff
  if (natsClient) {
    console.log('natsClient already exists... skipping')
    return
  }
  console.log({ msg: 'creating nats client', servers })
  natsClient = await connect({
    servers,
    authenticator: nkeyAuthenticator(nkey.getSeed()),
  })
    .then(async (nats) => {
      setInterval(() => {
        nats.publish(
          'testing.hello',
          jc.encode({ wallet, nkey: nkey.getPublicKey() })
        )
      }, 2000)

      // ensure jetstream
      // const jsm = await nats.jetstreamManager()

      // const created = await jsm.streams.add({
      //   name: jetstreamSubject,
      //   subjects: [jetstreamSubject],
      //   num_replicas: 3,
      //   deny_delete: true,
      //   deny_purge: true,
      // })
      // console.log('jetstream created', created)

      // // start in separate "thread"
      // startJetstreamListener(nats, codec, `consumer999:${wallet}`)

      return nats
    })
    .catch((err) => {
      console.log('dial nats failed', err)
      console.log('probably need to: generate config file + restart local nats')
      return undefined
    })
}

let natsStarted = false

async function reloadNats() {
  if (!natsStarted) {
    return restartNats()
  }

  try {
    const { stdout, stderr } = await exec(`nats-server --signal reload`)
    console.log('reload nats OK', stdout, stderr)
  } catch (e) {
    console.log('reload nats ERR', e)
  }
  await sleep(1000)
}

async function restartNats() {
  const { stdout, stderr } = await exec(
    `pm2 start ecosystem.config.cjs --only nats2`
  )
  natsStarted = true
  await sleep(1000)
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
