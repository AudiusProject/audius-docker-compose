import { connect, JSONCodec, nkeyAuthenticator, StringCodec } from 'nats'
import { getConfig } from './config'

const { wallet, nkey } = getConfig()

async function main() {
  const nc = await connect({
    servers: 'nats:4222',
    authenticator: nkeyAuthenticator(nkey.getSeed()),
  })
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

  nc.publish(
    'testing.one',
    sc.encode({ wallet, nkey: nkey.getPublicKey(), time: new Date() })
  )
}

main()
