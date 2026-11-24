// scripts/gate/contract.ts
// Node built-ins only: reads a build as data and never executes any of it.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'


/** The only things a build may have at its top level. */
const TOP_LEVEL = [ 'index.html', 'a', 'v' ]

/**
 * three's own build files, any of which may sit in the vendor directory: the
 * core, the WebGL renderer over it (`three`), and the renderer that draws
 * node materials with the language they are written in (`three/webgpu`,
 * `three/tsl`). All of them import the one core, so it is still one three.
 */
const VENDOR_FILES = [
  'three.module.min.js', 'three.core.min.js', 'three.module.js', 'three.core.js',
  'three.webgpu.min.js', 'three.tsl.min.js', 'three.webgpu.js', 'three.tsl.js',
]

/** The names a chunk may leave to the import map. Each must be sent to one of three's own files. */
const SHARED = [ 'three', 'three/webgpu', 'three/tsl' ]

/** A string every copy of three carries: the global it registers itself under. */
const THREE_MARKER = '__THREE__'

const REACT_MARKERS = [ 'react.transitional.element', 'react.production', '__SECRET_INTERNALS_DO_NOT_USE' ]

const VENDOR_DIR = /^three@(\d+\.\d+\.\d+)$/u

/** `src="…"` and `href="…"` in the page. */
const ATTRIBUTE = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gu

