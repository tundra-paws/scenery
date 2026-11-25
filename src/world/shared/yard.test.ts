// src/world/shared/yard.test.ts
import { describe, expect, test } from 'bun:test'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { VIEWS, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createMill } from './mill.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { createWood } from './wood.ts'
import { KILN_RADIUS, STACK_EAVE, STACK_FOOT, createYard } from './yard.ts'


describe('the yard', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const burn    = createBurn(ground, path, [ infield.fold ])
  const mill    = createMill(ground, path, burn, infield)
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const yard    = createYard(ground, path, shelter)

  /** Everything round that stands in the yard: its middle and how far it reaches. */
  const rounds = [{ ...yard.kiln, reach: KILN_RADIUS + 0.4 }, ...yard.stacks.map(stack => ({ ...stack, reach: STACK_EAVE * stack.size })) ]

  test('is a kiln and four stacks, one of them still building, and the same every time', () => {
    expect(yard.stacks).toHaveLength(4)
    expect(yard.stacks.filter(stack => stack.raised < 1)).toHaveLength(1)
    expect(createYard(ground, path, shelter).stacks).toEqual(yard.stacks)
    expect(Math.hypot(...yard.kiln.mouth)).toBeCloseTo(1, 9)
  })

  test('leaves the path its width, and stands off the house, the mill, every wall and every tree', () => {
    for (const { x, z, reach } of rounds) {
      expect(path.distanceTo(x, z) - reach).toBeGreaterThan(1.5)
      expect(shelter.distanceTo(x, z) - reach).toBeGreaterThan(0.9)
      expect(mill.distanceTo(x, z) - reach).toBeGreaterThan(8)
      expect(infield.distanceTo(x, z) - reach).toBeGreaterThan(1.5)
      expect(infield.inField(x, z)).toBe(false)
      expect(burn.distanceTo(x, z) - reach).toBeGreaterThan(5)

      for (const tree of [ ...wood.trees, ...wood.outliers ])
        expect(Math.hypot(tree.x - x, tree.z - z) - reach).toBeGreaterThan(3)

      // A stump may stand at a stack's foot: it was cut before the stack was built.
      for (const stump of wood.stumps)
        expect(Math.hypot(stump.x - x, stump.z - z) - reach).toBeGreaterThan(0.3)
    }
  })

  test('gives every stack room: no two touch, and none stands on ground that falls away', () => {
    yard.stacks.forEach((stack, index) => {
      for (const other of yard.stacks.slice(index + 1))
        expect(Math.hypot(other.x - stack.x, other.z - stack.z)).toBeGreaterThan(STACK_EAVE * (stack.size + other.size))

      // The base is level: its low side is built up less than a stride, its high side let in less than that.
      for (let step = 0; step < 12; step += 1) {
        const land = ground.heightAt(stack.x + Math.cos(step * Math.PI / 6) * STACK_FOOT * stack.size, stack.z + Math.sin(step * Math.PI / 6) * STACK_FOOT * stack.size)

        expect(stack.base - land).toBeGreaterThan(-0.5)
        expect(stack.base - land).toBeLessThan(1)
      }
    })
  })

  test('has the kiln\'s mouth on its low side, a step from the ground, and its back let into the hill', () => {
    const { kiln } = yard
    const sill     = ground.heightAt(kiln.x + kiln.mouth[0] * (KILN_RADIUS + 0.6), kiln.z + kiln.mouth[1] * (KILN_RADIUS + 0.6))
    const back     = ground.heightAt(kiln.x - kiln.mouth[0] * KILN_RADIUS, kiln.z - kiln.mouth[1] * KILN_RADIUS)

    expect(Math.abs(sill - kiln.floor)).toBeLessThan(0.45)
    expect(back - kiln.floor).toBeGreaterThan(0.3)
    expect(back - kiln.floor).toBeLessThan(1.6)
  })

  test('is reached by ways that start where feet already go and end at what they go to', () => {
    const [ toKiln, toStacks ] = yard.ways
    const building             = yard.stacks.find(stack => stack.raised < 1)!

    expect(path.distanceTo(toKiln![0]!.x, toKiln![0]!.z)).toBeLessThan(0.01)
    expect(Math.hypot(toKiln!.at(-1)!.x - yard.kiln.x, toKiln!.at(-1)!.z - yard.kiln.z)).toBeLessThan(KILN_RADIUS + 1)
    expect(shelter.distanceToSpur(toStacks![0]!.x, toStacks![0]!.z)).toBeLessThan(0.5)
    expect(Math.hypot(toStacks!.at(-1)!.x - building.x, toStacks!.at(-1)!.z - building.z)).toBeLessThan(STACK_EAVE * 2)

    // No way goes through a stack or the kiln's wall, but for the last stride to the mouth.
    for (const way of yard.ways)
      for (const point of way.slice(0, -1))
        expect(yard.distanceTo(point.x, point.z)).toBeGreaterThan(0.15)

    expect(yard.distanceToSpur(toKiln![3]!.x, toKiln![3]!.z)).toBeLessThan(1e-9)
  })

  test('knows how far a place is from what stands in it', () => {
    const [ first ] = yard.stacks

    expect(yard.distanceTo(yard.kiln.x, yard.kiln.z)).toBe(0)
    expect(yard.distanceTo(first!.x, first!.z)).toBe(0)
    expect(yard.distanceTo(first!.x + STACK_EAVE * first!.size + 2, first!.z)).toBeGreaterThan(0.5)
    expect(yard.distanceTo(600, 600)).toBeGreaterThan(500)
  })

  test('stands clear of every postcard, and the tour never goes through it', () => {
    for (const view of VIEWS) {
      const [ x, , z ] = resolveView(view, ground).position

      expect(yard.distanceTo(x, z)).toBeGreaterThan(3)
    }

    const tour       = createWorldTour(ground, path)
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}

    // Under the height of the kiln's roof or a stack's top, the camera keeps off them: the walk up passes between.
    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, pose).position

      if (y < yard.kiln.floor + 6)
        expect(yard.distanceTo(x, z)).toBeGreaterThan(0.6)
    }
  })
})
