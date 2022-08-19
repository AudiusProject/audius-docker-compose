import { connect, NatsConnection } from 'nats'
import pm2, { restart } from 'pm2'
import { natsHost } from './config'
import { theGraphFetcher } from './discoveryNodes2'
import { writeNatsConfig } from './natsClusterConfig'

let natsClient: NatsConnection | undefined

export async function startNatsBabysitter() {
  while (true) {
    const servers = await theGraphFetcher('staging', 'discovery-node')
    const hostnames = servers.map((s) => new URL(s.endpoint).hostname)

    // todo: should only restart if the config changed
    await writeNatsConfig(servers)

    await restartNats()

    await dialNats(hostnames)

    await sleep(1000 * 60 * 5)
  }
}

export function getNatsClient() {
  return natsClient
}

async function dialNats(servers: string[]) {
  natsClient = await connect({
    servers: natsHost,
    // authenticator: usernamePasswordAuthenticator('public', 'public'),
    // authenticator: nkeyAuthenticator(nkey.getSeed()),
  })
    .then(async (nats) => {
      setInterval(() => {
        nats.publish('hello')
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

async function restartNats() {
  return new Promise((resolve, reject) => {
    pm2.start('nats-server', (err, ok) => {
      if (err) {
        return reject(err)
      }
      // wait a second to ensure nats booted
      setTimeout(() => {
        resolve(ok)
      }, 1000)
    })
  })
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
