// scripts/site/apply.test.ts
import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { applyPayload } from './apply.ts'
import type { Manifest } from './apply.ts'
import { appendLedger, readLedger } from './ledger.ts'


const scratch: string[] = []

function tree (files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'scenery-site-'))

  scratch.push(root)

  for (const [ path, content ] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }

  return root
}

/** A payload shaped like the verify step's, with a body that decides its digest. */
function payload (body: string, extra: Record<string, string> = {}): string {
  return tree({
    'iteration/index.html':                     '<!doctype html>',
    'iteration/a/index-abc.js':                 body,
    'iteration/shot.webp':                      `shot of ${body}`,
    'iteration/thumb.webp':                     'thumb',
    'vendor/three@0.184.0/three.module.min.js': 'module',
    'vendor/three@0.184.0/three.core.min.js':   'core',
    'shell/index.html':                         '<!doctype html><title>gallery</title>',
    'shell/shell.js':                           'export {}',
    'meta.json':                                JSON.stringify({ sha: 'a'.repeat(40), date: '2026-12-05', title: `World ${body}`, summary: 's', kind: 'feature', model: 'm', journal: 'journal/2026-12-05-x.md', three: '0.184.0', distHash: `hash-${body}` }),
    ...extra,
  })
}

function manifest (site: string): Manifest {
  return JSON.parse(readFileSync(join(site, 'iterations.json'), 'utf8')) as Manifest
}

afterAll(() => {
  for (const root of scratch)
    rmSync(root, { recursive: true, force: true })
})

describe('applyPayload', () => {
  test('the first publish creates the site', () => {
    const site   = tree({})
    const result = applyPayload({ payload: payload('one'), site, repo: 'o/r', now: '2026-12-05T04:00:00.000Z' })

    expect(result.verdict).toBe('published')
    expect(result.id).toBe(1)
    expect(result.dir).toBe('i/0001/')
    expect(readFileSync(join(site, 'i/0001/a/index-abc.js'), 'utf8')).toBe('one')
    expect(readFileSync(join(site, 'v/three@0.184.0/three.core.min.js'), 'utf8')).toBe('core')
    expect(readFileSync(join(site, 'latest.webp'), 'utf8')).toBe('shot of one')
    expect(existsSync(join(site, 'index.html'))).toBe(true)

    const [ entry ] = manifest(site).iterations

    expect(entry?.title).toBe('World one')
    expect(entry?.bytes.site).toBe(result.bytes.site)
    expect(entry?.bytes.new).toBeGreaterThan(0)
    expect(JSON.parse(readFileSync(join(site, 'i/0001/meta.json'), 'utf8')).id).toBe(1)
  })

  test('each new world gets the next number and the old one is untouched', () => {
    const site = tree({})

    applyPayload({ payload: payload('one'), site, repo: 'o/r' })

    const second = applyPayload({ payload: payload('two'), site, repo: 'o/r' })

    expect(second.id).toBe(2)
    expect(readFileSync(join(site, 'i/0001/a/index-abc.js'), 'utf8')).toBe('one')
    expect(readFileSync(join(site, 'i/0002/a/index-abc.js'), 'utf8')).toBe('two')
    expect(readFileSync(join(site, 'latest.webp'), 'utf8')).toBe('shot of two')
    expect(manifest(site).iterations.map(entry => entry.id)).toEqual([ 1, 2 ])

    // three was already there, so the second publish does not pay for it again.
    expect(second.bytes.new).toBeLessThan(second.bytes.site / 2)
  })

  test('the same world again is no new iteration, but the gallery is refreshed', () => {
    const site = tree({})

    applyPayload({ payload: payload('one'), site, repo: 'o/r' })

    const again = applyPayload({ payload: payload('one', { 'shell/index.html': 'new gallery', 'shell/extra.css': 'a{}' }), site, repo: 'o/r' })

    expect(again.verdict).toBe('no-change')
    expect(again.id).toBe(1)
    expect(manifest(site).iterations).toHaveLength(1)
    expect(readFileSync(join(site, 'index.html'), 'utf8')).toBe('new gallery')
    expect(existsSync(join(site, 'extra.css'))).toBe(true)
  })

  test('a file the gallery stops shipping is removed', () => {
    const site = tree({})

    applyPayload({ payload: payload('one', { 'shell/old.js': 'old' }), site, repo: 'o/r' })
    expect(existsSync(join(site, 'old.js'))).toBe(true)

    applyPayload({ payload: payload('two'), site, repo: 'o/r' })
    expect(existsSync(join(site, 'old.js'))).toBe(false)
    expect(existsSync(join(site, 'shell.js'))).toBe(true)
  })

  test('a three version already on the site must be the same bytes', () => {
    const site = tree({})

    applyPayload({ payload: payload('one'), site, repo: 'o/r' })

    expect(() => applyPayload({
      payload: payload('two', { 'vendor/three@0.184.0/three.core.min.js': 'not the same' }),
      site,
      repo:    'o/r',
    })).toThrow('different bytes')
  })

  test('a payload with anything unexpected in it is refused', () => {
    const site = tree({})

    expect(() => applyPayload({ payload: payload('one', { 'iteration/extra.html': 'x' }), site, repo: 'o/r' })).toThrow('not part of a build')
    expect(() => applyPayload({ payload: payload('one', { 'surprise.sh': 'x' }), site, repo: 'o/r' })).toThrow('unexpected')
    expect(() => applyPayload({ payload: payload('one', { 'shell/iterations.json': '{}' }), site, repo: 'o/r' })).toThrow('belongs to the site')
    expect(() => applyPayload({ payload: payload('one', { 'vendor/three@0.184.0/evil.js': 'x' }), site, repo: 'o/r' })).toThrow('build files')

    const linked = payload('one')

    symlinkSync('/etc/hosts', join(linked, 'iteration', 'a', 'link.js'))
    expect(() => applyPayload({ payload: linked, site, repo: 'o/r' })).toThrow('not a regular file')
  })
})

describe('ledger', () => {
  test('appends lines and reads the newest back', () => {
    const file = join(tree({}), 'ci', 'ledger.jsonl')

    for (let index = 1; index <= 5; index += 1)
      appendLedger(file, { ts: `2026-12-0${index}T00:00:00Z`, run: '', mode: 'candidate', ref: `claude/day-${index}`, sha: '', verdict: 'published', iteration: index })

    expect(readLedger(file, 2).map(line => line.iteration)).toEqual([ 4, 5 ])
    expect(readLedger(join(tree({}), 'missing.jsonl'))).toEqual([])
  })
})
