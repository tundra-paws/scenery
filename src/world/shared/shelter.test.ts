// src/world/shared/shelter.test.ts
import { describe, expect, test } from 'bun:test'

import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createPath } from './path.ts'
import { SHELTER_DEEP, SHELTER_LONG, createShelter } from './shelter.ts'


describe('the shelter\'s site', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground)
  const shelter = createShelter(ground, path)

  /** The four corners of the walls, in the shelter's own frame. */
  const corners = [[ -1, -1 ], [ 1, -1 ], [ -1, 1 ], [ 1, 1 ]].map(([ across, along ]) => shelter.place(across! * SHELTER_DEEP / 2, along! * SHELTER_LONG / 2))

  test('is dry land, with every corner of it well over the sea', () => {
    for (const corner of corners)
      expect(ground.heightAt(corner.x, corner.z)).toBeGreaterThan(ground.waterLevel + 3)
  })

  test('has its own frame square and of unit length', () => {
    const [ fx, fz ] = shelter.fall
    const [ dx, dz ] = shelter.door

    expect(Math.hypot(fx, fz)).toBeCloseTo(1, 9)
    expect(Math.hypot(dx, dz)).toBeCloseTo(1, 9)
    expect(fx * dx + fz * dz).toBeCloseTo(0, 9)

    // The turn a mesh is given takes its own z to the door and its own x downhill.
    expect(Math.sin(shelter.yaw)).toBeCloseTo(dx, 9)
    expect(Math.cos(shelter.yaw)).toBeCloseTo(dz, 9)
    expect(Math.cos(shelter.yaw)).toBeCloseTo(fx, 9)
    expect(-Math.sin(shelter.yaw)).toBeCloseTo(fz, 9)
  })

  test('lies along the hill: the land falls across it, and hardly along it', () => {
    const height = (across: number, along: number): number => {
      const { x, z } = shelter.place(across, along)

      return ground.heightAt(x, z)
    }

    const across = height(-SHELTER_DEEP / 2, 0) - height(SHELTER_DEEP / 2, 0)
    const along  = Math.abs(height(0, -SHELTER_LONG / 2) - height(0, SHELTER_LONG / 2))

    expect(across).toBeGreaterThan(1)
    expect(along).toBeLessThan(across / 3)

    // Dug in behind and built up in front, by less than the height of a wall.
    expect(shelter.floor).toBeGreaterThan(height(SHELTER_DEEP / 2, 0))
    expect(shelter.floor).toBeLessThan(height(-SHELTER_DEEP / 2, 0))
    expect(across).toBeLessThan(3)
  })

  test('stands clear of the path, with its door toward it', () => {
    for (const corner of corners)
      expect(path.distanceTo(corner.x, corner.z)).toBeGreaterThan(4)

    const step = shelter.place(0, SHELTER_LONG / 2 + 1)
    const back = shelter.place(0, -SHELTER_LONG / 2 - 1)

    expect(path.distanceTo(step.x, step.z)).toBeLessThan(path.distanceTo(back.x, back.z))
    expect(path.distanceTo(step.x, step.z)).toBeLessThan(8)
  })

  test('has a way worn to its door, from the path, round the outside of the walls', () => {
    const { spur } = shelter
    const join     = spur[0]!
    const step     = spur.at(-1)!

    expect(path.distanceTo(join.x, join.z)).toBeLessThan(0.01)
    expect(shelter.distanceTo(step.x, step.z)).toBeGreaterThan(0.5)
    expect(shelter.distanceTo(step.x, step.z)).toBeLessThan(1.5)

    let length = 0

    for (let index = 1; index < spur.length; index += 1) {
      length += Math.hypot(spur[index]!.x - spur[index - 1]!.x, spur[index]!.z - spur[index - 1]!.z)

      expect(shelter.distanceTo(spur[index]!.x, spur[index]!.z)).toBeGreaterThan(0.5)
    }

    // A few strides: a way to a door, not a second path.
    expect(length).toBeGreaterThan(4)
    expect(length).toBeLessThan(12)
    expect(shelter.distanceToSpur(step.x, step.z)).toBeCloseTo(0, 9)
    expect(shelter.distanceToSpur(shelter.x, shelter.z)).toBeGreaterThan(3)
  })

  test('knows how far a place is from its walls', () => {
    expect(shelter.distanceTo(shelter.x, shelter.z)).toBe(0)

    for (const corner of corners)
      expect(shelter.distanceTo(corner.x, corner.z)).toBeCloseTo(0, 9)

    const out  = shelter.place(SHELTER_DEEP / 2 + 3, 0)
    const past = shelter.place(SHELTER_DEEP / 2 + 3, SHELTER_LONG / 2 + 4)

    expect(shelter.distanceTo(out.x, out.z)).toBeCloseTo(3, 9)
    expect(shelter.distanceTo(past.x, past.z)).toBeCloseTo(5, 9)
  })
})
