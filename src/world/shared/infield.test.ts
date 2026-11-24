// src/world/shared/infield.test.ts
import { describe, expect, test } from 'bun:test'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import type { Waypoint } from './path.ts'
import { createShelter } from './shelter.ts'
import { createWood } from './wood.ts'


/** Every quarter unit along every stretch of wall. */
function along (runs: readonly (readonly Waypoint[])[]): Waypoint[] {
  const points: Waypoint[] = []

  for (const run of runs)
    for (let index = 1; index < run.length; index += 1) {
      const from  = run[index - 1]!
      const to    = run[index]!
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.25)

      for (let step = 0; step <= steps; step += 1)
        points.push({ x: from.x + (to.x - from.x) * step / steps, z: from.z + (to.z - from.z) * step / steps })
    }

  return points
}

describe('the infield', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const infield = createInfield(shelter)
  const wall    = along(infield.runs)

  test('has a field, a fold and a head-dyke, and the same ones every time', () => {
    expect(infield.runs).toHaveLength(3)
    expect(wall.length).toBeGreaterThan(500)
    expect(createInfield(shelter).runs).toEqual(infield.runs)
  })

  test('lets the path through: no wall comes within an arm\'s length of its middle', () => {
    for (const point of wall)
      expect(path.distanceTo(point.x, point.z)).toBeGreaterThan(2.3)

    for (const point of path.points)
      expect(infield.inField(point.x, point.z)).toBe(false)
  })

  test('keeps off the house and the way to its door', () => {
    for (const point of wall) {
      expect(shelter.distanceTo(point.x, point.z)).toBeGreaterThan(5)
      expect(shelter.distanceToSpur(point.x, point.z)).toBeGreaterThan(2)
    }
  })

  test('was walled round the trees, not through them, and nothing grows in the field', () => {
    for (const tree of [ ...wood.trees, ...wood.outliers, ...wood.stumps ]) {
      expect(infield.distanceTo(tree.x, tree.z)).toBeGreaterThan(2)
      expect(infield.inField(tree.x, tree.z)).toBe(false)
    }
  })

  test('is dug on dry land above the beach, and its dyke stands above the sea all round', () => {
    for (const corner of infield.field)
      expect(ground.heightAt(corner.x, corner.z)).toBeGreaterThan(ground.waterLevel + 1)

    for (const point of along([ infield.runs[0]!, infield.runs[1]! ]))
      expect(ground.heightAt(point.x, point.z)).toBeGreaterThan(ground.waterLevel + 0.8)
  })

  test('runs its head-dyke from the path, past the fold, down into the sea', () => {
    const head = infield.runs[2]!
    const fold = infield.fold

    expect(path.distanceTo(head[0]!.x, head[0]!.z)).toBeLessThan(3.5)
    expect(ground.heightAt(head.at(-1)!.x, head.at(-1)!.z)).toBeLessThan(ground.waterLevel + 0.5)
    expect(Math.min(...along([ head ]).map(point => Math.hypot(point.x - fold.x, point.z - fold.z)))).toBeLessThan(fold.radius + 0.6)
  })

  test('opens the field gate toward the house, and wears a way to it from the door\'s', () => {
    const [ gate ] = infield.gates
    const start    = infield.track[0]!
    const end      = infield.track.at(-1)!

    expect(shelter.distanceToSpur(start.x, start.z)).toBeLessThan(0.01)
    expect(infield.inField(end.x, end.z)).toBe(true)
    expect(Math.hypot(gate!.x - shelter.x, gate!.z - shelter.z)).toBeLessThan(15)

    // The gap is a gap: no stone line crosses it.
    for (const point of wall)
      expect(Math.hypot(point.x - gate!.x, point.z - gate!.z)).toBeGreaterThan(gate!.width / 2 - 0.01)
  })

  test('puts a post at each side of every gap, and one at the head-dyke\'s end', () => {
    expect(infield.posts).toHaveLength(infield.gates.length * 2 + 1)
  })

  test('knows how far a place is from a wall, and whether it is in the field', () => {
    const [ first ] = infield.field

    expect(infield.distanceTo(first!.x, first!.z)).toBeLessThan(1e-9)
    expect(infield.distanceTo(600, 600)).toBeGreaterThan(500)
    expect(infield.inField(58, 74)).toBe(true)
    expect(infield.inField(shelter.x, shelter.z)).toBe(false)
    expect(infield.inField(infield.fold.x, infield.fold.z)).toBe(false)
  })

  test('stands clear of every postcard: no camera is in a wall', () => {
    for (const view of VIEWS) {
      const [ x, y, z ] = resolveView(view, ground).position

      if (y < ground.heightAt(x, z) + 3)
        expect(infield.distanceTo(x, z)).toBeGreaterThan(1.5)
    }
  })
})
