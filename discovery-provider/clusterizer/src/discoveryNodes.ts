import { promises } from 'fs'

const Audius = require('@audius/libs')

const stageConfig = {
  tokenAddress: '0x74f24429ec3708fc21381e017194A5711E93B751',
  registryAddress: '0xe39b1cA04fc06c416c4eaBd188Cb1330b8FED781',
  providers: 'https://eth.staging.audius.co',
  ownerWallet: '0xcccc7428648c4AdC0ae262D3547584dDAE25c465',
}

const prodConfig = {
  tokenAddress: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998',
  registryAddress: '0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C',
  providers: 'https://eth.audius.co',
  ownerWallet: '0xC7310a03e930DD659E15305ed7e1F5Df0F0426C5',
}

type ServiceProvider = {
  owner: string
  endpoint: string
  spID: number
  type: string
  blockNumber: number
  delegateOwnerWallet: string
}

export async function getDiscoveryNodeList(
  isProd: boolean
): Promise<ServiceProvider[]> {
  const ethWeb3Config = isProd ? prodConfig : stageConfig
  const libs = new Audius({ ethWeb3Config })
  await libs.init()

  const discoveryNodes = await libs.ServiceProvider.listDiscoveryProviders()
  console.log(discoveryNodes)

  // const outfile = isProd ? 'discovery_prod.json' : 'discovery_stage.json'
  // await promises.writeFile(
  //   outfile,
  //   JSON.stringify(discoveryNodes, undefined, 2),
  //   'utf8'
  // )

  // for testing
  // TODO: remove this
  discoveryNodes.push({
    delegateOwnerWallet: '0xE6fc4Fb469FD5348B9977cB050B9c0BcE5f0264e',
  })

  return discoveryNodes
}

// Promise.all([getDiscoveryNodeList(false), getDiscoveryNodeList(true)]).then(
//   () => process.exit(0)
// )
