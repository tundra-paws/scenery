// scripts/gate/policy.test.ts
import { afterAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { checkPolicy, matches, parseFrontMatter } from './policy.ts'


const BUDGETS = {
  bytes: { addedFile: 2000 },
  docs:  { 'about': 'ignored', 'CLAUDE.md': 300, 'journal/*.md': 600 },
}

const ENTRY = [
  '---',
  'title: First light',
  'summary: The sun comes up over the eastern ridge.',
  'kind: feature',
  'model: test-model',
  '---',
  '',
  'What changed and why.',
  '',
].join('\n')

const repos: string[] = []

/** A throwaway repository with one commit on `main`, and a way to add more. */
type RepositoryReturnType = { dir: string, commit (files: Record<string, string | null>, message?: string): string }

function repository (): RepositoryReturnType {
  const dir = mkdtempSync(join(tmpdir(), 'scenery-policy-'))
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()

  repos.push(dir)
  git('init', '--quiet', '--initial-branch=main')
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'test')
  git('config', 'commit.gpgsign', 'false')

  function commit (files: Record<string, string | null>, message = 'change'): string {
    for (const [ path, content ] of Object.entries(files)) {
      const target = join(dir, path)

      if (content === null) {
        rmSync(target)
        continue
      }

      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
    }

    git('add', '--all')
    git('commit', '--quiet', '--message', message)

    return git('rev-parse', 'HEAD')
  }

  commit({
    'budgets.json':        JSON.stringify(BUDGETS),
    'package.json':        JSON.stringify({ dependencies: { three: '0.184.0' }}),
    'src/world/index.ts':  'export const world = 1\n',
    'CLAUDE.md':           'rules\n',
    'scripts/gate/run.ts': 'export const gate = 1\n',
  }, 'base')

  return { dir, commit }
}

function judge (dir: string, base: string, head: string): ReturnType<typeof checkPolicy> {
  return checkPolicy({ repo: dir, base, head, mode: 'candidate' })
}

afterAll(() => {
  for (const dir of repos)
    rmSync(dir, { recursive: true, force: true })
})

describe('matches', () => {
  test('** crosses directories, * does not', () => {
    expect(matches('.github/workflows/pipeline.yml', '.github/**')).toBe(true)
    expect(matches('journal/2026-01-01-a.md', 'journal/*.md')).toBe(true)
    expect(matches('journal/deep/2026-01-01-a.md', 'journal/*.md')).toBe(false)
    expect(matches('src/world/features/x/index.ts', 'src/world/**')).toBe(true)
    expect(matches('src/worldly.ts', 'src/world/**')).toBe(false)
    expect(matches('package.json', 'package.json')).toBe(true)
    expect(matches('xpackage.json', 'package.json')).toBe(false)
  })
})

describe('parseFrontMatter', () => {
  test('reads flat fields and strips quotes', () => {
    expect(parseFrontMatter('---\ntitle: "A: b"\nkind: fix\n---\nbody')).toEqual({ title: 'A: b', kind: 'fix' })
  })

  test('is null without a block', () => {
    expect(parseFrontMatter('# just a heading\n')).toBeNull()
  })
})

