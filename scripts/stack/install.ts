// scripts/stack/install.ts
// Node built-ins only: the vite config imports this, and vite may run under node.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { applyImprovement, overlay } from './apply.ts'
import type { Outcome, Sources } from './apply.ts'
import { emit, outputsOf } from './emit.ts'
import { StackError, atLeast, parseImprovement } from './parse.ts'
import type { Improvement } from './parse.ts'

/** The one package the stack may change. */
export const PACKAGE = 'threejs-scenes'

/** Where the improvements are kept, relative to the repository. */
export const STACK = join('lib-stack', PACKAGE)

/** Bumped when a change to these tools must make every checkout apply its stack again. */
const TOOLS = 1

/** Inside the installed package, so it lives and dies with it: a fresh install is a pristine one. */
const KEEP = '.stack'

/** What an applied stack left behind, and how to take it back out. */
interface State {
  hash:    string
  version: string
  applied: string[]

  /** Files that were there before and were copied aside. */
  saved: string[]

  /** Files that were not there before. */
  created: string[]
}

export interface Report {

  /**
   * `current`: nothing to do. `applied`: the package was rebuilt from the
   * stack. `restored`: the stack is empty and the package is as published.
   * `skipped`: there is no package here to change. `failed`: see `problems`.
   */
  status:   'current' | 'applied' | 'restored' | 'skipped' | 'failed'
  version:  string
  applied:  string[]
  released: string[]
  problems: string[]
  note:     string
}

/** A stack tried in memory: the sources it would write, or why it cannot be written. */
interface Staged {
  changed:  Map<string, string>
  problems: string[]
}

function homeOf (root: string): string {
  return join(root, 'node_modules', PACKAGE)
}

function readState (home: string): State | null {
  const path = join(home, KEEP, 'state.json')

  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as State : null
}

function writeState (home: string, state: State): void {
  mkdirSync(join(home, KEEP), { recursive: true })
  writeFileSync(join(home, KEEP, 'state.json'), `${JSON.stringify(state, null, 2)}\n`)
}

/** Every improvement in the repository, in the order it is applied. */
export function readStack (root: string): Improvement[] {
  const dir = join(root, STACK)

  if (!existsSync(dir))
    return []

  return readdirSync(dir).filter(name => (/^\d{4}-[a-z0-9-]+\.md$/u).test(name))
    .sort()
    .map(name => parseImprovement(name.slice(0, -3), readFileSync(join(dir, name), 'utf8')))
}

/** Put the package back as it was published. */
export function restore (root: string): boolean {
  const home  = homeOf(root)
  const state = readState(home)

  if (!state)
    return false

  for (const file of state.created)
    rmSync(join(home, file), { force: true })

  for (const file of state.saved)
    copyFileSync(join(home, KEEP, 'pristine', file), join(home, file))

  rmSync(join(home, KEEP), { recursive: true, force: true })

  return true
}

/** Copy aside what is about to be overwritten, and note what is about to appear. */
function keep (home: string, files: readonly string[]): Pick<State, 'saved' | 'created'> {
  const saved: string[]   = []
  const created: string[] = []

  for (const file of files) {
    if (!existsSync(join(home, file))) {
      created.push(file)
      continue
    }

    const aside = join(home, KEEP, 'pristine', file)

    mkdirSync(dirname(aside), { recursive: true })
    copyFileSync(join(home, file), aside)
    saved.push(file)
  }

  return { saved, created }
}

function fingerprint (version: string, active: readonly Improvement[]): string {
  return createHash('sha256').update(JSON.stringify([ TOOLS, version, active.map(improvement => [ improvement.id, improvement.source ]) ]))
    .digest('hex')
}

/** Try the whole stack in memory. Nothing on disk changes here. */
function stage (home: string, active: readonly Improvement[]): Staged {
  const sources            = overlay(file => existsSync(join(home, file)) ? readFileSync(join(home, file), 'utf8') : null)
  const problems: string[] = []

  for (const improvement of active) {
    const outcome = applyImprovement(sources, improvement)

    problems.push(...outcome.problems.map(problem => `${improvement.id}: ${problem}`))

    // On the package as published every edit must be news. One that is "already
    // there" has matched something else, and would be skipped without a word.
    if (outcome.status !== 'conflict' && outcome.already > 0)
      problems.push(`${improvement.id}: ${outcome.already} of its edits change nothing: the text they put in is already in the published source`)

    if (problems.length > 0)
      break
  }

  return { changed: sources.changed, problems }
}

function failed (version: string, problems: string[]): Report {
  return { status: 'failed', version, applied: [], released: [], problems, note: '' }
}

