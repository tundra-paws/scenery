// src/world/shared/moor.test.ts
import { describe, expect, test } from 'bun:test'

import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createMoor } from './moor.ts'
import { createPath } from './path.ts'
import { createShelter } from './shelter.ts'


describe('the moor', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const moor    = createMoor(ground, WORLD_SEED)
  const infield = createInfield(createShelter(ground, createPath(ground)))

  /** The heather's share at a place, read from the land there. */
  const heather = (x: number, z: number): number => moor.heatherAt(x, z, ground.heightAt(x, z), ground.slopeAt(x, z))

  /** Every second unit over the land, above the sand. */
  const land: { x: number, z: number }[] = []

  for (let x = -120; x <= 120; x += 2)
    for (let z = -120; z <= 120; z += 2)
      if (ground.heightAt(x, z) > ground.waterLevel + 1)
        land.push({ x, z })

  test('says the same of every place every time', () => {
    const again = createMoor(ground, WORLD_SEED)

    for (const { x, z } of land.slice(0, 400))
      expect(again.heatherAt(x, z, ground.heightAt(x, z), ground.slopeAt(x, z))).toBe(heather(x, z))
  })

  test('keeps to the hill: none in the field, and grass along the shore', () => {
    for (const { x, z } of land) {
      const share = heather(x, z)

      expect(share).toBeGreaterThanOrEqual(0)
      expect(share).toBeLessThanOrEqual(1)

      if (infield.inField(x, z))
        expect(share).toBe(0)

      if (ground.heightAt(x, z) - ground.waterLevel < ground.relief * 0.15)
        expect(share).toBe(0)
    }
  })

  test('covers much of the hill, in patches, not all of it', () => {
    const hill  = land.filter(({ x, z }) => ground.heightAt(x, z) - ground.waterLevel > ground.relief * 0.3)
    const thick = hill.filter(({ x, z }) => heather(x, z) > 0.5).length / hill.length

    expect(thick).toBeGreaterThan(0.35)
    expect(thick).toBeLessThan(0.95)
  })
})
