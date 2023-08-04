const axios = require('axios')
const { program } = require('commander')
const HashIds = require('./hashIds')
const { generateSignature } = require('../apiSigning')

// Required env variables
const PRIVATE_KEY = process.env.delegatePrivateKey
const CREATOR_NODE_ENDPOINT = process.env.creatorNodeEndpoint
const DISCOVERY_PROVIDER_ENDPOINT = process.env.discoveryProviderEndpoint

const hashIds = new HashIds()

async function sendDelistRequest(entity, delisted) {
  if (entity.trackId) entity.trackId = parseInt(entity.trackId)
  if (entity.userId) entity.userId = parseInt(entity.userId)
  entity = { ...entity, delisted, timestamp: Date.now() }
  const signature = generateSignature(entity, PRIVATE_KEY)

  console.log(encodeURIComponent(JSON.stringify({ signature, data: JSON.stringify(entity) })))
  try {
    await axios({
      url: `${CREATOR_NODE_ENDPOINT}/delist_status/insert`,
      method: 'post',
      params: { signature: JSON.stringify({ signature, data: JSON.stringify(entity) }) },
      data: entity,
      responseType: 'json',
      timeout: 3000,
    })
    console.info(`Successfully set: ${JSON.stringify(entity)}`)
  } catch (e) {
    console.error(`Failed to set: ${JSON.stringify(entity)} because: ${e}`)
  }
}

const getIdType = (id) => {
  // Check if it's a CID (either v0 or v1)
  if ((id.startsWith('Qm') && id.length === 46) || (id.startsWith('ba') && id.length > 46)) {
    return 'CID'
  }

  // Check if it's an encoded id (alphanumeric and not all digits)
  if (/\D/.test(id) && /^[0-9a-zA-Z]+$/.test(id)) {
    return 'HASH_ID'
  }

  // Check if it's a decoded id (all digits)
  if (/^\d+$/.test(id)) {
    return 'ID'
  }

  return 'ERR'
}

async function getTrackInfo(trackId) {
  try {
    const resp = await axios({
      url: `${DISCOVERY_PROVIDER_ENDPOINT}/tracks`,
      method: 'get',
      params: { id: trackId },
      responseType: 'json',
      timeout: 3000,
    })
    return { trackId, trackCid: resp.data.data[0].track_cid, ownerId: resp.data.data[0].owner_id }
  } catch (e) {
    console.log(`Not changing delist status for track because we failed to retrieve its info (trackId: ${trackId}): ${e}`)
  }
}

async function getTracksForUser(userId) {
  const resp = await axios({
    url: `${DISCOVERY_PROVIDER_ENDPOINT}/tracks`,
    method: 'get',
    params: { user_id: userId },
    responseType: 'json',
    timeout: 3000,
  })

  return resp.data.data.map((track) => {
    return { trackId: track.track_id, trackCid: track.track_cid, ownerId: track.owner_id }
  })
}

async function setTrackDelisted(idStr, delisted) {
  const idType = getIdType(idStr)
  if (idType === 'ERR' || idType === 'CID') {
    console.error(`Invalid id: ${idStr}. Note that CIDs are not supported for delisting individual tracks.`)
    return
  }

  const trackId = idType === 'HASH_ID' ? hashIds.decode(idStr) : idStr
  const track = await getTrackInfo(trackId)
  if (track) await sendDelistRequest(track, delisted)
}

async function setUserDelisted(idStr, delisted) {
  const idType = getIdType(idStr)
  if (idType === 'ERR' || idType === 'CID') {
    console.error(`Invalid id: ${idStr}`)
    return
  }

  const userId = idType === 'HASH_ID' ? hashIds.decode(idStr) : idStr

  // If delisting a user, delist all of their tracks as well
  if (delisted) {
    for (const track of await getTracksForUser(userId)) {
      await sendDelistRequest(track, delisted)
    }
  }

  await sendDelistRequest({ userId }, delisted)
}

async function setAllDelisted(trackOrUser, ids, delisted) {
  const actions = {
    'track': setTrackDelisted,
    'user': setUserDelisted
  }
  const action = actions[trackOrUser]
  if (!action) {
    throw new Error(`Invalid type: ${trackOrUser}. Options are 'track' or 'user'`)
  }
  
  await Promise.all(ids.map(id => action(id, delisted)))
}

const COMMANDER_HELP_STRING =
`<action> <type> <ids>

// Example usage:
// node delistContent/index.js delist track 1,7eP5n
// node delistContent/index.js delist user 1,ML51L
// node delistContent/index.js undelist track 1,7eP5n
// node delistContent/index.js undelist user 1,ML51L
`

async function main() {
  program
    .command('delist <trackOrUser> <ids>')
    .description(`Prevent content from being served by your content node. When delisting a user, all of their tracks will be delisted as well.`)
    .usage(COMMANDER_HELP_STRING)
    .action(async (trackOrUser, ids) => setAllDelisted(trackOrUser.toLowerCase(), ids.split(','), true))

  program
    .command('undelist <trackOrUser> <ids>')
    .description(`Allow content to be served by your content node. When undelisting a user, you have to separately undelist the desired tracks.`)
    .usage(COMMANDER_HELP_STRING)
    .action(async (trackOrUser, ids) => setAllDelisted(trackOrUser.toLowerCase(), ids.split(','), false))

  // Ensure env vars are set
  if (!CREATOR_NODE_ENDPOINT || !PRIVATE_KEY || !DISCOVERY_PROVIDER_ENDPOINT) {
    console.error(`Creator node endpoint [${CREATOR_NODE_ENDPOINT}], private key [${PRIVATE_KEY}], or discovery provider endpoint [${DISCOVERY_PROVIDER_ENDPOINT}] have not been exported.`)
    process.exit(1)
  }
  
  // Run the program
  try {
    await program.parseAsync(process.argv)
    process.exit(0)
  } catch (e) {
    console.error('Error running the script:', e)
    process.exit(1)
  }
}

main()
