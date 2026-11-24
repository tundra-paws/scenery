// scripts/site/apply.ts
// Runs under plain `node` (type stripping): node built-ins only. This is the
// step that writes to the published site, in a job that holds a write token, so
// it installs nothing and executes nothing it is handed. It copies files.
import { createHash } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from '../args.ts'


const SCHEMA = 1

/** What a payload may contain at its top level. */
const PAYLOAD = [ 'iteration', 'vendor', 'shell', 'meta.json' ]

/** Names at the site root that belong to the site, which a shell file may not take. */
const RESERVED = [ 'i', 'v', 'iterations.json', 'latest.webp', '.git', '.shell-files' ]

const VENDOR_DIR   = /^three@\d+\.\d+\.\d+$/u

/**
 * three's own build files: the core, the WebGL renderer over it, and the
 * renderer that draws node materials with the language they are written in.
 * The same list as the gate's contract (`scripts/gate/contract.ts`), which
 * has already checked each against npm's bytes.
 */
const VENDOR_FILES = [
  'three.module.min.js', 'three.core.min.js', 'three.module.js', 'three.core.js',
  'three.webgpu.min.js', 'three.tsl.min.js', 'three.webgpu.js', 'three.tsl.js',
]

/** The shell's file list from the last publish, so files it no longer ships get removed. */
const SHELL_LIST = '.shell-files'

const REQUIRED = [ 'index.html', 'shot.webp', 'thumb.webp' ]

export interface Iteration {
  id:        number
  dir:       string
  date:      string
  sha:       string
  title:     string
  summary:   string
  kind:      string
  model:     string
  journal:   string
  shots:     { hero: string, thumb: string }
  stats:     unknown
  bytes:     { new: number, site: number }
  three:     string
  distHash:  string
  withdrawn: boolean
}

export interface Manifest {
  schema:     number
  repo:       string
  updated:    string
  iterations: Iteration[]
}

export interface ApplyResult {
  verdict: 'published' | 'no-change'

  /** The iteration this build is on the site as: the new one, or the one it matched. */
  id:    number
  dir:   string
  bytes: {
    new:  number
    site: number
  }
}

interface ApplyOptions {

  /** A payload written by the verify step. */
  payload: string

  /** A checkout of the site's storage branch. */
  site: string

  /** `owner/name`, for the links the gallery builds. */
  repo: string

  /** When the publish happens, as ISO text. Passed in so a test can pin it. */
  now?: string
}

interface Meta {
  sha?:      string
  date?:     string
  title?:    string
  summary?:  string
  kind?:     string
  model?:    string
  journal?:  string
  three?:    string
  distHash?: string
  stats?:    unknown
  shots?:    { hero: string, thumb: string }
}

/** Every file under a directory, relative to it. Throws on anything that is not a plain file. */
function listFiles (root: string): string[] {
  const files: string[] = []

  const visit = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      const stat = lstatSync(path)

      if (stat.isDirectory())
        visit(path)
      else if (stat.isFile())
        files.push(relative(root, path).split(sep)
          .join('/'))
      else
        throw new Error(`${relative(root, path)} is not a regular file`)
    }
  }

  visit(root)

  return files
}

function digest (path: string): string {
  return createHash('sha256').update(readFileSync(path))
    .digest('hex')
}

function sizeOf (root: string): number {
  let total = 0

  for (const name of readdirSync(root)) {
    if (name === '.git')
      continue

    const path = join(root, name)
    const stat = lstatSync(path)

    total += stat.isDirectory() ? sizeOf(path) : stat.size
  }

  return total
}

function readManifest (site: string, repo: string): Manifest {
  const path = join(site, 'iterations.json')

  if (!existsSync(path))
    return { schema: SCHEMA, repo, updated: '', iterations: []}

  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest

  if (manifest.schema !== SCHEMA)
    throw new Error(`iterations.json is schema ${manifest.schema}; this script writes schema ${SCHEMA}`)

  return manifest
}

function inspectIteration (payload: string): void {
  const iteration = listFiles(join(payload, 'iteration'))

  for (const name of REQUIRED)
    if (!iteration.includes(name))
      throw new Error(`the payload's iteration has no ${name}`)

  for (const file of iteration)
    if (!REQUIRED.includes(file) && !file.startsWith('a/'))
      throw new Error(`the payload's iteration holds "${file}", which is not part of a build`)
}

function inspectVendor (payload: string): void {
  for (const dir of readdirSync(join(payload, 'vendor'))) {
    if (!VENDOR_DIR.test(dir))
      throw new Error(`"vendor/${dir}" is not a three@<version> directory`)

    for (const file of listFiles(join(payload, 'vendor', dir)))
      if (!VENDOR_FILES.includes(file))
        throw new Error(`"vendor/${dir}/${file}" is not one of three's build files`)
  }
}

function inspectShell (payload: string): void {
  if (!existsSync(join(payload, 'shell')))
    return

  for (const file of listFiles(join(payload, 'shell')))
    if (RESERVED.includes(file.split('/')[0]!))
      throw new Error(`the shell may not ship "${file}": that name belongs to the site`)
}

