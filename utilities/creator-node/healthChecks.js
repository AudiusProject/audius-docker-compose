const axios = require('axios')
const FormData = require('form-data')
const assert = require('assert')

const { generateTimestampAndSignatureForSPVerification } = require('./apiSigning')

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

async function healthCheckDB () {
  let requestConfig = {
    url: `${CREATOR_NODE_ENDPOINT}/db_check`,
    method: 'get',
    responseType: 'json'
  }
  let resp = await axios(requestConfig)
  assert.deepStrictEqual(resp.status, 200)
  console.log('✓ DB health check passed')
}

async function healthCheckDisk () {
  let requestConfig = {
    url: `${CREATOR_NODE_ENDPOINT}/disk_check`,
    method: 'get',
    responseType: 'json'
  }
  let resp = await axios(requestConfig)
  let data = resp.data
  assert.deepStrictEqual(resp.status, 200)
  assert.deepStrictEqual(data.data.storagePath, '/file_storage')
  const [size, magnitude] = data.data.available.split(' ')
  assert.deepStrictEqual(magnitude, 'TB')
  assert.ok(parseFloat(size) > 1.5, 'Minimum available disk space should be 2 TB')
  console.log('✓ Disk health check passed')
}

// This is the heartbeat route. It should always pass
async function healthCheckDurationHeartbeat () {
  if (!SP_ID) {
    console.error('This cannot be run without a valid spID. If your node is not registered and does not have an spID yet, please contact a node operator with a registered node to run this test')
    return
  }

  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect usage: ${e.message}`)
    return
  }

  try {
    // Generate signature using local key
    const { timestamp, signature } = generateTimestampAndSignatureForSPVerification(SP_ID, PRIVATE_KEY)
    let requestConfig = {
      url: `${CREATOR_NODE_ENDPOINT}/health_check/duration/heartbeat`,
      method: 'get',
      params: {
        spID: SP_ID,
        timestamp,
        signature
      },
      responseType: 'json'
    }
    let resp = await axios(requestConfig)
    assert.deepStrictEqual(resp.status, 200)
    console.log('✓ Heartbeat duration health check passed')
  } catch (e) {
    console.error(e)
  }
}

// Test the non heartbeat route. There's a chance this could time out so handle accordingly
async function healthCheckDuration () {
  if (!SP_ID) {
    console.error('This cannot be run without a valid spID. If your node is not registered and does not have an spID yet, please contact a node operator with a registered node to run this test')
    return
  }
  let start = Date.now()

  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect usage: ${e.message}`)
    return
  }

  try {
    // Generate signature using local key
    const { timestamp, signature } = generateTimestampAndSignatureForSPVerification(SP_ID, PRIVATE_KEY)
    let requestConfig = {
      url: `${CREATOR_NODE_ENDPOINT}/health_check/duration`,
      method: 'get',
      params: {
        spID: SP_ID,
        timestamp,
        signature
      },
      responseType: 'json'
    }
    const resp = await axios(requestConfig)
    console.log('✓ Non-heartbeat duration health check passed')
  } catch (e) {
    if (e.message.includes('504')) {
      console.log(`! Non-heartbeat duration health check timed out at ${Math.floor((Date.now() - start) / 1000)} seconds with error message: "${e.message}". This is not an issue.`)
    } else {
      throw new Error(`Non-heartbeat duration health check timed out at ${Math.floor((Date.now() - start) / 1000)} seconds with error message: "${e.message}".`)
    }
  }
}

