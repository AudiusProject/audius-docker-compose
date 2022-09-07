import knex, { Knex } from 'knex'

export const pg = knex({
  client: 'pg',
  connection: process.env.audius_db_url,
  searchPath: ['public'],
})

async function migrate() {
  await pg.raw(`
    create table if not exists pubkeys (
      wallet text primary key,
      pubkey text
    );

    create table if not exists rpclog (
      cuid text primary key,
      wallet text,
      method text,
      params jsonb,
      jetstream_seq int
    );

    create index if not exists rpclog_wallet_idx on rpclog(wallet);
    create index if not exists rpclog_method_idx on rpclog(method);
  `)
}

export type Pubkey = {
  wallet: string
  pubkey: string
}

export type Rpclog = {
  cuid: string
  wallet: string
  method: string
  params: any
  jetstream_seq: number
}

export const PubkeyTable = () => pg<Pubkey>('pubkeys')
export const RpclogTable = () => pg<Rpclog>('rpclog')

if (process.env.audius_db_run_migrations) {
  migrate().then((ok) => {
    console.log('ran migrations')
  })
}
