// src/world/features/boat/boat.test.ts
import { describe, expect, test } from 'bun:test'

import { createGround } from '../../shared/ground.ts'
import { createPath } from '../../shared/path.ts'
import { createWind } from '../../shared/wind.ts'
import { WORLD_SEED } from '../../world.ts'
import { LENGTH, MAST, createHullGeometry } from './hull.ts'
import { AFLOAT, SCOPE, berthAt, findMooring } from './mooring.ts'
import type { Berth } from './mooring.ts'
import { streamAt } from './pennant.ts'


const ground  = createGround({ seed: WORLD_SEED })
const path    = createPath(ground)
const wind    = createWind()
const mooring = findMooring(ground, path, wind)

function blank (): Berth {
  return { x: 0, z: 0, heave: 0, yaw: 0, pitch: 0, roll: 0 }
}

/** Where the bow (1) or the stern (-1) is, on the water. */
function end ({ x, z, yaw }: Berth, which: number): Pick<Berth, 'x' | 'z'> {
  return { x: x + Math.cos(yaw) * which * LENGTH / 2, z: z - Math.sin(yaw) * which * LENGTH / 2 }
}

describe('the boat\'s mooring', () => {
  test('is off the landing, to one side of the way in', () => {
    const { x, z, seaward: [ sx, sz ] } = path.landing
    const out                           = (mooring.rest.x - x) * sx + (mooring.rest.z - z) * sz
    const aside                         = Math.abs((mooring.rest.x - x) * sz - (mooring.rest.z - z) * sx)

    // Out past the last of the landing's stones, near enough to wade to, and
    // well off the line the tour comes in on between the two rows.
    expect(out).toBeGreaterThan(6)
    expect(out).toBeLessThan(20)
    expect(aside).toBeGreaterThan(LENGTH)
    expect(aside).toBeLessThan(25)
  })

  test('has its anchor upwind, a scope away', () => {
    expect(mooring.rest.x - mooring.anchor.x).toBeCloseTo(wind.direction[0] * SCOPE, 9)
    expect(mooring.rest.z - mooring.anchor.z).toBeCloseTo(wind.direction[1] * SCOPE, 9)
    expect(mooring.level).toBe(ground.waterLevel)
  })
})

describe('the boat at its anchor', () => {
  test('is a pure function of time', () => {
    const first = berthAt(mooring, wind, 31.7, blank())

    berthAt(mooring, wind, 2, blank())
    berthAt(mooring, wind, 800, blank())

    expect(berthAt(mooring, wind, 31.7, blank())).toEqual(first)
  })

  test('stays afloat from end to end, and off the way in, wherever it swings', () => {
    const { x, z, seaward: [ sx, sz ] } = path.landing
    const berth                         = blank()

    for (let time = 0; time < 600; time += 0.25) {
      berthAt(mooring, wind, time, berth)

      for (const place of [ berth, end(berth, 1), end(berth, -1) ]) {
        expect(ground.waterLevel - ground.heightAt(place.x, place.z)).toBeGreaterThan(AFLOAT)
        expect(Math.abs((place.x - x) * sz - (place.z - z) * sx)).toBeGreaterThan(5)
      }
    }
  })

  test('keeps its bow to the wind, and its anchor a scope ahead', () => {
    const berth = blank()

    for (let time = 0; time < 600; time += 0.25) {
      berthAt(mooring, wind, time, berth)

      const bow    = end(berth, 1)
      const upwind = -(bow.x - berth.x) * wind.direction[0] - (bow.z - berth.z) * wind.direction[1]

      // Within a dozen degrees of dead upwind, and on a taut rope.
      expect(upwind / (LENGTH / 2)).toBeGreaterThan(Math.cos(0.21))
      expect(Math.hypot(berth.x - mooring.anchor.x, berth.z - mooring.anchor.z)).toBeCloseTo(SCOPE, 9)
    }
  })

  test('rides, and never in a hurry', () => {
    const last = berthAt(mooring, wind, 0, blank())
    const next = blank()

    let heaved = 0
    let rolled = 0

    for (let frame = 1; frame < 60 * 240; frame += 1) {
      berthAt(mooring, wind, frame / 60, next)

      // Under a unit a second over the water, and a slow turn.
      expect(Math.hypot(next.x - last.x, next.z - last.z) * 60).toBeLessThan(1)
      expect(Math.abs(next.yaw - last.yaw) * 60).toBeLessThan(0.1)
      expect(Math.abs(next.roll)).toBeLessThan(0.1)
      expect(Math.abs(next.pitch)).toBeLessThan(0.05)
      expect(Math.abs(next.heave - mooring.level)).toBeLessThan(0.1)

      heaved = Math.max(heaved, Math.abs(next.heave - mooring.level))
      rolled = Math.max(rolled, Math.abs(next.roll))

      Object.assign(last, next)
    }

    expect(heaved).toBeGreaterThan(0.04)
    expect(rolled).toBeGreaterThan(0.04)
  })
})

describe('the pennant', () => {
  type AtReturnType = { x: number, y: number, z: number }

  function at (gust: number, time: number, part: number): AtReturnType {
    const out = { x: 0, y: 0, z: 0 }

    streamAt(wind, gust, time, part, out)

    return out
  }

  test('is made fast at the mast', () => {
    for (const gust of [ 0, 0.5, 1 ])
      expect(at(gust, 12.3, 0)).toEqual({ x: 0, y: -0, z: 0 })
  })

  test('streams downwind, and stands out when it blows', () => {
    for (let time = 0; time < 30; time += 0.1) {
      const lull = at(0, time, 1)
      const gust = at(1, time, 1)

      expect(gust.x * wind.direction[0] + gust.z * wind.direction[1]).toBeGreaterThan(lull.x * wind.direction[0] + lull.z * wind.direction[1])
      expect(gust.y).toBeGreaterThan(lull.y)
      expect(lull.x * wind.direction[0] + lull.z * wind.direction[1]).toBeGreaterThan(0)

      // It is cloth: never longer than it was cut, give or take its own wave.
      expect(Math.hypot(gust.x, gust.y, gust.z)).toBeLessThan(2.5)
    }
  })

  test('never jumps, even as a gust comes on', () => {
    let last = at(0, 0, 1)

    // A gust that comes on from nothing to full over two seconds.
    for (let frame = 1; frame < 60 * 4; frame += 1) {
      const next = at(Math.min(1, frame / 120), frame / 60, 1)

      expect(Math.hypot(next.x - last.x, next.y - last.y, next.z - last.z)).toBeLessThan(0.08)

      last = next
    }
  })
})

describe('the hull', () => {
  const geometry = createHullGeometry()
  const position = geometry.getAttribute('position')

  test('is a few hundred coloured triangles', () => {
    expect(position.count % 3).toBe(0)
    expect(position.count / 3).toBeLessThan(600)
    expect(geometry.getAttribute('color').count).toBe(position.count)
  })

  test('floats on its lines: keel under the water, rail over it, mast over all', () => {
    const box = geometry.boundingBox!

    expect(box.min.y).toBeLessThan(-0.3)
    expect(box.max.y).toBeCloseTo(MAST.top, 1)
    expect(box.min.x).toBeCloseTo(-LENGTH / 2, 1)

    // As wide as two people sitting side by side, and the same both sides.
    expect(box.max.z).toBeGreaterThan(1.1)
    expect(box.max.z).toBeCloseTo(-box.min.z, 6)
  })
})
