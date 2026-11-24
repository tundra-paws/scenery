// src/world/shared/ground.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'
import { createSeededRng } from 'threejs-scenes/primitives'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { DEEP_WATER, createGround } from './ground.ts'
import { createHeightGrid } from './height-grid.ts'
import { createHeightMap } from './height-map.ts'
import { scatterOnGround } from './scatter.ts'


describe('ground', () => {
  test('the same seed is the same land', () => {
    const one = createGround({ seed: 42 })
    const two = createGround({ seed: 42 })

    for (let step = 0; step < 200; step += 1) {
      const x = Math.sin(step * 1.7) * 120
      const z = Math.cos(step * 2.3) * 120

      expect(two.heightAt(x, z)).toBe(one.heightAt(x, z))
    }
  })

  test('a different seed is different land', () => {
    const one = createGround({ seed: 1 })
    const two = createGround({ seed: 2 })

    expect(two.heightAt(10, 10)).not.toBe(one.heightAt(10, 10))
  })

  test('the rim is under deep water, so neither the land nor its square has a visible edge', () => {
    const ground = createGround({ seed: WORLD_SEED })
    const half   = ground.size / 2

    for (let step = 0; step < 72; step += 1) {
      const angle = step / 72 * Math.PI * 2

      expect(ground.heightAt(Math.cos(angle) * half, Math.sin(angle) * half)).toBeLessThan(ground.waterLevel - DEEP_WATER)
    }
  })

  test('slope is between flat and vertical, and finite', () => {
    const ground = createGround({ seed: WORLD_SEED })

    for (let x = -120; x <= 120; x += 15)
      for (let z = -120; z <= 120; z += 15) {
        const slope = ground.slopeAt(x, z)

        expect(slope).toBeGreaterThanOrEqual(0)
        expect(slope).toBeLessThan(1)
      }
  })
})

describe('createHeightMap', () => {
  test('a lookup at a grid corner lands on the texel that holds the height there', () => {
    const ground             = createGround({ seed: WORLD_SEED })
    const segments           = 16
    const side               = segments + 1
    const { texture, scale } = createHeightMap(ground, createHeightGrid(ground, segments))
    const { data }           = texture.image

    for (let row = 0; row < side; row += 3)
      for (let column = 0; column < side; column += 3) {
        const x = (column / segments - 0.5) * ground.size
        const z = (row / segments - 0.5) * ground.size

        // A texel's centre is half a texel in from its edge.
        expect((x * scale + 0.5) * side - 0.5).toBeCloseTo(column, 6)
        expect((z * scale + 0.5) * side - 0.5).toBeCloseTo(row, 6)
        expect(THREE.DataUtils.fromHalfFloat(data![row * side + column]!)).toBeCloseTo(ground.heightAt(x, z) - ground.waterLevel, 1)
      }
  })
})

describe('views', () => {
  test('every postcard stands above the surface under it', () => {
    const ground = createGround({ seed: WORLD_SEED })

    for (const view of VIEWS) {
      const pose        = resolveView(view, ground)
      const [ x, y, z ] = pose.position

      expect(y).toBeGreaterThan(Math.max(ground.heightAt(x, z), ground.waterLevel))
    }
  })

  test('hero is first, and names are unique', () => {
    expect(VIEWS[0]?.name).toBe('hero')
    expect(new Set(VIEWS.map(view => view.name)).size).toBe(VIEWS.length)
  })
})

describe('scatterOnGround', () => {
  const ground = createGround({ seed: WORLD_SEED })

  test('the same stream places the same spots', () => {
    const place = (): number[] => scatterOnGround({
      ground,
      rng:    createSeededRng(9).fork('test'),
      count:  50,
      accept: spot => spot.height > ground.waterLevel,
    }).flatMap(spot => [ spot.x, spot.z ])

    expect(place()).toEqual(place())
  })

  test('gives up rather than hang when nothing is acceptable', () => {
    const spots = scatterOnGround({ ground, rng: createSeededRng(9), count: 20, accept: () => false })

    expect(spots).toEqual([])
  })

  test('a slope nobody reads is never worked out, and one that is read is the ground\'s', () => {
    let asked = 0

    const counted = {
      ...ground,

      slopeAt (x: number, z: number): number {
        asked += 1

        return ground.slopeAt(x, z)
      },
    }

    scatterOnGround({ ground: counted, rng: createSeededRng(9), count: 30, accept: spot => spot.height > ground.waterLevel })
    expect(asked).toBe(0)

    const spots = scatterOnGround({ ground: counted, rng: createSeededRng(9), count: 30, accept: spot => spot.slope < 0.9 && spot.slope >= 0 })

    expect(asked).toBeGreaterThan(0)
    expect(asked).toBeLessThanOrEqual(30 * 30)

    for (const spot of spots)
      expect(spot.slope).toBe(ground.slopeAt(spot.x, spot.z))
  })

  test('only returns what the rule allows', () => {
    const spots = scatterOnGround({
      ground,
      rng:    createSeededRng(3),
      count:  80,
      accept: spot => spot.height > ground.waterLevel + 1 && spot.slope < 0.2,
    })

    expect(spots.length).toBeGreaterThan(0)

    for (const spot of spots) {
      expect(spot.height).toBeGreaterThan(ground.waterLevel + 1)
      expect(spot.slope).toBeLessThan(0.2)
    }
  })
})
