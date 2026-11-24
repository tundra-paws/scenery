// src/rig/tour.test.ts
import { describe, expect, test } from 'bun:test'

import { DAY, elevationAt } from '../world/shared/daylight.ts'
import { createGround } from '../world/shared/ground.ts'
import { createPath } from '../world/shared/path.ts'
import { createShelter } from '../world/shared/shelter.ts'
import { createWood } from '../world/shared/wood.ts'
import { VIEWS } from '../world/views.ts'
import type { Pose } from '../world/views.ts'
import { WORLD_SEED } from '../world/world.ts'
import { createWorldTour } from './route.ts'
import { createTour, smootherstep, tourDuration, tourPose } from './tour.ts'
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
})

describe('a walked leg', () => {
  // From the first view to the second on foot: out along x, a square corner, and on along z.
  const way   = [[ 10, 5, 0 ], [ 20, 5, 0 ], [ 30, 5, 0 ], [ 40, 5, 0 ], [ 40, 5, 5 ]] as const
  const walks = [{ way, pace: 2 }, null, null ]
  const tour  = createTour(POSES, { dwell: 4, travel: 10, walks })
  const walk  = tour.walks[0]!

  test('takes its own time, and the loop is that much longer', () => {
    // 45 units at two a second, and longer for the corner and for setting off and stopping.
    expect(walk.length).toBeCloseTo(40 + 5 + Math.hypot(0, 3, 5), 9)
    expect(walk.travel).toBeGreaterThan(walk.length / 2)
    expect(walk.travel).toBeLessThan(walk.length / 2 * 1.6)
    expect(tour.starts).toEqual([ 0, 4 + walk.travel, 18 + walk.travel, 32 + walk.travel ])
    expect(tourDuration(tour)).toBe(32 + walk.travel)
    expect(tour.walks.slice(1)).toEqual([ null, null ])
  })

  test('rests at both its views exactly as a flown leg does', () => {
    const flown = createTour(POSES, { dwell: 4, travel: 10 })

    expect(tourPose(tour, 2, blank())).toEqual(tourPose(flown, 2, blank()))

    // The moment it arrives, less the drift, which runs on the tour's own clock.
    const arrived = tourPose(tour, 4 + walk.travel, blank())
    const there   = tourPose(flown, 14, blank())

    for (let axis = 0; axis < 3; axis += 1) {
      expect(Math.abs(arrived.position[axis]! - there.position[axis]!)).toBeLessThan(1.3)
      expect(Math.abs(arrived.target[axis]! - there.target[axis]!)).toBeLessThan(1e-9)
    }
  })

  test('keeps to its way, never above its pace, and never turns its head in a hurry', () => {
    const last = tourPose(tour, 4, blank())
    const next = blank()

    let turned = 0

    for (let frame = 1; frame < walk.travel * 60; frame += 1) {
      tourPose(tour, 4 + frame / 60, next)

      const [ x, y, z ] = next.position
      const off         = z < 0.7 ? Math.hypot(y - 5, z) : Math.min(Math.hypot(x - 40, y - 5), Math.hypot(x - 40, y - (5 + (z - 5) * 0.6)))

      // On the line, give or take the drift.
      expect(Math.min(off, Math.hypot(y - 5, Math.max(0, z)))).toBeLessThan(1.1)
      expect(Math.hypot(x - last.position[0], y - last.position[1], z - last.position[2]) * 60).toBeLessThan(2 + 0.3)

      const gaze = (pose: Pose): number[] => {
        const look = pose.target.map((value, axis) => value - pose.position[axis]!)
        const far  = Math.hypot(look[0]!, look[1]!, look[2]!)

        return look.map(value => value / far)
      }

      const [ gx, gy, gz ] = gaze(next)
      const [ lx, ly, lz ] = gaze(last)

      turned = Math.max(turned, Math.acos(Math.min(1, gx * lx! + gy! * ly! + gz! * lz!)) * 60)

      for (let axis = 0; axis < 3; axis += 1) {
        last.position[axis] = next.position[axis]!
        last.target[axis]   = next.target[axis]!
      }
    }

    // A square corner, taken at under half a radian a second.
    expect(turned).toBeLessThan(0.5)
  })

  test('slows for a bend', () => {
    // Ninety-six units straight out, and the same distance out, round a hairpin and back.
    const out     = createTour([ POSES[0]!, { position: [ 96, 5, 0 ], target: [ 126, 5, 0 ]}], { walks: [{ way: [], pace: 4 }]}).walks[0]!
    const back    = [{ position: [ 0, 5, 0 ], target: [ 30, 5, 0 ]}, { position: [ 0, 5, 14 ], target: [ -30, 5, 14 ]}] satisfies Pose[]
    const hairpin = createTour(back, { walks: [{ way: [[ 40, 5, 0 ], [ 44, 5, 7 ], [ 40, 5, 14 ]], pace: 4 }]}).walks[0]!

    expect(out.length).toBe(96)
    expect(hairpin.length).toBeGreaterThan(94)
    expect(hairpin.length).toBeLessThan(98)

    // The straight way is all but at pace; the hairpin costs seconds.
    expect(out.travel).toBeLessThan(96 / 4 * 1.25)
    expect(hairpin.travel).toBeGreaterThan(out.travel + 2)
  })

  test('is a pure function of time', () => {
    const first = tourPose(tour, 11.4, blank())

    tourPose(tour, 3, blank())
    tourPose(tour, 700, blank())

    expect(tourPose(tour, 11.4, blank())).toEqual(first)
  })
})

