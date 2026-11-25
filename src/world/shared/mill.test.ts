// src/world/shared/mill.test.ts
import { describe, expect, test } from 'bun:test'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { VIEWS, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { MILL_DEEP, MILL_DOOR, MILL_LONG, MILL_RACE, createMill } from './mill.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { createWood } from './wood.ts'


describe('the mill', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const burn    = createBurn(ground, path, [ infield.fold ])
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const mill    = createMill(ground, path, burn, infield)

  /** Height of the land over the floor, at a place in the mill's own frame. */
  const land = (across: number, along: number): number => {
    const { x, z } = mill.place(across, along)

    return ground.heightAt(x, z) - mill.floor
  }

  test('stands astride the burn, above its pool, the water running under one end', () => {
    const [ into, out ] = mill.under

    expect(out - into).toBeCloseTo(MILL_DEEP, 9)
    expect(out).toBeLessThan(burn.pool.along)
    expect(burn.pool.along - out).toBeLessThan(4)

    // The water comes in under the upstream wall and leaves under the other,
    // where the mill's frame says it does.
    for (const across of [ -MILL_DEEP / 2, 0, MILL_DEEP / 2 ]) {
      const { x, z } = mill.place(across, MILL_RACE)

      expect(burn.distanceTo(x, z)).toBeLessThan(0.35)
      expect(mill.distanceTo(x, z)).toBeLessThan(1e-9)
    }
  })

  test('has a level floor over the water: a hole to come in by, and the wheel\'s room where it leaves', () => {
    expect(land(-MILL_DEEP / 2, MILL_RACE)).toBeLessThan(-0.6)
    expect(land(MILL_DEEP / 2, MILL_RACE)).toBeLessThan(-1.8)
    expect(land(MILL_DEEP / 2, MILL_RACE)).toBeGreaterThan(-3.2)

    // And the door is no more than a step up from the ground outside it.
    expect(land(-MILL_DEEP / 2 - 0.8, MILL_DOOR)).toBeGreaterThan(-0.6)
    expect(land(-MILL_DEEP / 2 - 0.8, MILL_DOOR)).toBeLessThan(0.3)
  })

  test('keeps clear of the path, the walls, the house, every tree and every camera', () => {
    for (const across of [ -MILL_DEEP / 2, 0, MILL_DEEP / 2 ])
      for (const along of [ -MILL_LONG / 2, 0, MILL_LONG / 2 ]) {
        const { x, z } = mill.place(across, along)

        expect(path.distanceTo(x, z)).toBeGreaterThan(3)
        expect(infield.distanceTo(x, z)).toBeGreaterThan(1.8)
        expect(shelter.distanceTo(x, z)).toBeGreaterThan(15)
        expect(wood.distanceTo(x, z)).toBeGreaterThan(4)
      }

    for (const view of VIEWS) {
      const [ x, , z ] = resolveView(view, ground).position

      expect(mill.distanceTo(x, z)).toBeGreaterThan(6)
    }
  })

  test('is reached from the path, dry-shod: the way to its door crosses the burn on the bridge', () => {
    const first  = mill.spur[0]!
    const last   = mill.spur.at(-1)!
    const wet    = mill.spur.filter(({ x, z }) => burn.distanceTo(x, z) < 0.5)
    const bridge = mill.bridge

    expect(path.distanceTo(first.x, first.z)).toBeLessThan(0.01)
    expect(mill.distanceTo(last.x, last.z)).toBeGreaterThan(0.5)
    expect(mill.distanceTo(last.x, last.z)).toBeLessThan(1.2)
    expect(wet.length).toBeGreaterThan(0)
    expect(burn.distanceTo(bridge.x, bridge.z)).toBeLessThan(0.4)

    // Wherever the way is over the water it is on the slabs.
    for (const { x, z } of wet) {
      const along = (x - bridge.x) * bridge.along[0] + (z - bridge.z) * bridge.along[1]
      const off   = Math.abs((x - bridge.x) * bridge.along[1] - (z - bridge.z) * bridge.along[0])

      expect(Math.abs(along)).toBeLessThan(bridge.half)
      expect(off).toBeLessThan(0.3)
    }

    for (let index = 1; index < mill.spur.length; index += 1)
      expect(Math.hypot(mill.spur[index]!.x - mill.spur[index - 1]!.x, mill.spur[index]!.z - mill.spur[index - 1]!.z)).toBeLessThan(0.8)

    expect(mill.distanceToSpur(last.x, last.z)).toBeLessThan(1e-9)
  })

  test('leaves the burn a gate where it goes under the head-dyke, below the pool', () => {
    const { gate } = mill

    expect(burn.distanceTo(gate.x, gate.z)).toBeLessThan(0.05)
    expect(infield.distanceTo(gate.x, gate.z)).toBeLessThan(0.4)
    expect(Math.hypot(...gate.along)).toBeCloseTo(1, 9)
    expect(gate.half).toBeGreaterThan(burn.pool.half)
    expect(mill.distanceTo(gate.x, gate.z)).toBeGreaterThan(5)

    // Square enough to the water that the gap it leaves is the water's width.
    const reach = burn.reaches.reduce((best, each) => Math.hypot(each.x - gate.x, each.z - gate.z) < Math.hypot(best.x - gate.x, best.z - gate.z) ? each : best)

    expect(reach.along).toBeGreaterThan(burn.pool.along)
    expect(Math.abs(reach.ahead[0] * gate.along[0] + reach.ahead[1] * gate.along[1])).toBeLessThan(0.5)
    expect(reach.half).toBeLessThan(gate.half)
  })

  test('is never flown through: the tour keeps over its roof or off its walls', () => {
    const tour       = createWorldTour(ground, path)
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, pose).position

      if (y < mill.floor + 6)
        expect(mill.distanceTo(x, z)).toBeGreaterThan(2)
    }
  })
})
