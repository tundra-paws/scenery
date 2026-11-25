// src/world/shared/gulls.test.ts
import { describe, expect, test } from 'bun:test'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { MAST } from '../features/boat/hull.ts'
import { berthAt, findMooring } from '../features/boat/mooring.ts'
import type { Berth } from '../features/boat/mooring.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { DAY, elevationAt } from './daylight.ts'
import { createGround } from './ground.ts'
import { createGulls } from './gulls.ts'
import type { Glide, Perch } from './gulls.ts'
import { createPath } from './path.ts'
import { createPier } from './pier.ts'
import { createWind } from './wind.ts'


describe('the gulls', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground)
  const wind    = createWind()
  const pier    = createPier(ground, path, wind)
  const perches = pier.poles.map(({ x, z, top }): Perch => [ x, top, z ])
  const gulls   = createGulls(pier, perches, wind.direction, WORLD_SEED, 'desktop')
  const blank   = (): Glide => ({ x: 0, y: 0, z: 0, yaw: 0, bank: 0, pitch: 0, spread: 0 })

  /** A bird that goes up, and one that never does. */
  const flier  = gulls.birds.find(gull => gull.roost < 45)!
  const sitter = gulls.birds.find(gull => gull.roost > 45)!

  test('are a few, fewer on a phone, never more than there are perches, and the same every time', () => {
    expect(gulls.birds.length).toBeGreaterThan(3)
    expect(gulls.birds.length).toBeLessThanOrEqual(perches.length)
    expect(createGulls(pier, perches, wind.direction, WORLD_SEED, 'mobile').birds.length).toBeLessThan(createGulls(pier, perches, wind.direction, WORLD_SEED, 'highEnd').birds.length + 1)
    expect(createGulls(pier, perches.slice(0, 2), wind.direction, WORLD_SEED, 'desktop').birds).toHaveLength(2)
    expect(createGulls(pier, perches, wind.direction, WORLD_SEED, 'desktop').birds).toEqual(gulls.birds)
    expect(new Set(gulls.birds.map(gull => gull.perch)).size).toBe(gulls.birds.length)
  })

  test('are where they are by the time and the sun alone', () => {
    const once  = gulls.at(flier, 73.4, 12, blank())
    const again = gulls.at(flier, 73.4, 12, blank())

    gulls.at(flier, 200, -20, blank())

    expect(gulls.at(flier, 73.4, 12, blank())).toEqual(once)
    expect(again).toEqual(once)
  })

  test('go round over the water off the pier, well over a mast, wings spread, leaning into the turn', () => {
    const boat         = findMooring(ground, path, wind)
    const berth: Berth = { x: 0, z: 0, heave: 0, yaw: 0, pitch: 0, roll: 0 }
    const held         = blank()

    for (const gull of gulls.birds.filter(bird => bird.roost < 45))
      for (let time = 0; time < 120; time += 0.1) {
        gulls.at(gull, time, 30, held)
        berthAt(boat, wind, time, berth)

        expect(ground.heightAt(held.x, held.z)).toBeLessThan(ground.waterLevel + 0.6)
        expect(held.y).toBeGreaterThan(ground.waterLevel + MAST.top + 0.5)
        expect(held.y).toBeLessThan(ground.waterLevel + 14)
        expect(held.spread).toBe(1)
        expect(held.pitch).toBe(0)
        expect(Math.sign(held.bank)).toBe(gull.way)
        expect(Math.abs(held.bank)).toBeLessThan(0.6)
      }
  })

  test('never jump, on the wing or coming down', () => {
    const last = blank()
    const next = blank()

    for (const gull of gulls.birds) {
      gulls.at(gull, 0, elevationAt(0), last)

      for (let frame = 1; frame < DAY * 60; frame += 1) {
        gulls.at(gull, frame / 60, elevationAt(frame / 60), next)

        // Under a stride a step: a gull on the wind does five units a second at the most.
        expect(Math.hypot(next.x - last.x, next.y - last.y, next.z - last.z)).toBeLessThan(0.12)

        Object.assign(last, next)
      }
    }
  })

  test('are down on a perch each by dark, head to wind, wings folded, and up again in the morning', () => {
    const held = blank()

    for (const gull of gulls.birds) {
      gulls.at(gull, 50, -10, held)

      expect(Math.hypot(held.x - gull.perch[0], held.z - gull.perch[2])).toBeLessThan(1e-9)
      expect(held.y - gull.perch[1]).toBeGreaterThan(0.1)
      expect(held.y - gull.perch[1]).toBeLessThan(0.3)
      expect(held.spread).toBe(0)
      expect(held.bank).toBeCloseTo(0, 9)

      // Its bill is into the wind, give or take the look round it takes.
      expect(Math.cos(held.yaw) * wind.direction[0] - Math.sin(held.yaw) * wind.direction[1]).toBeLessThan(-0.8)
    }

    expect(gulls.at(sitter, 50, 40, blank()).spread).toBe(0)
    expect(gulls.at(flier, 50, 10, blank()).spread).toBe(1)
  })

  test('keep out of the camera\'s way all the first day', () => {
    const tour       = createWorldTour(ground, path)
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}
    const held       = blank()

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, pose).position
      const elevation   = elevationAt(t)

      for (const gull of gulls.birds) {
        gulls.at(gull, t, elevation, held)

        expect(Math.hypot(held.x - x, held.y - y, held.z - z)).toBeGreaterThan(3)
      }
    }
  })
})