describe('the world\'s own tour', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground)
  const surface = (x: number, z: number): number => Math.max(ground.heightAt(x, z), ground.waterLevel)
  const tour    = createWorldTour(ground, path)

  /** The largest drift the tour adds to a resting camera's height, and to where it stands. */
  const DRIFT = 0.3
  const SWAY  = 0.6 * Math.SQRT2

  test('never takes the camera into the island', () => {
    const lowest = Math.min(...VIEWS.map(view => view.height))

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, blank()).position

      // Never lower over the ground than the lowest postcard already stands.
      expect(y - surface(x, z)).toBeGreaterThan(lowest - DRIFT - 0.01)
    }
  })

  test('walks the path where a view says so, and flies the rest', () => {
    expect(tour.walks.map(walk => walk !== null)).toEqual(VIEWS.map(view => view.walk === true))
    expect(VIEWS.filter(view => view.walk).map(view => view.name)).toEqual([ 'landing' ])

    const index = VIEWS.findIndex(view => view.walk)
    const walk  = tour.walks[index]!
    const start = tour.starts[index]! + tour.dwell
    const shore = Math.hypot(walk.line[1]![0] - walk.line[0]![0], walk.line[1]![2] - walk.line[0]![2])

    let ashore = 0

    for (let t = start; t < start + walk.travel; t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, blank()).position

      // It comes in over the water to the foot of the path, and from there keeps to it.
      if (Math.hypot(x - walk.line[0]![0], z - walk.line[0]![2]) < shore + SWAY)
        continue

      ashore += 1

      expect(path.distanceTo(x, z)).toBeLessThan(SWAY + 0.2)
      expect(y - surface(x, z)).toBeLessThan(4)
    }

    expect(ashore).toBeGreaterThan(400)
  })

  test('takes one day, so every stop keeps its hour', () => {
    // The light is a function of the time alone (`shared/daylight.ts`), and
    // the walk up is timed for dusk. A loop of any other length would drift
    // from it, a little more each time round. Change `DAY` with the tour.
    expect(Math.abs(tourDuration(tour) - DAY)).toBeLessThan(0.5)

    const at = (name: string): number => elevationAt(tour.starts[VIEWS.findIndex(view => view.name === name)]! + tour.dwell / 2)

    // The sun is up and low over the landing, and well down behind the
    // night's three stops, where the moon is up as high as the sun is down.
    expect(at('landing')).toBeGreaterThan(0)
    expect(at('landing')).toBeLessThan(9)
    expect(at('climb')).toBeLessThan(-12)
    expect(at('seaward')).toBeLessThan(-15)
    expect(at('island')).toBeLessThan(-15)
    expect(at('ridge')).toBeGreaterThan(0)
    expect(at('shelter')).toBeGreaterThan(24)
  })

  test('gives a leg its own time where a view asks for it', () => {
    VIEWS.forEach((view, index) => {
      if (!view.walk)
        expect(tour.travels[index]).toBe(view.travel ?? tour.travel)
    })
  })

  test('never flies through the wood', () => {
    const wood = createWood({ ground, path, shelter: createShelter(ground, path) }, WORLD_SEED)

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, blank()).position

      for (const tree of wood.trees) {
        if (y > tree.foot + tree.height + 0.5)
          continue

        // Clear of the crown where the camera is as high as one, and of the trunk under it.
        const crown = y > tree.foot + tree.height * 0.4

        expect(Math.hypot(tree.x - x, tree.z - z)).toBeGreaterThan(crown ? tree.height * 0.33 + 1 : 1.5)
      }
    }
  })

  test('never hurries and never whips the camera round', () => {
    const last = tourPose(tour, 0, blank())
    const next = blank()

    for (let frame = 1; frame < tourDuration(tour) * 60; frame += 1) {
      tourPose(tour, frame / 60, next)

      const moved = Math.hypot(next.position[0] - last.position[0], next.position[1] - last.position[1], next.position[2] - last.position[2])
      const look  = [ last, next ].map(pose => pose.target.map((value, axis) => value - pose.position[axis]!))
      const dot   = look[0]![0]! * look[1]![0]! + look[0]![1]! * look[1]![1]! + look[0]![2]! * look[1]![2]!
      const turn  = Math.acos(Math.min(1, dot / (Math.hypot(...look[0]!) * Math.hypot(...look[1]!))))

      // Under 35 units and under 35 degrees a second, everywhere on the loop.
      expect(moved * 60).toBeLessThan(35)
      expect(turn * 60 * 180 / Math.PI).toBeLessThan(35)

      for (let axis = 0; axis < 3; axis += 1) {
        last.position[axis] = next.position[axis]!
        last.target[axis]   = next.target[axis]!
      }
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