/** Static and dynamic imports in a chunk, minified or not. */
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*(["'])([^"'\n]+?)\1/gu

const IMPORT_MAP = /<script\s+type=(["'])importmap\1[^>]*>([\s\S]*?)<\/script>/u

const CSS_URL = /url\(\s*(["']?)([^"')]+)\1\s*\)/gu

export interface ContractResult {
  failures: string[]

  /** The three version the build ships, or '' when it could not be told. */
  three: string
  bytes: {

    /** Everything that belongs to this iteration alone. */
    iteration: number

    /** The shared three files. Stored once per version on the site. */
    vendor: number
  }

  /** A digest of the iteration's own files: equal digests mean the same world. */
  distHash: string
  files:    number
}

interface ContractOptions {

  /** The build to check. */
  dist: string

  /** A `node_modules/three` the checker trusts, used when its version matches. */
  trustedThree: string
}

/** Every regular file under a directory, as paths relative to it. Anything else is a failure. */
function walk (root: string, failures: string[]): string[] {
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
        failures.push(`${relative(root, path)} is not a regular file (links and devices cannot be published)`)
    }
  }

  visit(root)

  return files
}

function sha256 (data: Buffer | string): string {
  return createHash('sha256').update(data)
    .digest('hex')
}

/** Whether a URL stays inside the build: relative, or inline data. */
function isLocal (url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('#'))
    return true

  return !(/^[a-z][a-z0-9+.-]*:/iu).test(url) && !url.startsWith('/')
}

/**
 * The genuine three build files for a version.
 *
 * Normally the checker's own `node_modules` has the same version and that is
 * the reference. When a change bumps three, the reference is the npm tarball
 * itself, so the bytes that get published are npm's and not the candidate's.
 */
function genuineThree (version: string, trustedThree: string): { dir: string, cleanup (): void } | null {
  const manifest = join(trustedThree, 'package.json')

  if (existsSync(manifest) && (JSON.parse(readFileSync(manifest, 'utf8')) as { version: string }).version === version)
    return { dir: join(trustedThree, 'build'), cleanup: () => undefined }

  const scratch = mkdtempSync(join(tmpdir(), 'scenery-three-'))

  try {
    const tarball = join(scratch, 'three.tgz')

    execFileSync('curl', [ '-fsSL', '--max-time', '60', '-o', tarball, `https://registry.npmjs.org/three/-/three-${version}.tgz` ])
    execFileSync('tar', [ '-xzf', tarball, '-C', scratch, 'package/build' ])

    return { dir: join(scratch, 'package', 'build'), cleanup: () => rmSync(scratch, { recursive: true, force: true }) }
  }
  catch {
    rmSync(scratch, { recursive: true, force: true })

    return null
  }
}

function checkVendor (dist: string, files: readonly string[], trustedThree: string, failures: string[]): string {
  const dirs = existsSync(join(dist, 'v')) ? readdirSync(join(dist, 'v')) : []

  if (dirs.length !== 1 || !VENDOR_DIR.test(dirs[0]!)) {
    failures.push(`v/ must hold exactly one three@<version> directory, found: ${dirs.join(', ') || 'nothing'}`)

    return ''
  }

  const version = VENDOR_DIR.exec(dirs[0]!)![1]!
  const shipped = files.filter(file => file.startsWith('v/')).map(file => file.slice(`v/${dirs[0]!}/`.length))

  for (const file of shipped)
    if (!VENDOR_FILES.includes(file))
      failures.push(`v/${dirs[0]!}/${file} is not one of three's build files`)

  const genuine = genuineThree(version, trustedThree)

  if (!genuine) {
    failures.push(`could not obtain three ${version} from npm to compare the vendor files against`)

    return version
  }

  try {
    for (const file of shipped.filter(name => VENDOR_FILES.includes(name))) {
      const reference = join(genuine.dir, file)

      if (!existsSync(reference))
        failures.push(`three ${version} has no build/${file}`)
      else if (sha256(readFileSync(reference)) !== sha256(readFileSync(join(dist, 'v', dirs[0]!, file))))
        failures.push(`v/${dirs[0]!}/${file} is not byte-identical to three ${version} from npm`)
    }
  }
  finally {
    genuine.cleanup()
  }

  return version
}

/** Checks the page, and returns the names its import map resolves to three's own files. */
function checkPage (dist: string, version: string, failures: string[]): string[] {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')

  for (const [ , , url ] of html.matchAll(ATTRIBUTE))
    if (!isLocal(url!))
      failures.push(`index.html points outside the build: ${url!.slice(0, 120)}`)

  const map = IMPORT_MAP.exec(html)

  if (!map) {
    failures.push('index.html has no import map, so the page cannot find three')

    return []
  }

  const imports = (JSON.parse(map[2]!) as { imports?: Record<string, string> }).imports ?? {}
  const expects = `../../v/three@${version}/`

  if (!imports.three?.startsWith(expects))
    failures.push(`the import map must send "three" to ${expects}…, found ${imports.three ?? 'nothing'}`)

  for (const [ name, target ] of Object.entries(imports)) {
    if (!isLocal(target))
      failures.push(`the import map sends "${name}" outside the build: ${target}`)

    // Whatever else is shared is three too, and comes from the same place.
    if (SHARED.includes(name) && !(target.startsWith(expects) && VENDOR_FILES.includes(target.slice(expects.length))))
      failures.push(`the import map must send "${name}" to one of three's build files under ${expects}, found ${target}`)
  }

  return Object.keys(imports).filter(name => SHARED.includes(name))
}

function checkChunks (dist: string, files: readonly string[], shared: readonly string[], failures: string[]): void {
  for (const file of files.filter(name => name.startsWith('a/'))) {
    const text = readFileSync(join(dist, file), 'utf8')

    if (file.endsWith('.js')) {
      for (const [ , , specifier ] of text.matchAll(IMPORT))
        if (!specifier!.startsWith('.') && !shared.includes(specifier!))
          failures.push(`${file} imports "${specifier!.slice(0, 80)}", which nothing on the published site can resolve (the import map shares only ${shared.map(name => `"${name}"`).join(', ') || 'nothing'})`)

      if (text.includes(THREE_MARKER))
        failures.push(`${file} carries its own copy of three (import only 'three', 'three/webgpu', 'three/tsl' and 'three/addons/…', never 'three/src/…')`)

      if (REACT_MARKERS.some(marker => text.includes(marker)))
        failures.push(`${file} carries React, which this project does not use`)
    }

    if (file.endsWith('.css'))
      for (const [ , , url ] of text.matchAll(CSS_URL))
        if (!isLocal(url!))
          failures.push(`${file} loads ${url!.slice(0, 120)} from outside the build`)
  }
}

/**
 * Check that a build has the shape the site expects.
 *
 * `index.html`, hashed files under `a/`, and three's own build under
 * `v/three@<version>/`, byte-identical to npm's. Nothing that points off the
 * site, and exactly one three.
 */
export function checkContract ({ dist, trustedThree }: ContractOptions): ContractResult {
  const failures: string[] = []
  const root               = resolve(dist)

  if (!existsSync(join(root, 'index.html')))
    return { failures: [ `${dist} has no index.html: was it built?` ], three: '', bytes: { iteration: 0, vendor: 0 }, distHash: '', files: 0 }

  for (const name of readdirSync(root))
    if (!TOP_LEVEL.includes(name))
      failures.push(`unexpected "${name}" at the top of the build (only ${TOP_LEVEL.join(', ')} are published)`)

  const files   = walk(root, failures)
  const version = checkVendor(root, files, trustedThree, failures)

  checkChunks(root, files, checkPage(root, version, failures), failures)

  const own    = files.filter(file => !file.startsWith('v/'))
  const size   = (list: readonly string[]): number => list.reduce((sum, file) => sum + lstatSync(join(root, file)).size, 0)
  const digest = createHash('sha256')

  for (const file of own)
    digest.update(`${file}\0${sha256(readFileSync(join(root, file)))}\n`)

  digest.update(`three@${version}\n`)

  return {
    failures,
    three:    version,
    bytes:    { iteration: size(own), vendor: size(files.filter(file => file.startsWith('v/'))) },
    distHash: digest.digest('hex'),
    files:    files.length,
  }
}

/** Write a report next to the build when run directly: `node scripts/gate/contract.ts dist`. */
function main (): void {
  const dist   = process.argv[2] ?? 'dist'
  const result = checkContract({ dist, trustedThree: resolve('node_modules/three') })

  console.log(`contract · ${result.failures.length === 0 ? 'ok' : 'FAIL'} · three ${result.three} · ${result.bytes.iteration} bytes own, ${result.bytes.vendor} shared`)

  for (const failure of result.failures)
    console.log(`  FAIL  ${failure}`)

  if (process.argv[3])
    writeFileSync(process.argv[3], `${JSON.stringify(result, null, 2)}\n`)

  if (result.failures.length > 0)
    process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  main()
