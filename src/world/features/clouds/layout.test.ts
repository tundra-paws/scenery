// src/world/features/clouds/layout.test.ts
import { describe, expect, test } from 'bun:test'
import { createSeededRng } from 'threejs-scenes/primitives'

import { CLOUD_BASE } from '../../shared/cloud-shadow.ts'
import { WEATHER_SPAN, createWind } from '../../shared/wind.ts'
import { PUFF_FLOOR, layOutClouds } from './layout.ts'


describe('layOutClouds', () => {
  const along = createWind().direction
  const sky   = (count: number, seed = 5): ReturnType<typeof layOutClouds> => layOutClouds({ rng: createSeededRng(seed).fork('test'), count, along })

  test('the same stream is the same sky', () => {
    expect(sky(40)).toEqual(sky(40))
    expect(sky(40, 6)).not.toEqual(sky(40))
  })

  test('fewer clouds are the first of the same sky, not a different one', () => {
    const few  = sky(12)
    const many = sky(40)

    expect(few.map(cloud => [ cloud.x, cloud.z ])).toEqual(many.slice(0, 12).map(cloud => [ cloud.x, cloud.z ]))
  })

  test('every cloud is inside the weather\'s square, near the height its shadow is cast from', () => {
    const clouds = sky(60)

    expect(clouds.length).toBe(60)

    for (const cloud of clouds) {
      expect(Math.abs(cloud.x)).toBeLessThanOrEqual(WEATHER_SPAN / 2)
      expect(Math.abs(cloud.z)).toBeLessThanOrEqual(WEATHER_SPAN / 2)
      expect(Math.abs(cloud.y - CLOUD_BASE)).toBeLessThan(20)
    }
  })

  test('a cloud has a flat base: every puff\'s underside is at the same height', () => {
    for (const cloud of sky(30))
      for (const puff of cloud.puffs)
        expect(puff.offset[1] - puff.scale[1] * PUFF_FLOOR).toBeCloseTo(0, 9)
  })

  test('gives up rather than hang when the sky is full', () => {
    const clouds = sky(5000)

    expect(clouds.length).toBeGreaterThan(60)
    expect(clouds.length).toBeLessThan(5000)
  })
})
