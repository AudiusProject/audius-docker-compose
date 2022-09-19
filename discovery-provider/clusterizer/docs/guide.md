# NATS Guide

Let's suppose you're going to add a new feature that uses NATS for the write path.  Here's what you'd do!

## 1. Determine method name + schema.

We're aiming for a DX similar to [trpc](https://trpc.io/) which uses [JSON RPC](https://www.jsonrpc.org/specification).

Per JSON RPC, an RPC call might look like:

```ts
const comment_id = cuid()
{
  id: `track_comment.add.${comment_id}`,
  method: 'track_comment.add',
  params: {
    comment_id,
    track_id: 123,
    position_ms: 3125,
    comment: 'sick drop',
  }
}
```

> `id` field is optional in JSON RPC spec, but is currently required by the `rpclog` table, so must be specified.  The intent of `id` field is to uniquely identify operation so that duplicate messages with the same ID can be skipped.

maybe later:

```ts
{
  id: cuid(),
  method: 'track_comment.update',
  params: {
    comment_id,
    comment: 'sick drop bro!',
  }
}
```

finally:

```ts
{
  id: `track_comment.delete.${comment_id}`,
  method: 'track_comment.delete',
  params: {
    comment_id,
  }
}
```

## 2. Add client code to send these RPC messages

See: https://github.com/AudiusProject/audius-client/pull/1881

Eventually we should have a nice client with schema + validator + http client stuff, but to do it "by hand":

```ts
  const audiusLibs = window.audiusLibs
  const wallet = audiusLibs.Account.hedgehog.getWallet()
  const privateKey = wallet.privateKey

  const codec = new ChantCodec(privateKey)

  const comment_id = cuid()
  const signed = codec.encode({
    id: `track_comment.add.${comment_id}`,
    method: 'track_comment.add',
    params: {
      comment_id,
      track_id: 123,
      position_ms: 3125,
      comment: 'sick drop',
    }
  })

  const resp = await fetch(baseUrl() + '/clusterizer/op', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-audius-msg'
    },
    body: signed
  })

  console.log(resp.status)
```

## 3. Verify RPCs are making it

After running code you can do this on any staging discovery database:

```
select * from rpclog where method = 'track_comment.add';
```

If events are not making it, view logs:

```
ssh stage-discovery-2
docker logs -f clusterizer
```

## 4. Write further processing code

Details tbd.  Some options:

* python code polls `rpclog` table and creates records in other tables
* pl/pgsql trigger code processes inserts into `rpclog` table
* add typescript code to `natsListener.ts` to take further specific actions after generic `rpclog` insert (preferred)

## 5. Query data

Details also tbd.  Some options:

* traditional REST style GET endpoints
* graphql api
* trpc "query" methods


atm DMs demo does has a trpc "query" style endpoint (`/clusterizer/query`).

Currently the response is JSON encoded but it would make sense to use the codec encoding to get nicer msgpack encoding and also every response would be signed by discovery keypair transparently.


