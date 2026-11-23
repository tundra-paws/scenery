// scripts/site/record.test.ts
import { describe, expect, test } from 'bun:test'

import type { LedgerLine } from './ledger.ts'
import { describeRun } from './record.ts'
import type { RunFacts } from './record.ts'
import { planWatch } from './watchdog.ts'
import type { Branch } from './watchdog.ts'


const HOUR = 3_600_000
const NOW  = Date.parse('2026-12-10T06:00:00Z')

const OK       = { result: 'success' as const }
const FAILED   = { result: 'failure' as const }
const SKIPPED  = { result: 'skipped' as const }
const JOURNAL  = { title: 'First light', summary: 'The sun comes up.' }
const PASSING  = { verdict: 'pass', checks: [{ name: 'contract', ok: true, detail: '' }], warnings: [], stats: { desktop: { draws: 7 }}}
const ACCEPTED = { verdict: 'candidate', failures: [], warnings: [], journal: JOURNAL, guarded: []}

function facts (over: Partial<RunFacts>): RunFacts {
  return {
    needs:  { policy: OK, build: OK, verify: OK, promote: OK, publish: OK },
    mode:   'candidate',
    ref:    'claude/day',
    sha:    'a'.repeat(40),
    run:    'https://example.invalid/run/1',
    now:    '2026-12-10T05:00:00.000Z',
    policy: ACCEPTED,
    report: PASSING,
    result: { verdict: 'published', id: 12, bytes: { new: 80_000, site: 2_000_000 }},
    ...over,
  }
}

function line (over: Partial<LedgerLine>): LedgerLine {
  return { ts: new Date(NOW - HOUR).toISOString(), run: '', mode: 'candidate', ref: 'claude/x', sha: 'b'.repeat(40), verdict: 'published', ...over }
}

function branch (over: Partial<Branch>): Branch {
  return { name: 'claude/new', sha: 'c'.repeat(40), committed: NOW - HOUR, journalled: true, ...over }
}

describe('describeRun', () => {
  test('a published candidate', () => {
    const out = describeRun(facts({}))

    expect(out?.verdict).toBe('published')
    expect(out?.iteration).toBe(12)
    expect(out?.journal).toEqual(JOURNAL)
    expect(out?.failed).toBeUndefined()
    expect(out?.bytes?.site).toBe(2_000_000)
  })

  test('a push that was never a candidate leaves no line', () => {
    expect(describeRun(facts({ policy: { ...ACCEPTED, verdict: 'ignored', journal: null }}))).toBeNull()
  })

  test('a policy rejection carries its reasons', () => {
    const out = describeRun(facts({
      needs:  { policy: OK, build: SKIPPED, verify: SKIPPED, promote: SKIPPED, publish: SKIPPED },
      policy: { ...ACCEPTED, verdict: 'rejected', failures: [ 'new package "leftpad"' ]},
      report: null,
      result: null,
    }))

    expect(out?.verdict).toBe('rejected')
    expect(out?.failed).toEqual([ 'new package "leftpad"' ])
    expect(out?.iteration).toBeUndefined()
  })

  test('a failed build is the candidate\'s fault, a failed publish is not', () => {
    const build = describeRun(facts({ needs: { policy: OK, build: FAILED, verify: SKIPPED, promote: SKIPPED, publish: SKIPPED }, report: null, result: null }))

    expect(build?.verdict).toBe('rejected')

    const publish = describeRun(facts({ needs: { policy: OK, build: OK, verify: OK, promote: OK, publish: FAILED }, result: null }))

    expect(publish?.verdict).toBe('infra-error')
  })

  test('failed checks become the reasons', () => {
    const out = describeRun(facts({
      needs:  { policy: OK, build: OK, verify: OK, promote: SKIPPED, publish: SKIPPED },
      report: { ...PASSING, verdict: 'fail', checks: [{ name: 'draw calls (mobile)', ok: false, detail: '307 of 100' }, { name: 'contract', ok: true, detail: '' }]},
      result: null,
    }))

    expect(out?.verdict).toBe('rejected')
    expect(out?.failed).toEqual([ 'draw calls (mobile): 307 of 100' ])
  })

  test('a browser that cannot draw is nobody\'s rejection', () => {
    const out = describeRun(facts({ report: { ...PASSING, verdict: 'infra-error' }, result: null }))

    expect(out?.verdict).toBe('infra-error')
  })

  test('superseded, and a promotion that failed', () => {
    const superseded = describeRun(facts({ needs: { policy: OK, build: OK, verify: OK, promote: { result: 'success', outputs: { superseded: 'true' }}, publish: SKIPPED }, result: null }))

    expect(superseded?.verdict).toBe('superseded')

    const moved = describeRun(facts({ needs: { policy: OK, build: OK, verify: OK, promote: FAILED, publish: SKIPPED }, result: null }))

    expect(moved?.verdict).toBe('rejected')
    expect(moved?.failed?.[0]).toContain('could not be landed')
  })

  test('a framework change is flagged', () => {
    const out = describeRun(facts({ policy: { ...ACCEPTED, guarded: [ 'budgets.json' ]}}))

    expect(out?.framework).toEqual([ 'budgets.json' ])
  })

  test('a push to main publishes without a promote job', () => {
    const out = describeRun(facts({ mode: 'main', ref: 'main', needs: { policy: OK, build: OK, verify: OK, promote: SKIPPED, publish: OK }}))

    expect(out?.verdict).toBe('published')
  })
})

