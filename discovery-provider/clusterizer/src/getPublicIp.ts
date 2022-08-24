import { request } from 'undici'

export async function getPublicIpAddress() {
  if (process.env.audius_discprov_env == 'test') {
    return process.env.HOST
  }
  const { body } = await request('http://ip-api.com/json')
  const data = await body.json()
  const ip = data.query
  return ip
}

// async function ip1() {
//   const { body } = await request('http://ifconfig.me')
//   const ip = await body.text()
//   return ip
// }
