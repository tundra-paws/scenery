// src/world/shared/bracken.test.ts
import { describe, expect, test } from 'bun:test'

import { WORLD_SEED } from '../world.ts'
import { createBracken } from './bracken.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { MOOR_FOOT, createMoor } from './moor.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'


describe('the bracken', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground, findSummit(ground))
  const infield = createInfield(createShelter(ground, path))
  const burn    = createBurn(ground, path, [ infield.fold ])
  const moor    = createMoor(ground, WORLD_SEED)
  const bracken = createBracken(ground, WORLD_SEED, { moor, path, infield, burn })

  /** The bracken's share and the heather's at a place, read from the land there. */
  const fern  = (x: number, z: number): number => bracken.brackenAt(x, z, ground.heightAt(x, z), ground.slopeAt(x, z))
  const heath = (x: number, z: number): number => moor.heatherAt(x, z, ground.heightAt(x, z), ground.slopeAt(x, z))

  /** Every second unit over the land, above the sand. */
  const land: { x: number, z: number }[] = []

  for (let x = -120; x <= 120; x += 2)
    for (let z = -120; z <= 120; z += 2)
      if (ground.heightAt(x, z) > ground.waterLevel + 1)
        land.push({ x, z })

  test('says the same of every place every time', () => {
    const again = createBracken(ground, WORLD_SEED, { moor, path, infield, burn })

    for (const { x, z } of land.slice(0, 400))
      expect(again.brackenAt(x, z, ground.heightAt(x, z), ground.slopeAt(x, z))).toBe(fern(x, z))
  })

  test('keeps off the field, the path, the burn and the sand', () => {
    for (const { x, z } of land) {
      const share = fern(x, z)

      expect(share).toBeGreaterThanOrEqual(0)
      expect(share).toBeLessThanOrEqual(1)

      if (infield.inField(x, z) || path.distanceTo(x, z) < 2.6 || burn.distanceTo(x, z) < 2 || ground.heightAt(x, z) - ground.waterLevel < 1.6)
        expect(share).toBe(0)
    }
  })

  test('never shares ground with the heather', () => {
    for (const { x, z } of land)
      if (heath(x, z) > 0.2)
        expect(fern(x, z)).toBe(0)
  })

  test('lies in beds over much of the lower hill, not all of it', () => {
    const lower = land.filter(({ x, z }) => {
      const above = (ground.heightAt(x, z) - ground.waterLevel) / ground.relief

      return above > 0.08 && above < MOOR_FOOT && ground.slopeAt(x, z) > 0.1 && ground.slopeAt(x, z) < 0.3
    })
    const thick = lower.filter(({ x, z }) => fern(x, z) > 0.5).length / lower.length

    expect(thick).toBeGreaterThan(0.2)
    expect(thick).toBeLessThan(0.85)
  })
})