describe('checkPolicy', () => {
  test('a world change with one journal entry is a candidate', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    const head = commit({ 'src/world/index.ts': 'export const world = 2\n', 'journal/2026-12-05-first-light.md': ENTRY })
    const out  = judge(dir, base, head)

    expect(out.failures).toEqual([])
    expect(out.verdict).toBe('candidate')
    expect(out.journal?.title).toBe('First light')
    expect(out.framework).toBe(false)
  })

  test('no journal entry means it is not a candidate at all', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    expect(judge(dir, base, commit({ 'src/world/index.ts': 'export const world = 3\n' })).verdict).toBe('ignored')
  })

  test('a branch that is not built on main is rejected', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    execFileSync('git', [ 'checkout', '--quiet', '--orphan', 'elsewhere' ], { cwd: dir })

    const out = judge(dir, base, commit({ 'journal/2026-12-05-first-light.md': ENTRY }))

    expect(out.verdict).toBe('rejected')
    expect(out.failures.join(' ')).toContain('not a descendant')
  })

  test('touching a workflow is rejected even when a later commit reverts it', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    commit({ '.github/workflows/pipeline.yml': 'on: push\n' })
    commit({ '.github/workflows/pipeline.yml': null })

    const out = judge(dir, base, commit({ 'journal/2026-12-05-first-light.md': ENTRY }))

    expect(out.verdict).toBe('rejected')
    expect(out.failures.join(' ')).toContain('.github/workflows/pipeline.yml')
  })

  test('the ledger is not the curator\'s to write', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()
    const out             = judge(dir, base, commit({ 'ci/ledger.jsonl': '{}\n', 'journal/2026-12-05-first-light.md': ENTRY }))

    expect(out.verdict).toBe('rejected')
  })

  test('a new package is rejected, a version bump is a framework change', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()
    const framework       = ENTRY.replace('kind: feature', 'kind: framework')

    const added = judge(dir, base, commit({
      'package.json':                      JSON.stringify({ dependencies: { three: '0.184.0', leftpad: '1.0.0' }}),
      'journal/2026-12-05-first-light.md': framework,
    }))

    expect(added.verdict).toBe('rejected')
    expect(added.failures.join(' ')).toContain('new package "leftpad"')

    const other  = repository()
    const before = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: other.dir, encoding: 'utf8' }).trim()

    const bumped = judge(other.dir, before, other.commit({
      'package.json':                      JSON.stringify({ dependencies: { three: '0.185.1' }}),
      'journal/2026-12-05-first-light.md': framework,
    }))

    expect(bumped.failures).toEqual([])
    expect(bumped.verdict).toBe('candidate')
    expect(bumped.framework).toBe(true)
    expect(bumped.guarded).toEqual([ 'package.json' ])
  })

  test('a framework change must say so, and must leave the world alone', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    const undeclared = judge(dir, base, commit({ 'scripts/gate/run.ts': 'export const gate = 2\n', 'journal/2026-12-05-first-light.md': ENTRY }))

    expect(undeclared.verdict).toBe('rejected')
    expect(undeclared.failures.join(' ')).toContain('kind: framework')

    const other  = repository()
    const before = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: other.dir, encoding: 'utf8' }).trim()

    const mixed = judge(other.dir, before, other.commit({
      'scripts/gate/run.ts':               'export const gate = 2\n',
      'src/world/index.ts':                'export const world = 9\n',
      'journal/2026-12-05-first-light.md': ENTRY.replace('kind: feature', 'kind: framework'),
    }))

    expect(mixed.verdict).toBe('rejected')
    expect(mixed.failures.join(' ')).toContain('may not also change the world')
  })

  test('journal entries need a good name, valid fields, and only one per change', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    const out = judge(dir, base, commit({
      'journal/notes.md':                  ENTRY,
      'journal/2026-12-05-first-light.md': ENTRY.replace('kind: feature', 'kind: epic').replace('model: test-model\n', ''),
    }))

    expect(out.verdict).toBe('rejected')
    expect(out.failures.join(' ')).toContain('one journal entry per change')
  })

  test('documents and new files have ceilings', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    const out = judge(dir, base, commit({
      'src/world/big.bin':                 'x'.repeat(2500),
      'journal/2026-12-05-first-light.md': `${ENTRY}${'more words '.repeat(80)}`,
    }))

    expect(out.verdict).toBe('rejected')
    expect(out.failures.join(' ')).toContain('src/world/big.bin')
    expect(out.failures.join(' ')).toContain('byte ceiling')
  })
})

describe('checkPolicy on a push to main', () => {
  test('reads the journal entry from anywhere in the push, and refuses nothing', () => {
    const { dir, commit } = repository()
    const base            = execFileSync('git', [ 'rev-parse', 'HEAD' ], { cwd: dir, encoding: 'utf8' }).trim()

    commit({ 'journal/2026-12-05-first-light.md': ENTRY, 'src/world/index.ts': 'export const world = 5\n' })

    // A person may change the gate and the world in one push; the curator may not.
    const head = commit({ 'scripts/gate/run.ts': 'export const gate = 3\n' })
    const out  = checkPolicy({ repo: dir, base, head, mode: 'main' })

    expect(out.verdict).toBe('candidate')
    expect(out.failures).toEqual([])
    expect(out.journal?.title).toBe('First light')
    expect(out.framework).toBe(true)
  })

  test('falls back to the last commit when the push does not say where main was', () => {
    const { dir, commit } = repository()
    const head            = commit({ 'journal/2026-12-05-first-light.md': ENTRY })
    const out             = checkPolicy({ repo: dir, base: head, head, mode: 'main' })

    expect(out.verdict).toBe('candidate')
    expect(out.journal?.title).toBe('First light')
  })
})
