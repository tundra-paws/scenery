// src/world/shared/wood.test.ts
import { describe, expect, test } from 'bun:test'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createPath } from './path.ts'
import { SHELTER_LONG, createShelter } from './shelter.ts'
import { createWood } from './wood.ts'


describe('the wood', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground)
  const shelter = createShelter(ground, path)
  const wood    = createWood({ ground, path, shelter }, WORLD_SEED)
  const all     = [ ...wood.trees, ...wood.stumps ]

  test('is a wood, and the same one every time', () => {
    expect(wood.trees.length).toBeGreaterThan(35)
    expect(wood.trees.length).toBeLessThan(80)
    expect(createWood({ ground, path, shelter }, WORLD_SEED).trees).toEqual(wood.trees)
  })

  test('roots on dry, gentle ground round its heart, each tree where it says it is', () => {
    for (const tree of all) {
      expect(tree.foot).toBe(ground.heightAt(tree.x, tree.z))
      expect(tree.foot).toBeGreaterThan(ground.waterLevel + 1.5)
      expect(tree.foot).toBeLessThan(ground.waterLevel + ground.relief * 0.5)
      expect(ground.slopeAt(tree.x, tree.z)).toBeLessThan(0.2)
      expect(Math.hypot(tree.x - wood.x, tree.z - wood.z)).toBeLessThan(wood.reach)
    }
  })

  test('keeps off the path, the shelter and the way to its door, and no two trunks share a place', () => {
    for (const tree of all) {
      expect(path.distanceTo(tree.x, tree.z)).toBeGreaterThan(4)
      expect(shelter.distanceTo(tree.x, tree.z)).toBeGreaterThan(3)
      expect(shelter.distanceToSpur(tree.x, tree.z)).toBeGreaterThan(3)

      for (const other of all)
        if (other !== tree)
          expect(Math.hypot(tree.x - other.x, tree.z - other.z)).toBeGreaterThan(2.5)
    }
  })

  test('leaves the door its view: nothing grows before the gable it is in', () => {
    for (const tree of all)
      expect((tree.x - shelter.x) * shelter.door[0] + (tree.z - shelter.z) * shelter.door[1]).toBeLessThan(SHELTER_LONG / 2)
  })

  test('is taller in the low middle than at the treeline, and more bent the higher it stands', () => {
    const low  = wood.trees.filter(tree => tree.foot < 5)
    const high = wood.trees.filter(tree => tree.foot > 12)
    const mean = (trees: typeof low, of: (tree: typeof low[number]) => number): number => trees.reduce((sum, tree) => sum + of(tree), 0) / trees.length

    expect(low.length).toBeGreaterThan(5)
    expect(high.length).toBeGreaterThan(2)
    expect(mean(low, tree => tree.height)).toBeGreaterThan(mean(high, tree => tree.height) + 1.5)
    expect(mean(high, tree => tree.lean)).toBeGreaterThan(mean(low, tree => tree.lean))

    // Every one of them leans downwind, and none so far that it would fall.
    for (const tree of wood.trees) {
      expect(tree.lean).toBeGreaterThan(0.05)
      expect(tree.lean).toBeLessThan(0.4)
    }
  })

  test('has lost the trees nearest the door to the fire', () => {
    const door = shelter.place(0, SHELTER_LONG / 2)
    type TreeType = { x: number, z: number }

    const near = (tree: TreeType): number => Math.hypot(tree.x - door.x, tree.z - door.z)

    expect(wood.stumps.length).toBe(3)

    for (const stump of wood.stumps)
      for (const tree of wood.trees)
        expect(near(stump)).toBeLessThan(near(tree))
  })

  test('knows how far a place is from the nearest trunk or stump', () => {
    const [ tree ]  = wood.trees
    const [ stump ] = wood.stumps

    expect(wood.distanceTo(tree!.x, tree!.z)).toBe(0)
    expect(wood.distanceTo(stump!.x + 0.5, stump!.z)).toBeCloseTo(0.5, 9)
    expect(wood.distanceTo(-100, -100)).toBeGreaterThan(100)
  })

  test('stands clear of every postcard: no camera has a trunk within arm\'s reach or stands in a crown', () => {
    for (const view of VIEWS) {
      const [ x, y, z ] = resolveView(view, ground).position

      for (const tree of wood.trees) {
        const away = Math.hypot(tree.x - x, tree.z - z)

        expect(away).toBeGreaterThan(2)

        // A crown is the top three fifths of a tree, about a third of its height across.
        if (y > tree.foot + tree.height * 0.4 && y < tree.foot + tree.height + 0.5)
          expect(away).toBeGreaterThan(tree.height * 0.33 + 1)
      }
    }
  })
})
