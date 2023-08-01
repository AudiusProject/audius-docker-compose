const axios = require('axios')
const assert = require('assert')

const PRIVATE_KEY = process.env.delegatePrivateKey
const CREATOR_NODE_ENDPOINT = process.env.creatorNodeEndpoint
const SP_ID = process.env.spId

async function wait (milliseconds) {
  await new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  )
}

/**
 * Parses the environment variables and command line args
 * export creatorNodeEndpoint=http://creatornode.domain.com
 * export delegatePrivateKey=f0b743ce8adb7938f1212f188347a63...
 * NOTE: DO NOT PREFIX PRIVATE KEY WITH 0x
 */
function parseEnvVarsAndArgs () {
  if (!CREATOR_NODE_ENDPOINT || !PRIVATE_KEY) {
    let errorMsg = `creatorNodeEndpoint [${CREATOR_NODE_ENDPOINT}] or delegatePrivateKey [${PRIVATE_KEY}] have not been exported. `
    errorMsg += "Please export environment variables 'delegatePrivateKey' (without leading 0x) and 'creatorNodeEndpoint' with https."
    throw new Error(errorMsg)
  }
}

async function healthCheck () {
  let requestConfig = {
    url: `${CREATOR_NODE_ENDPOINT}/health_check`,
    method: 'get',
    responseType: 'json'
  }
  let resp = await axios(requestConfig)
  let data = resp.data
  assert.deepStrictEqual(resp.status, 200)
  assert.deepStrictEqual(data.data.healthy, true)
  assert.ok(
    data.data.selectedDiscoveryProvider !== null && data.data.selectedDiscoveryProvider !== undefined,
    `Selected discovery provider should not be null or undefined`
  )
  assert.ok(
    data.signature !== null && data.signature !== undefined,
    `Signature should not be null or undefined`
  )
  assert.ok(
    data.data.spOwnerWallet !== null && data.data.spOwnerWallet !== undefined,
    `spOwnerWallet should not be null or undefined`
  )
  console.log('✓ Health check passed')
}

async function run () {
  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect script usage: ${e.message}`)
    process.exit(1)
  }
  try {
    console.log(`Checking health...`)
    await healthCheck()
    console.log("Health check passed!")
    process.exit(0)
  } catch (e) {
    console.error(`Error running script: ${e.message}`)
    process.exit(1)
  }
}

run()
