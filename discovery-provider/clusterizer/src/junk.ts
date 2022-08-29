import { exec as execCallback } from 'child_process'
import util from 'node:util'

export const exec = util.promisify(execCallback)

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
