import { connect, nkeyAuthenticator, StringCodec } from 'nats'
import { getConfig } from './config'

const { codec, nkey } = getConfig()

async function main() {
  const nc = await connect({
    servers: 'nats:4222',
    authenticator: nkeyAuthenticator(nkey.getSeed()),
  })
  const sc = StringCodec()

  const sub = nc.subscribe('testing.one')
  ;(async () => {
    for await (const m of sub) {
      console.log(`[${sub.getProcessed()}]: ${sc.decode(m.data)}`)
    }
    console.log('subscription closed')
  })()

  nc.publish('testing.one', sc.encode('world'))
  nc.publish('testing.one', sc.encode('again'))
}

main()
