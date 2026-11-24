// scripts/setup.ts
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { findChromium } from './browser.ts'


/**
 * Get a fresh checkout ready to work in, and say what it found.
 *
 *   bun run setup
 *
 * Checks the one thing a run cannot do without (a browser to take pictures
 * with), applies the library stack, writes the library's API digest, starts
 * building the reference that `bun run diff` will compare against, and prints
 * the brief.
 */

const ROOT = resolve(import.meta.dir, '..')

function tool (command: string, ...args: string[]): string {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ]}).trim()
      .split('\n')[0] ?? ''
  }
  catch {
    return 'not found'
  }
}

function browser (): string {
  try {
    const path = findChromium()

    return `${path} · ${tool(path, '--version')}`
  }
  catch {
    // Without a browser there are no pictures, and so no visual check at all.
    return 'NOT FOUND · shot, diff and the full gate cannot run here. Use `bun run gate --quick`, choose a change you can verify without looking, and say so in the journal.'
  }
}

async function main (): Promise<void> {
  console.log('setup')
  console.log(`  bun        ${Bun.version}`)
  console.log(`  node       ${tool('node', '--version')}`)
  console.log(`  chromium   ${browser()}`)

  // Before the digest: the digest is read from the package as the stack leaves it.
  const stack = Bun.spawn([ 'bun', 'scripts/stack/index.ts' ], { cwd: ROOT, stdout: 'pipe', stderr: 'ignore' })

  console.log(`  ${(await new Response(stack.stdout).text()).trim().replaceAll('\n', '\n  ')}`)

  const digest = Bun.spawn([ 'bun', 'scripts/api-digest.ts' ], { cwd: ROOT, stdout: 'pipe', stderr: 'ignore' })

  console.log(`  ${(await new Response(digest.stdout).text()).trim()}`)

  // The reference build is the slow half of a diff and depends on nothing in
  // this working tree, so it starts now and is ready by the time it is wanted.
  Bun.spawn([ 'bun', 'scripts/diff.ts', '--ref-only' ], { cwd: ROOT, stdout: 'ignore', stderr: 'ignore' }).unref()
  console.log('  reference  building origin/main in the background for `bun run diff`')

  const brief = Bun.spawn([ 'bun', 'scripts/brief.ts' ], { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' })

  await brief.exited
}

await main()
