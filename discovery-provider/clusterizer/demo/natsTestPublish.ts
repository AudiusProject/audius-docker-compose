import { connect, JSONCodec, nkeyAuthenticator, StringCodec } from 'nats'
import { getConfig } from '../src/config'

const { wallet, nkey } = getConfig()

async function main() {
  const nc = await connect({
    servers: 'nats:4222',
    authenticator: nkeyAuthenticator(nkey.getSeed()),
  })

  // create test stream
  // don't have permissions atm
  // const jsm = await nc.jetstreamManager()

  // const created = await jsm.streams.add({
  //   name: 'stream1',
  //   subjects: ['stream1.>'],
  //   num_replicas: 3,
  //   deny_delete: true,
  //   deny_purge: true,
  // })

  // console.log(created)

  const sc = JSONCodec()

  const sub = nc.subscribe('testing.one')
  ;(async () => {
    for await (const m of sub) {
      const idx = sub.getProcessed()
      const data = sc.decode(m.data)
      console.log(idx, data)
    }
    console.log('subscription closed')
  })()

  setInterval(() => {
    nc.publish(
      'testing.one',
      sc.encode({ wallet, nkey: nkey.getPublicKey(), time: new Date() })
    )
  }, 5000)
}

main()
