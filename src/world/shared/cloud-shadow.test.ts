// src/world/shared/cloud-shadow.test.ts
import { describe, expect, test } from 'bun:test'

import { CLOUD_BASE, bakeCloudShadow } from './cloud-shadow.ts'
import { WEATHER_SPAN } from './wind.ts'


const SIDE  = 200

const TEXEL = WEATHER_SPAN / SIDE

/** The baked value nearest a point of the weather's square, 0 to 1. */
function at (data: Uint8Array, x: number, z: number): number {
  const column = Math.floor((x + WEATHER_SPAN / 2) / TEXEL)
  const row    = Math.floor((z + WEATHER_SPAN / 2) / TEXEL)

  return data[row * SIDE + column]! / 255
}

describe('bakeCloudShadow', () => {
  test('an empty sky throws no shadow', () => {
    expect(bakeCloudShadow([], SIDE).every(value => value === 0)).toBe(true)
  })

  test('a blot is full at its middle, half at its rim and nothing well outside', () => {
    // At the height the lookup assumes, a blot's shadow is straight under it.
    const data = bakeCloudShadow([{ x: 105, y: CLOUD_BASE, z: -55, radius: 60 }], SIDE)

    expect(at(data, 105, -55)).toBe(1)
    expect(at(data, 105 + 60, -55)).toBeCloseTo(0.5, 1)
    expect(at(data, 105, -55 - 60)).toBeCloseTo(0.5, 1)
    expect(at(data, 105 + 130, -55)).toBe(0)
  })

  test('a higher blot throws its shadow further from the sun', () => {
    const low  = bakeCloudShadow([{ x: 0, y: CLOUD_BASE, z: 0, radius: 40 }], SIDE)
    const high = bakeCloudShadow([{ x: 0, y: CLOUD_BASE + 100, z: 0, radius: 40 }], SIDE)

    // The sun stands to the west (-x), so the higher shadow lands to the
    // east: the shadow's weight, column by column, moves that way.
    const middle = (data: Uint8Array): number => {
      let sum    = 0
      let weight = 0

      data.forEach((value, offset) => {
        sum    += value * (offset % SIDE)
        weight += value
      })

      return sum / weight
    }

    expect(middle(high)).toBeGreaterThan(middle(low) + 5)
  })

  test('a blot on the seam comes round on the far side', () => {
    const edge = WEATHER_SPAN / 2
    const data = bakeCloudShadow([{ x: edge - 5, y: CLOUD_BASE, z: 0, radius: 50 }], SIDE)

    expect(at(data, edge - 15, 5)).toBeGreaterThan(0.9)
    expect(at(data, -edge + 15, 5)).toBeGreaterThan(0.7)
  })

  test('overlapping blots are no darker than one', () => {
    const blot = { x: 0, y: CLOUD_BASE, z: 0, radius: 50 }
    const one  = bakeCloudShadow([ blot ], SIDE)
    const two  = bakeCloudShadow([ blot, blot ], SIDE)

    expect(two).toEqual(one)
  })
})
