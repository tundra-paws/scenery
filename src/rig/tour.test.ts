// src/rig/tour.test.ts
import { describe, expect, test } from 'bun:test'

import { createGround } from '../world/shared/ground.ts'
import { VIEWS, resolveView } from '../world/views.ts'
import type { Pose } from '../world/views.ts'
import { WORLD_SEED } from '../world/world.ts'
import { TOUR_CLEARANCE, createTour, smootherstep, tourDuration, tourPose } from './tour.ts'
import type { Floor } from './tour.ts'


const POSES: Pose[] = [
  { position: [ 0, 5, 0 ], target: [ 10, 2, 0 ]},
  { position: [ 40, 8, 10 ], target: [ 0, 3, 0 ]},
  { position: [ 20, 12, -30 ], target: [ -5, 4, 5 ]},
]

function blank (): Pose {
  return { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}
}

describe('tourPose', () => {
  const tour = createTour(POSES, { dwell: 4, travel: 10 })

  test('is a pure function of time', () => {
    const first  = tourPose(tour, 17.25, blank())
    const second = tourPose(tour, 17.25, blank())

    // Asking for other moments in between must not change the answer.
    tourPose(tour, 3, blank())
    tourPose(tour, 900, blank())

    expect(tourPose(tour, 17.25, blank())).toEqual(first)
    expect(second).toEqual(first)
  })

  test('loops', () => {
    const loop = tourDuration(tour)

    expect(loop).toBe(42)

    const here  = tourPose(tour, 6, blank())
    const later = tourPose(tour, 6 + loop * 3, blank())

    // The drift is not periodic in the loop, so compare the path under it.
    for (let axis = 0; axis < 3; axis += 1)
      expect(Math.abs(later.target[axis]! - here.target[axis]!)).toBeLessThan(1e-9)
  })

  test('never jumps', () => {
    const step = 1 / 60
    const last = tourPose(tour, 0, blank())
    const next = blank()

    for (let frame = 1; frame < 60 * 90; frame += 1) {
      tourPose(tour, frame * step, next)

      const moved = Math.hypot(
        next.position[0] - last.position[0],
        next.position[1] - last.position[1],
        next.position[2] - last.position[2],
      )

      // 40 units in 10 seconds eased is under 0.2 a step at its fastest.
      expect(moved).toBeLessThan(0.25)

      for (let axis = 0; axis < 3; axis += 1) {
        expect(Number.isFinite(next.position[axis]!)).toBe(true)
        last.position[axis] = next.position[axis]!
      }
    }
  })

  test('rests at each view', () => {
    const resting = tourPose(tour, 14 + 2, blank())

    // Second leg, inside its dwell: the look-at point is exactly the view's.
    expect(resting.target).toEqual(POSES[1]!.target)
  })

  test('refuses an empty tour', () => {
    expect(() => createTour([])).toThrow()
  })
})

describe('a tour over ground', () => {
  // A wall 30 high across the way out of the first view and the way back into
  // it, and flat ground at zero everywhere else, including under every view.
  const wall: Floor = { surface: x => 30 * Math.exp(-((x - 10) ** 2) / 8), clearance: 3 }

  /** The largest drift the tour adds to a resting camera's height. */
  const DRIFT = 0.3

  test('goes straight when nothing is in the way', () => {
    const tour = createTour(POSES, { floor: { surface: () => -50, clearance: 3 }})

    expect(tour.rise).toEqual([ 0, 0, 0 ])
    expect(createTour(POSES).rise).toEqual([ 0, 0, 0 ])
  })

  test('goes over what is in the way, and no higher than it has to', () => {
    const straight = createTour(POSES, { dwell: 4, travel: 10 })
    const lifted   = createTour(POSES, { dwell: 4, travel: 10, floor: wall })

    let under = 0
    let spare = Infinity

    for (let t = 0; t < tourDuration(lifted); t += 0.02) {
      const [ x, y ]   = tourPose(lifted, t, blank()).position
      const [ sx, sy ] = tourPose(straight, t, blank()).position

      under = Math.max(under, wall.surface(sx, 0) - sy)
      spare = Math.min(spare, y - wall.surface(x, 0))
    }

    expect(under).toBeGreaterThan(10)
    expect(spare).toBeGreaterThan(wall.clearance - DRIFT - 0.5)
    expect(spare).toBeLessThan(wall.clearance + DRIFT + 0.5)
    expect(lifted.rise[1]).toBe(0)
  })

  test('still stands exactly at each view', () => {
    const lifted   = createTour(POSES, { dwell: 4, travel: 10, floor: wall })
    const straight = createTour(POSES, { dwell: 4, travel: 10 })

    for (const t of [ 0, 2, 14, 16, 28, 31 ])
      expect(tourPose(lifted, t, blank())).toEqual(tourPose(straight, t, blank()))
  })

  test('the world\'s own tour never takes the camera into the island', () => {
    const ground  = createGround({ seed: WORLD_SEED })
    const surface = (x: number, z: number): number => Math.max(ground.heightAt(x, z), ground.waterLevel)
    const tour    = createTour(VIEWS.map(view => resolveView(view, ground)), { floor: { surface, clearance: TOUR_CLEARANCE }})
    const lowest  = Math.min(...VIEWS.map(view => view.height))

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, blank()).position

      // Never lower over the ground than the lowest postcard already stands.
      expect(y - surface(x, z)).toBeGreaterThan(lowest - DRIFT - 0.01)
    }
  })
})

describe('smootherstep', () => {
  test('clamps and eases', () => {
    expect(smootherstep(-1)).toBe(0)
    expect(smootherstep(0)).toBe(0)
    expect(smootherstep(0.5)).toBe(0.5)
    expect(smootherstep(1)).toBe(1)
    expect(smootherstep(2)).toBe(1)
  })
})
