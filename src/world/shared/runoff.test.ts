// src/world/shared/runoff.test.ts
import { describe, expect, test } from 'bun:test'
import { createSeededRng } from 'threejs-scenes/primitives'

import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { RILLS, createRunoff } from './runoff.ts'
import { createShelter } from './shelter.ts'


describe('the run-off', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground, findSummit(ground))
  const shelter = createShelter(ground, path)
  const burn    = createBurn(ground, path, [ createInfield(shelter).fold ])
  const built   = [ shelter ]
  const rills   = (tier: 'mobile' | 'desktop' = 'desktop', seed = 1): ReturnType<typeof createRunoff> => createRunoff({ ground, burn, built, rng: createSeededRng(seed).fork('test'), tier })
  const runoff  = rills()

  test('the same stream is the same rills, and a phone has fewer', () => {
    expect(rills()).toEqual(runoff)
    expect(runoff.length).toBeGreaterThan(8)
    expect(runoff.length).toBeLessThanOrEqual(RILLS.desktop)
    expect(rills('mobile').length).toBeLessThanOrEqual(RILLS.mobile)
  })

  test('rises high on the hill and only ever runs down it', () => {
    for (const { reaches } of runoff) {
      expect(ground.heightAt(reaches[0]!.x, reaches[0]!.z)).toBeGreaterThan(ground.relief * 0.25)

      for (let index = 1; index < reaches.length; index += 1) {
        const here = reaches[index]!
        const last = reaches[index - 1]!

        expect(ground.heightAt(here.x, here.z)).toBeLessThan(ground.heightAt(last.x, last.z) + 0.05)
        expect(here.along).toBeGreaterThan(last.along)
        expect(here.since).toBeGreaterThan(last.since)
      }
    }
  })

  test('keeps out of the house and stops at the burn', () => {
    for (const { reaches } of runoff)
      for (const reach of reaches) {
        expect(Math.hypot(reach.x - shelter.x, reach.z - shelter.z)).toBeGreaterThan(5.5)
        expect(burn.distanceTo(reach.x, reach.z)).toBeGreaterThan(1.2)
      }
  })

  test('is a thread: narrow at its head, wider as it gathers, never as wide as the burn', () => {
    for (const { reaches } of runoff) {
      expect(reaches[0]!.half).toBeLessThan(reaches.at(-1)!.half)
      expect(Math.max(...reaches.map(reach => reach.half))).toBeLessThan(burn.reaches[0]!.half)
    }
  })
})