/** Write the staged sources, rebuild what is built from them, and remember how to undo it. */
async function commit (root: string, hash: string, version: string, active: readonly Improvement[], changed: Map<string, string>): Promise<string[]> {
  const home  = homeOf(root)
  const files = [ ...changed.keys() ]

  // Written before anything else, with no fingerprint: if this stops halfway,
  // the next run sees a stack that is not current and knows what to put back.
  writeState(home, { hash: '', version, applied: [], ...keep(home, [ ...files, ...files.flatMap(outputsOf) ]) })

  for (const [ file, text ] of changed) {
    mkdirSync(dirname(join(home, file)), { recursive: true })
    writeFileSync(join(home, file), text)
  }

  const problems = await emit(home, files)

  if (problems.length > 0) {
    restore(root)

    return problems
  }

  writeState(home, { ...readState(home)!, hash, applied: active.map(improvement => improvement.id) })

  // The dev server keeps its own bundle of every dependency and does not look
  // inside them again; it would go on serving the library as it was.
  rmSync(join(root, 'node_modules', '.vite'), { recursive: true, force: true })

  return []
}

/**
 * Make the installed package what the published one plus the stack is.
 *
 * Runs after every install and before every build, so it has to be cheap when
 * there is nothing to do: a fingerprint of the stack is compared with the one
 * left by the last run, and that is all. When it differs the package is put
 * back as published and the whole stack is applied again, in order, so the
 * result never depends on what was applied before.
 */
export async function ensureStack (root: string): Promise<Report> {
  const home = homeOf(root)

  if (!existsSync(join(home, 'package.json')))
    return { status: 'skipped', version: '', applied: [], released: [], problems: [], note: `${PACKAGE} is not installed` }

  // A reference build borrows this checkout's node_modules through a link. Its
  // own stack may be yesterday's, and applying it would change the library
  // under the checkout that owns it.
  if (lstatSync(join(root, 'node_modules')).isSymbolicLink())
    return { status: 'skipped', version: '', applied: [], released: [], problems: [], note: 'node_modules is linked from another checkout, which applies its own stack' }

  const { version } = JSON.parse(readFileSync(join(home, 'package.json'), 'utf8')) as { version: string }
  let stack: Improvement[]

  try {
    stack = readStack(root)
  }
  catch (error) {
    if (error instanceof StackError)
      return failed(version, [ error.message ])

    throw error
  }

  const released = stack.filter(improvement => improvement.released && atLeast(version, improvement.released))
  const active   = stack.filter(improvement => !released.includes(improvement))
  const hash     = fingerprint(version, active)
  const report   = { version, applied: active.map(improvement => improvement.id), released: released.map(improvement => improvement.id), problems: [], note: '' }

  if (readState(home)?.hash === hash)
    return { status: 'current', ...report }

  restore(root)

  if (active.length === 0)
    return { status: 'restored', ...report }

  const { changed, problems } = stage(home, active)
  const broken                = problems.length > 0 ? problems : await commit(root, hash, version, active, changed)

  return broken.length > 0 ? failed(version, broken) : { status: 'applied', ...report }
}

/** Whether the installed package is what the stack says, without changing anything. */
export function isCurrent (root: string): boolean {
  const home = homeOf(root)

  if (!existsSync(join(home, 'package.json')))
    return false

  const { version } = JSON.parse(readFileSync(join(home, 'package.json'), 'utf8')) as { version: string }
  const active      = readStack(root).filter(improvement => !(improvement.released && atLeast(version, improvement.released)))

  return active.length === 0 ? readState(home) === null : readState(home)?.hash === fingerprint(version, active)
}

/**
 * Apply the stack to a checkout of the library itself.
 *
 * The edits are written against the TypeScript the package ships, which is the
 * TypeScript upstream keeps, so this is the same operation on another
 * directory. Source only: upstream builds, tests and releases its own way.
 * Each improvement lands whole or not at all, and one that does not fit is
 * reported and left for a person.
 */
export function port (root: string, target: string, dry: boolean): Outcome[] {
  const manifest = join(target, 'package.json')

  if (!existsSync(manifest) || (JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }).name !== PACKAGE)
    throw new StackError(`${target} is not a checkout of ${PACKAGE}`)

  const disk: Sources = {
    read: file => existsSync(join(target, file)) ? readFileSync(join(target, file), 'utf8') : null,

    write (file, text) {
      mkdirSync(dirname(join(target, file)), { recursive: true })
      writeFileSync(join(target, file), text)
    },
  }

  // A dry run still has to see what earlier improvements would have left.
  const sources = dry ? overlay(disk.read) : disk

  return readStack(root).filter(improvement => !improvement.released)
    .map(improvement => applyImprovement(sources, improvement))
}
