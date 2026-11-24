// src/world/shared/path.test.ts
import { describe, expect, test } from 'bun:test'

import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createPath, distanceToSpan, findSummit } from './path.ts'


describe('the path', () => {
  const ground = createGround({ seed: WORLD_SEED })
  const summit = findSummit(ground)
  const path   = createPath(ground, summit)

  test('the same land has the same path', () => {
    expect(createPath(ground, summit).points).toEqual(path.points)
  })

  test('runs from the waterline to just short of the summit', () => {
    const foot = path.points[0]!
    const top  = path.points.at(-1)!

    expect(Math.abs(ground.heightAt(foot.x, foot.z) - ground.waterLevel)).toBeLessThan(0.2)
    expect(foot).toEqual({ x: path.landing.x, z: path.landing.z })

    // Near enough to arrive, far enough that the cairn's own stones are clear of it.
    expect(Math.hypot(top.x - summit.x, top.z - summit.z)).toBeGreaterThan(6)
    expect(Math.hypot(top.x - summit.x, top.z - summit.z)).toBeLessThan(12)
  })

  test('the landing looks out to sea', () => {
    const { x, z, seaward } = path.landing

    expect(Math.hypot(seaward[0], seaward[1])).toBeCloseTo(1, 9)
    expect(ground.heightAt(x + seaward[0] * 6, z + seaward[1] * 6)).toBeLessThan(ground.waterLevel)
    expect(ground.heightAt(x - seaward[0] * 6, z - seaward[1] * 6)).toBeGreaterThan(ground.waterLevel)
  })

  test('its points are evenly spaced and its length is their sum', () => {
    for (let index = 1; index < path.points.length; index += 1) {
      const from = path.points[index - 1]!
      const to   = path.points[index]!

      // A chord is a little shorter than the arc it was measured along.
      expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(path.spacing * 0.8)
      expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeLessThan(path.spacing * 1.2)
    }

    expect(path.spacing * (path.points.length - 1)).toBeCloseTo(path.length, 9)
  })

  test('keeps to ground a walker would take: dry, never a cliff, and climbing all the way', () => {
    let highest = -Infinity

    for (const [ index, point ] of path.points.entries()) {
      const height = ground.heightAt(point.x, point.z)

      expect(height).toBeGreaterThan(ground.waterLevel - 0.2)
      expect(ground.slopeAt(point.x, point.z)).toBeLessThan(0.34)

      // It may dip a little on the way, never by much.
      expect(height).toBeGreaterThan(highest - 1.5)
      highest = Math.max(highest, height)

      // Over any ten units of it, never steeper than a stair.
      const back = path.points[index - 7]

      if (back)
        expect(Math.abs(height - ground.heightAt(back.x, back.z)) / (path.spacing * 7)).toBeLessThan(0.6)
    }
  })

  test('takes a steep hill in legs, and is no longer than it has to be', () => {
    const foot     = path.points[0]!
    const top      = path.points.at(-1)!
    const straight = Math.hypot(top.x - foot.x, top.z - foot.z)

    expect(path.length).toBeGreaterThan(straight * 1.3)
    expect(path.length).toBeLessThan(straight * 2.5)
  })

  test('knows how far a place is from it', () => {
    const { x, z, ahead } = path.at(path.length / 2)

    expect(Math.hypot(ahead[0], ahead[1])).toBeCloseTo(1, 9)
    expect(path.distanceTo(x, z)).toBeLessThan(1e-9)
    expect(path.distanceTo(summit.x, summit.z)).toBeGreaterThan(6)
    expect(path.distanceTo(ground.size, ground.size)).toBeGreaterThan(ground.size / 2)
  })

  test('at() runs from one end to the other and stops there', () => {
    const first = path.points[0]!
    const last  = path.points.at(-1)!

    expect(path.at(0)).toMatchObject(first)
    expect(path.at(-5)).toMatchObject(first)
    expect(path.at(path.length).x).toBeCloseTo(last.x, 6)
    expect(path.at(path.length + 50).z).toBeCloseTo(last.z, 6)
  })
})

describe('distanceToSpan', () => {
  test('measures to the span, not to the line through it', () => {
    const from = { x: 0, z: 0 }
    const to   = { x: 10, z: 0 }

    expect(distanceToSpan(5, 3, from, to)).toBe(3)
    expect(distanceToSpan(-4, 3, from, to)).toBe(5)
    expect(distanceToSpan(13, -4, from, to)).toBe(5)
    expect(distanceToSpan(3, 4, from, from)).toBe(5)
  })
})