// Test the file upload limit
async function healthCheckFileUpload () {
  if (!SP_ID) {
    console.error('This cannot be run without a valid spID. If your node is not registered and does not have an spID yet, please contact a node operator with a registered node to run this test')
    return
  }

  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect usage: ${e.message}`)
    return
  }

  try {
    // Generate signature using local key
    const { timestamp, signature } = generateTimestampAndSignatureForSPVerification(SP_ID, PRIVATE_KEY)

    let sampleTrack = new FormData()
    sampleTrack.append('file', (await axios({
      method: 'get',
      url: 'https://s3-us-west-1.amazonaws.com/download.audius.co/sp-health-check-files/97mb_music.mp3', // 97 MB
      responseType: 'stream'
    })).data)

    let requestConfig = {
      headers: {
        ...sampleTrack.getHeaders()
      },
      url: `${CREATOR_NODE_ENDPOINT}/transcode_and_segment`,
      method: 'post',
      params: {
        spID: SP_ID,
        timestamp,
        signature
      },
      responseType: 'json',
      data: sampleTrack,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30_000 // 30sec
    }
    let transcodeResp = await axios(requestConfig)
    const uuid = transcodeResp.data.data.uuid

    const MAX_TRACK_TRANSCODE_TIMEOUT = 3600000 // 1 hour
    const POLL_STATUS_INTERVAL = 3000 // 3s
    let TRANSCODE_STATE = { successful: false, data: null }

    // this is pulled directly from pollProcessingStatus in libs/services/creatorNode/CreatorNode.ts
    const start = Date.now()
    while (Date.now() - start < MAX_TRACK_TRANSCODE_TIMEOUT) {
      try {
        const processingStatusResp = await axios({
          url: `${CREATOR_NODE_ENDPOINT}/async_processing_status`,
          params: {
            uuid
          },
          method: 'get'
        })
        const { status } = processingStatusResp.data.data

        if (status && status === 'DONE') {
          TRANSCODE_STATE.successful = true
          TRANSCODE_STATE.data = processingStatusResp.data.data
          break
        }
        if (status && status === 'FAILED') {
          console.error(`Track content async upload failed: uuid=${uuid}, error=`, processingStatusResp)
        }
      } catch (e) {
        // Catch errors here and swallow them. Errors don't signify that the track
        // upload has failed, just that we were unable to establish a connection to the node.
        // This allows polling to retry
        console.error(`Failed to poll for processing status, ${e}`)
      }

      await wait(POLL_STATUS_INTERVAL)
    }

    if (!TRANSCODE_STATE.successful) {
      throw new Error(
        `Track content async upload took over ${MAX_TRACK_TRANSCODE_TIMEOUT}ms. uuid=${uuid}`
      )
    }

    // console.debug("Successfully got the transcode response for uuid: ", uuid)
    // console.debug(JSON.stringify(TRANSCODE_STATE))

    // fetch a track segment
    const segmentFileName = TRANSCODE_STATE.data.resp.segmentFileNames[0]
    const fileNameNoExtension = TRANSCODE_STATE.data.resp.fileName.split('.')[0]

    const { timestamp: timestamp2, signature: signature2 } = generateTimestampAndSignatureForSPVerification(SP_ID, PRIVATE_KEY)
    const fetchSegmentResp = await axios({
      url: `${CREATOR_NODE_ENDPOINT}/transcode_and_segment`,
      method: 'get',
      params: {
        fileName: segmentFileName,
        fileType: 'segment',
        uuid: fileNameNoExtension,
        timestamp: timestamp2,
        signature: signature2,
        spID: SP_ID
      },
      responseType: 'stream',
      timeout: 10_000 // 10s
    })

    assert.deepStrictEqual(fetchSegmentResp.headers['content-length'], '254552')

    // clear the track data on the node
    let clearRequestConfig = {
      url: `${CREATOR_NODE_ENDPOINT}/clear_transcode_and_segment_artifacts`,
      method: 'post',
      params: {
        spID: SP_ID,
        timestamp,
        signature
      },
      data: {
        fileDir: TRANSCODE_STATE.data.resp.fileDir
      },
      responseType: 'json'
    }
    await axios(clearRequestConfig)

    console.log('✓ File upload health check passed')
  } catch (e) {
    console.error(e)
    throw new Error(`File upload health check errored with error message: "${e.message}".`)
  }
}

async function run () {
  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect script usage: ${e.message}`)
    process.exit(1)
  }
  try {
    console.log(`Starting tests now. This may take a few minutes.`)
    await healthCheck()
    await healthCheckDB()
    await healthCheckDisk()
    await healthCheckFileUpload()
    await healthCheckDurationHeartbeat()
    await healthCheckDuration()
    console.log("All checks passed!")
    process.exit(0)
  } catch (e) {
    console.error(`Error running script: ${e.message}`)
    process.exit(1)
  }
}

run()
