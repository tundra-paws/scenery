// src/world/shared/ground.test.ts
import { describe, expect, test } from 'bun:test'
import { createSeededRng } from 'threejs-scenes/primitives'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
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

  test('the rim is under water, so the land has no visible edge', () => {
    const ground = createGround({ seed: WORLD_SEED })
    const half   = ground.size / 2

    for (let step = 0; step < 72; step += 1) {
      const angle = step / 72 * Math.PI * 2

      expect(ground.heightAt(Math.cos(angle) * half, Math.sin(angle) * half)).toBeLessThan(ground.waterLevel - 2)
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