/** Refuse a payload that is not exactly the shape the verify step writes. */
function inspect (payload: string): Meta {
  for (const name of readdirSync(payload))
    if (!PAYLOAD.includes(name))
      throw new Error(`unexpected "${name}" in the payload`)

  inspectIteration(payload)
  inspectVendor(payload)
  inspectShell(payload)

  return JSON.parse(readFileSync(join(payload, 'meta.json'), 'utf8')) as Meta
}

/**
 * Add what the site does not hold yet of three: a version it has never had,
 * or a build file of a version it has (a world that moves from one of three's
 * renderers to the other at the same version needs the other's files beside
 * the first's). A file already there must be the same bytes: nothing that was
 * published is ever changed, and nothing is removed, so every older iteration
 * still finds what it loaded the day it was made.
 */
function mergeVendor (payload: string, site: string): void {
  for (const dir of readdirSync(join(payload, 'vendor'))) {
    const from = join(payload, 'vendor', dir)
    const to   = join(site, 'v', dir)

    mkdirSync(to, { recursive: true })

    for (const file of listFiles(from)) {
      if (!existsSync(join(to, file))) {
        mkdirSync(dirname(join(to, file)), { recursive: true })
        cpSync(join(from, file), join(to, file))
        continue
      }

      if (digest(join(to, file)) !== digest(join(from, file)))
        throw new Error(`v/${dir}/${file} is already on the site with different bytes: published files never change`)
    }
  }
}

/** Replace the gallery's files, removing any the last publish shipped and this one does not. */
function refreshShell (payload: string, site: string): void {
  const from = join(payload, 'shell')

  if (!existsSync(from))
    return

  const list  = join(site, SHELL_LIST)
  const stale = existsSync(list)
    ? readFileSync(list, 'utf8').split('\n')
      .filter(Boolean)
    : []
  const fresh = listFiles(from)

  for (const file of stale)
    if (!fresh.includes(file) && !RESERVED.includes(file.split('/')[0]!))
      rmSync(join(site, file), { force: true })

  cpSync(from, site, { recursive: true })
  writeFileSync(list, `${fresh.join('\n')}\n`)
}

/** The manifest entry for a build, with every field the payload left out filled in. */
function describeEntry (meta: Meta, id: number, dir: string, now: string): Iteration {
  return {
    id,
    dir,
    date:      meta.date ?? now.slice(0, 10),
    sha:       meta.sha ?? '',
    title:     meta.title ?? `Iteration ${id}`,
    summary:   meta.summary ?? '',
    kind:      meta.kind ?? 'feature',
    model:     meta.model ?? '',
    journal:   meta.journal ?? '',
    shots:     meta.shots ?? { hero: 'shot.webp', thumb: 'thumb.webp' },
    stats:     meta.stats ?? {},
    bytes:     { new: 0, site: 0 },
    three:     meta.three ?? '',
    distHash:  meta.distHash ?? '',
    withdrawn: false,
  }
}

function save (path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

/**
 * Put a verified build on the site.
 *
 * A build whose digest equals the newest iteration's is the same world, so it
 * becomes no new iteration; the gallery is still refreshed. Anything else gets
 * the next number and a directory that is written once and never touched again.
 */
export function applyPayload ({ payload, site, repo, now = new Date().toISOString() }: ApplyOptions): ApplyResult {
  const meta     = inspect(payload)
  const manifest = readManifest(site, repo)
  const newest   = manifest.iterations.at(-1)

  mkdirSync(site, { recursive: true })
  refreshShell(payload, site)
  manifest.updated = now

  if (newest && meta.distHash && newest.distHash === meta.distHash) {
    save(join(site, 'iterations.json'), manifest)

    return { verdict: 'no-change', id: newest.id, dir: newest.dir, bytes: { new: 0, site: sizeOf(site) }}
  }

  const id     = (newest?.id ?? 0) + 1
  const dir    = `i/${String(id).padStart(4, '0')}/`
  const before = sizeOf(site)

  if (existsSync(join(site, dir)))
    throw new Error(`${dir} already exists on the site: an iteration is written once`)

  mergeVendor(payload, site)
  mkdirSync(join(site, 'i'), { recursive: true })
  cpSync(join(payload, 'iteration'), join(site, dir), { recursive: true })
  cpSync(join(payload, 'iteration', 'shot.webp'), join(site, 'latest.webp'))

  const entry = describeEntry(meta, id, dir, now)

  manifest.repo = repo
  manifest.iterations.push(entry)

  // Written, measured, then written again with the measurement: the manifest
  // and the iteration's own record are part of the size they report.
  save(join(site, dir, 'meta.json'), entry)
  save(join(site, 'iterations.json'), manifest)

  const after = sizeOf(site)

  entry.bytes = { new: after - before, site: after }
  save(join(site, dir, 'meta.json'), entry)
  save(join(site, 'iterations.json'), manifest)

  return { verdict: 'published', id, dir, bytes: entry.bytes }
}

function main (): void {
  const args   = parseArgs(process.argv.slice(2))
  const result = applyPayload({
    payload: resolve(args.str('payload', 'payload')),
    site:    resolve(args.str('site', 'site')),
    repo:    args.str('repo', ''),
  })

  const out = args.str('out')

  if (out)
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`)

  console.log(`site · ${result.verdict} · ${result.dir} · +${result.bytes.new} bytes · site is ${result.bytes.site} bytes`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  main()
