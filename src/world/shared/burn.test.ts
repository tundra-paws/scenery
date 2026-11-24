// src/world/shared/burn.test.ts
import { describe, expect, test } from 'bun:test'

import { VIEWS } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { createWood } from './wood.ts'


describe('the burn', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const burn    = createBurn(ground, path, [ infield.fold ])
  const height  = (index: number): number => ground.heightAt(burn.reaches[index]!.x, burn.reaches[index]!.z)

  test('rises under the cairn and ends under the sea', () => {
    const spring = burn.reaches[0]!

    expect(Math.hypot(spring.x - summit.x, spring.z - summit.z)).toBeLessThan(14)
    expect(Math.hypot(spring.x - summit.x, spring.z - summit.z)).toBeGreaterThan(6)
    expect(height(0)).toBeGreaterThan(ground.relief * 0.4)
    expect(height(burn.reaches.length - 1)).toBeLessThan(ground.waterLevel)
    expect(ground.heightAt(burn.mouth.x, burn.mouth.z)).toBeLessThan(ground.waterLevel + 0.3)
  })

  test('only ever runs downhill', () => {
    for (let index = 1; index < burn.reaches.length; index += 1) {
      expect(height(index)).toBeLessThan(height(index - 1) + 0.02)
      expect(burn.reaches[index]!.along).toBeGreaterThan(burn.reaches[index - 1]!.along)
      expect(burn.reaches[index]!.since).toBeGreaterThan(burn.reaches[index - 1]!.since)
    }
  })

  test('keeps off the path, the landing and its slip, the house and the field', () => {
    const { landing } = path

    for (const reach of burn.reaches) {
      expect(path.distanceTo(reach.x, reach.z)).toBeGreaterThan(reach.half + 3)
      expect(shelter.distanceTo(reach.x, reach.z)).toBeGreaterThan(10)
      expect(infield.inField(reach.x, reach.z)).toBe(false)
      expect(Math.hypot(reach.x - infield.fold.x, reach.z - infield.fold.z)).toBeGreaterThan(infield.fold.radius + reach.half + 0.7)

      // The slip runs up the beach from the landing, 2.5 either side of its middle.
      for (let up = -6; up <= 8; up += 1)
        expect(Math.hypot(reach.x - (landing.x - landing.seaward[0] * up), reach.z - (landing.z - landing.seaward[1] * up))).toBeGreaterThan(reach.half + 3.5)
    }
  })

  test('runs past the trees, not through one, and under no camera', () => {
    for (const reach of burn.reaches) {
      expect(wood.distanceTo(reach.x, reach.z)).toBeGreaterThan(reach.half + 0.4)

      for (const view of VIEWS)
        expect(Math.hypot(reach.x - view.at[0], reach.z - view.at[1])).toBeGreaterThan(reach.half + 2)
    }
  })

  test('is narrow where it falls and wide where it does not', () => {
    const steep = burn.reaches.filter(reach => reach.fall > 0.9)
    const still = burn.reaches.filter(reach => reach.fall < 0.3 && ground.heightAt(reach.x, reach.z) > 3)

    expect(steep.length).toBeGreaterThan(2)
    expect(still.length).toBeGreaterThan(2)
    expect(Math.max(...steep.map(reach => reach.half))).toBeLessThan(Math.min(...still.map(reach => reach.half)))
    expect(burn.pool.fall).toBeLessThan(0.3)
    expect(burn.falls.along).toBeGreaterThan(burn.pool.along)
    expect(burn.falls.fall).toBeGreaterThan(0.55)
  })

  test('knows how far a place is from its water', () => {
    const reach = burn.reaches[20]!

    expect(burn.distanceTo(reach.x, reach.z)).toBeLessThan(0.01)
    expect(burn.distanceTo(reach.x - reach.ahead[1] * 3, reach.z + reach.ahead[0] * 3)).toBeGreaterThan(2.5)
    expect(burn.distanceTo(shelter.x, shelter.z)).toBeGreaterThan(15)
  })
})
