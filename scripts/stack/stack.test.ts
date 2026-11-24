// scripts/stack/stack.test.ts
import { describe, expect, test } from 'bun:test'

import { applyImprovement, overlay } from './apply.ts'
import { outputsOf } from './emit.ts'
import { StackError, atLeast, parseImprovement } from './parse.ts'


const FENCE = '```'

/** An improvement file with one find and replace under `lib/a.ts`, and whatever else is asked for. */
function entry ({ head = 'title: A title\nkind: perf\nbase: 3.0.0', find = 'const a = 1', replace = 'const a = 2', rest = '' } = {}): string {
  return [
    '---', head, '---', '',
    'Why this is worth having.', '',
    '## lib/a.ts', '',
    `${FENCE}ts find`, find, FENCE, '',
    `${FENCE}ts replace`, replace, FENCE,
    rest,
  ].join('\n')
}

function sourcesOf (files: Record<string, string>): ReturnType<typeof overlay> {
  return overlay(file => files[file] ?? null)
}

describe('parseImprovement', () => {
  test('reads the front matter, the prose and the edits', () => {
    const improvement = parseImprovement('0001-a', entry())

    expect(improvement).toMatchObject({ id: '0001-a', title: 'A title', kind: 'perf', base: '3.0.0', released: '', prose: 'Why this is worth having.' })
    expect(improvement.edits).toEqual([{ file: 'lib/a.ts', kind: 'replace', find: 'const a = 1', text: 'const a = 2', line: 11 }])
  })

  test('a block keeps every line as written, backticks and placeholders included', () => {
    const code = 'const glsl = `\n  float a = ${ value };\n`'

    expect(parseImprovement('0001-a', entry({ replace: code })).edits[0]?.text).toBe(code)
  })

  test('a longer fence holds a shorter one', () => {
    const rest = [ '', '## lib/b.ts', '', '````md create', FENCE, 'inside', FENCE, '````' ].join('\n')

    expect(parseImprovement('0001-a', entry({ rest })).edits[1]).toMatchObject({ file: 'lib/b.ts', kind: 'create', text: `${FENCE}\ninside\n${FENCE}\n` })
  })

  test('an untagged block is prose, wherever it stands', () => {
    const rest = [ '', `${FENCE}ts`, 'app.invalidate()', FENCE ].join('\n')

    expect(parseImprovement('0001-a', entry({ rest })).edits).toHaveLength(1)
  })

  test.each([
    [ 'no front matter', 'just prose' ],
    [ 'kind must be one of', entry({ head: 'title: A\nkind: tweak\nbase: 3.0.0' }) ],
    [ 'base must be', entry({ head: 'title: A\nkind: perf' }) ],
    [ 'title is required', entry({ head: 'kind: perf\nbase: 3.0.0' }) ],
    [ 'released must be', entry({ head: 'title: A\nkind: perf\nbase: 3.0.0\nreleased: soon' }) ],
    [ 'an empty "find"', entry({ find: '' }) ],
    [ 'never closed', entry({ rest: `\n${FENCE}ts find\nconst b = 1` }) ],
    [ 'a "find" followed by its "replace"', entry({ rest: `\n${FENCE}ts find\nconst b = 1\n${FENCE}` }) ],
  ])('refuses an entry with %s', (message, source) => {
    expect(() => parseImprovement('0001-a', source)).toThrow(StackError)
    expect(() => parseImprovement('0001-a', source)).toThrow(message)
  })

  test.each([ '../src/main.ts', 'dist/core/app.js', 'lib/../package.json', 'package.json' ])('an edit may not reach %s', file => {
    const source = entry().replace('## lib/a.ts', `## ${file}`)

    expect(() => parseImprovement('0001-a', source)).toThrow('needs a "## lib/…/file.ts" heading')
  })
})