describe('planWatch', () => {
  const base = { now: NOW, paused: false, siteWarn: 700_000_000 }

  test('a healthy day needs nothing', () => {
    const plan = planWatch({ ...base, ledger: [ line({}) ], branches: []})

    expect(plan).toEqual({ alerts: [], dispatch: [], republish: false, prune: []})
  })

  test('silence is an alert, unless paused', () => {
    const quiet = [ line({ ts: new Date(NOW - 40 * HOUR).toISOString() }) ]

    expect(planWatch({ ...base, ledger: quiet, branches: []}).alerts).toHaveLength(1)
    expect(planWatch({ ...base, paused: true, ledger: quiet, branches: []}).alerts).toHaveLength(0)
    expect(planWatch({ ...base, ledger: [], branches: []}).alerts[0]).toContain('routine')
  })

  test('three rejections in a row is an alert', () => {
    const ledger = [ line({}), line({ verdict: 'rejected' }), line({ verdict: 'rejected' }), line({ verdict: 'rejected', failed: [ 'draw calls: 300 of 100' ]}) ]

    expect(planWatch({ ...base, ledger, branches: []}).alerts.join(' ')).toContain('draw calls')
  })

  test('a landed framework change is mentioned once it is recent', () => {
    const ledger = [ line({ framework: [ 'budgets.json' ], journal: { title: 'Raise the triangle budget', summary: '' }}) ]

    expect(planWatch({ ...base, ledger, branches: []}).alerts.join(' ')).toContain('Raise the triangle budget')
  })

  test('a candidate nobody judged is dispatched; judged, stale or journal-less ones are not', () => {
    const plan = planWatch({
      ...base,
      ledger:   [ line({ sha: 'd'.repeat(40) }) ],
      branches: [
        branch({}),
        branch({ name: 'claude/judged', sha: 'd'.repeat(40) }),
        branch({ name: 'claude/old', sha: 'e'.repeat(40), committed: NOW - 5 * 24 * HOUR }),
        branch({ name: 'claude/wip', sha: 'f'.repeat(40), journalled: false }),
      ],
    })

    expect(plan.dispatch).toEqual([{ ref: 'claude/new', sha: 'c'.repeat(40) }])
  })

  test('one broken publish is retried once', () => {
    const broke = line({ verdict: 'infra-error', ts: new Date(NOW - 3 * HOUR).toISOString() })

    expect(planWatch({ ...base, ledger: [ line({}), broke ], branches: []}).republish).toBe(true)
    expect(planWatch({ ...base, ledger: [ broke, broke ], branches: []}).republish).toBe(false)
  })

  test('old branches are pruned', () => {
    const plan = planWatch({ ...base, ledger: [ line({}) ], branches: [ branch({ name: 'claude/ancient', committed: NOW - 20 * 24 * HOUR, journalled: false }) ]})

    expect(plan.prune).toEqual([ 'claude/ancient' ])
  })

  test('a large site is an alert', () => {
    const ledger = [ line({ bytes: { new: 1, site: 800_000_000 }}) ]

    expect(planWatch({ ...base, ledger, branches: []}).alerts.join(' ')).toContain('800 MB')
  })
})
