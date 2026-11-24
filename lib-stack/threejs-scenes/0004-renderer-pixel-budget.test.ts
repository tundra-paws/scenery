// lib-stack/threejs-scenes/0004-renderer-pixel-budget.test.ts
import { describe, expect, test } from 'bun:test'
import { pixelRatioFor } from 'threejs-scenes/core'


describe('pixelRatioFor', () => {
  test('with no budget it is the device ratio, capped', () => {
    expect(pixelRatioFor(1280, 720, {}, 1)).toBe(1)
    expect(pixelRatioFor(1280, 720, {}, 3)).toBe(2)
    expect(pixelRatioFor(1280, 720, { pixelRatioMax: 1.5 }, 3)).toBe(1.5)
  })

  test('a buffer inside the budget is left alone', () => {
    expect(pixelRatioFor(1280, 720, { maxPixels: 4_000_000 }, 2)).toBe(2)
  })

  test('a buffer over the budget is scaled to fit it, keeping its shape', () => {
    // the window in the profile this came from: 3474 x 2260 device pixels at a ratio of 2
    const ratio = pixelRatioFor(1737, 1130, { maxPixels: 4_000_000 }, 2)

    expect(ratio).toBeLessThan(2)
    expect(1737 * ratio * 1130 * ratio).toBeCloseTo(4_000_000, 0)
  })

  test('an empty canvas does not divide by nothing', () => {
    expect(pixelRatioFor(0, 0, { maxPixels: 4_000_000 }, 2)).toBe(2)
  })
})