describe('applyImprovement', () => {
  test('replaces the one place the text occurs', () => {
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1\nconst b = 1\n' })
    const outcome = applyImprovement(sources, parseImprovement('0001-a', entry()))

    expect(outcome).toMatchObject({ status: 'applied', files: [ 'lib/a.ts' ], already: 0 })
    expect(sources.read('lib/a.ts')).toBe('const a = 2\nconst b = 1\n')
  })

  test('a replacement is put in as written, dollar signs and all', () => {
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1' })

    applyImprovement(sources, parseImprovement('0001-a', entry({ replace: "const a = '$&$1'" })))

    expect(sources.read('lib/a.ts')).toBe("const a = '$&$1'")
  })

  test('text that is not there is a conflict, and nothing is written', () => {
    const rest    = [ '', `${FENCE}ts find`, 'const c = 1', FENCE, '', `${FENCE}ts replace`, 'const c = 2', FENCE ].join('\n')
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1' })
    const outcome = applyImprovement(sources, parseImprovement('0001-a', entry({ rest })))

    expect(outcome.status).toBe('conflict')
    expect(outcome.problems[0]).toContain('is not in the file')
    expect(sources.changed.size).toBe(0)
  })

  test('text that occurs twice is a conflict: an edit lands in one known place or not at all', () => {
    const outcome = applyImprovement(sourcesOf({ 'lib/a.ts': 'const a = 1\nconst a = 1' }), parseImprovement('0001-a', entry()))

    expect(outcome.problems[0]).toContain('occurs 2 times')
  })

  test('applying twice changes nothing the second time', () => {
    const sources     = sourcesOf({ 'lib/a.ts': 'const a = 1' })
    const improvement = parseImprovement('0001-a', entry())

    applyImprovement(sources, improvement)

    expect(applyImprovement(sources, improvement)).toMatchObject({ status: 'present', files: [], already: 1 })
    expect(sources.read('lib/a.ts')).toBe('const a = 2')
  })

  test('an edit that keeps its anchor and adds beside it does not land twice', () => {
    const sources     = sourcesOf({ 'lib/a.ts': 'const a = 1' })
    const improvement = parseImprovement('0001-a', entry({ replace: 'const a = 1\nconst b = 2' }))

    applyImprovement(sources, improvement)
    applyImprovement(sources, improvement)

    expect(sources.read('lib/a.ts')).toBe('const a = 1\nconst b = 2')
  })

  test('an edit that removes lines lands even though what it leaves was there before', () => {
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1\nconst b = 1\n' })
    const outcome = applyImprovement(sources, parseImprovement('0001-a', entry({ find: 'const a = 1\nconst b = 1', replace: 'const a = 1' })))

    expect(outcome.status).toBe('applied')
    expect(sources.read('lib/a.ts')).toBe('const a = 1\n')
  })

  test('a later edit sees what an earlier one left', () => {
    const rest    = [ '', `${FENCE}ts find`, 'const a = 2', FENCE, '', `${FENCE}ts replace`, 'const a = 3', FENCE ].join('\n')
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1' })

    applyImprovement(sources, parseImprovement('0001-a', entry({ rest })))

    expect(sources.read('lib/a.ts')).toBe('const a = 3')
  })

  test('creates a file that is not there, and refuses one that is', () => {
    const source  = entry({ rest: [ '', '## lib/b.ts', '', `${FENCE}ts create`, 'export const b = 1', FENCE ].join('\n') })
    const sources = sourcesOf({ 'lib/a.ts': 'const a = 1' })

    expect(applyImprovement(sources, parseImprovement('0001-a', source)).files).toEqual([ 'lib/a.ts', 'lib/b.ts' ])
    expect(sources.read('lib/b.ts')).toBe('export const b = 1\n')

    const taken = applyImprovement(sourcesOf({ 'lib/a.ts': 'const a = 1', 'lib/b.ts': 'something else' }), parseImprovement('0001-a', source))

    expect(taken.problems[0]).toContain('already exists')
  })
})

describe('versions and outputs', () => {
  test('a release is reached at its version and after it', () => {
    expect(atLeast('3.1.0', '3.1.0')).toBe(true)
    expect(atLeast('3.10.0', '3.9.4')).toBe(true)
    expect(atLeast('4.0.0', '3.9.4')).toBe(true)
    expect(atLeast('3.0.9', '3.1.0')).toBe(false)
  })

  test('a source file is built into four files', () => {
    expect(outputsOf('lib/core/app.ts')).toEqual([ 'dist/core/app.js', 'dist/core/app.js.map', 'dist/core/app.d.ts', 'dist/core/app.d.ts.map' ])
  })
})
