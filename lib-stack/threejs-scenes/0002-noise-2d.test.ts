// lib-stack/threejs-scenes/0002-noise-2d.test.ts
import { describe, expect, test } from 'bun:test'
import { createNoise2D } from 'threejs-scenes'
import { createNoise2D as fromPrimitives, mulberry32 } from 'threejs-scenes/primitives'


describe('createNoise2D', () => {
  test('is exported from the root and from primitives', () => {
    expect(fromPrimitives).toBe(createNoise2D)
  })

  test('the same seed is the same field, and another seed is another', () => {
    const one   = createNoise2D(42)
    const two   = createNoise2D(42)
    const other = createNoise2D(43)
    let same    = 0

    for (let step = 0; step < 500; step += 1) {
      const x = Math.sin(step * 1.7) * 90
      const y = Math.cos(step * 2.3) * 90

      expect(two.sample(x, y)).toBe(one.sample(x, y))
      same += other.sample(x, y) === one.sample(x, y) ? 1 : 0
    }

    expect(same).toBeLessThan(25)
  })

  test('stays within [-1, 1], and uses most of it', () => {
    const noise = createNoise2D(20_261_123)
    const place = mulberry32(5)
    let low  = 0
    let high = 0

    for (let index = 0; index < 200_000; index += 1) {
      const value = noise.sample((place() - 0.5) * 400, (place() - 0.5) * 400)

      low  = Math.min(low, value)
      high = Math.max(high, value)
    }

    expect(low).toBeGreaterThanOrEqual(-1)
    expect(high).toBeLessThanOrEqual(1)
    expect(low).toBeLessThan(-0.8)
    expect(high).toBeGreaterThan(0.8)
  })

  test('is continuous: a small step is a small change, across cell borders too', () => {
    const noise = createNoise2D(9)
    const step  = 1e-4

    for (let index = 0; index < 20_000; index += 1) {
      const x = index * 0.0137 - 100
      const y = index * 0.0071 + 3

      expect(Math.abs(noise.sample(x + step, y) - noise.sample(x, y))).toBeLessThan(0.01)
    }
  })

  test('fbm sums octaves and ridged folds them', () => {
    const noise = createNoise2D(7)

    expect(noise.fbm(0.3, -1.2, 2)).toBe(0.5 * noise.sample(0.3, -1.2) + 0.25 * noise.sample(0.6, -2.4))
    expect(noise.ridged(0.3, -1.2, 1)).toBe(0.5 * (1 - Math.abs(noise.sample(0.3, -1.2))))
  })
})
