// src/world/shared/washing.test.ts
import { describe, expect, test } from 'bun:test'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { VIEWS, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { HEIGHT, SAG, SPAN, createWashing } from './washing.ts'
import { createWood } from './wood.ts'
import { createYard } from './yard.ts'


describe('the washing line', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const burn    = createBurn(ground, path, [ infield.fold ])
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const yard    = createYard(ground, path, shelter)
  const washing = createWashing(ground)

  /** Places along the line, pole to pole. */
  const along = Array.from({ length: 15 }, (_, index) => washing.lineAt(index / 14))

  test('is two poles a span apart, and the same every time', () => {
    const [ first, second ] = washing.poles

    expect(Math.hypot(second.x - first.x, second.z - first.z)).toBeCloseTo(SPAN, 9)
    expect(Math.hypot(...washing.along)).toBeCloseTo(1, 9)
    expect(createWashing(ground).poles).toEqual(washing.poles)
    expect(first.top - first.foot).toBe(HEIGHT)
    expect(ground.heightAt(first.x, first.z)).toBe(first.foot)
  })

  test('runs along the hill: its poles stand level, and what hangs from it clears the grass', () => {
    const [ first, second ] = washing.poles

    expect(Math.abs(first.foot - second.foot)).toBeLessThan(0.5)

    // Nothing on it hangs more than a stride and a half; a hem thrown uphill still clears.
    for (const { x, y, z } of along)
      for (const aside of [ -0.5, 0, 0.5 ])
        expect(y - 1.35 - ground.heightAt(x - washing.along[1] * aside, z + washing.along[0] * aside)).toBeGreaterThan(0.2)

    expect(washing.lineAt(0.5).y).toBeCloseTo((first.top + second.top) / 2 - SAG, 9)
  })

  test('stands on the green by the house, off the house, the walls, the paths, the stacks and every tree', () => {
    for (const { x, z } of along) {
      expect(ground.heightAt(x, z)).toBeGreaterThan(2)
      expect(ground.slopeAt(x, z)).toBeLessThan(0.3)
      expect(shelter.distanceTo(x, z)).toBeGreaterThan(1.2)
      expect(shelter.distanceTo(x, z)).toBeLessThan(9)
      expect(shelter.distanceToSpur(x, z)).toBeGreaterThan(3)
      expect(path.distanceTo(x, z)).toBeGreaterThan(5)
      expect(infield.distanceTo(x, z)).toBeGreaterThan(1.5)
      expect(infield.inField(x, z)).toBe(false)
      expect(yard.distanceTo(x, z)).toBeGreaterThan(5)
      expect(burn.distanceTo(x, z)).toBeGreaterThan(10)
      expect(wood.distanceTo(x, z)).toBeGreaterThan(1.2)
    }
  })

  test('knows how far a place is from it', () => {
    const middle = washing.lineAt(0.5)

    expect(washing.distanceTo(middle.x, middle.z)).toBeCloseTo(0, 9)
    expect(washing.distanceTo(middle.x - washing.along[1] * 3, middle.z + washing.along[0] * 3)).toBeCloseTo(3, 9)
    expect(washing.distanceTo(washing.poles[1].x + washing.along[0] * 2, washing.poles[1].z + washing.along[1] * 2)).toBeCloseTo(2, 9)
  })

  test('stands clear of every postcard, and the tour never goes through it', () => {
    for (const view of VIEWS) {
      const [ x, , z ] = resolveView(view, ground).position

      expect(washing.distanceTo(x, z)).toBeGreaterThan(5)
    }

    const tour       = createWorldTour(ground, path)
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}

    // Under twice the height of the poles, the camera keeps well off the line.
    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, pose).position

      if (y < washing.poles[0].top + HEIGHT)
        expect(washing.distanceTo(x, z)).toBeGreaterThan(3)
    }
  })
})
