// src/world/shared/wind.test.ts
import { describe, expect, test } from 'bun:test'

import { WEATHER_SPAN, WIND_GLSL, createWind } from './wind.ts'


describe('wind', () => {
  const wind = createWind()

  test('blows one way at one speed', () => {
    expect(Math.hypot(...wind.direction)).toBeCloseTo(1, 12)
    expect(wind.speed).toBeGreaterThan(0)
  })

  test('a gust is between a lull and a full gust, and reaches toward both', () => {
    let low  = 1
    let high = 0

    for (let step = 0; step < 4000; step += 1) {
      const gust = wind.gustAt(Math.sin(step * 1.7) * 400, Math.cos(step * 2.3) * 400, step * 0.37)

      expect(gust).toBeGreaterThanOrEqual(0)
      expect(gust).toBeLessThanOrEqual(1)

      low  = Math.min(low, gust)
      high = Math.max(high, gust)
    }

    expect(low).toBeLessThan(0.15)
    expect(high).toBeGreaterThan(0.85)
  })

  test('a gust travels: what is here now is downwind a moment later', () => {
    const [ x, z ] = wind.direction

    for (let step = 0; step < 50; step += 1) {
      const atX   = step * 13.1 - 300
      const atZ   = step * -7.7 + 120
      const later = 0.5 + step * 0.21
      const moved = wind.speed * later

      expect(wind.gustAt(atX + x * moved, atZ + z * moved, 3 + later)).toBeCloseTo(wind.gustAt(atX, atZ, 3), 9)
    }
  })

  test('the pattern meets itself across the weather\'s span', () => {
    for (let step = 0; step < 50; step += 1) {
      const atX = step * 9.3 - 200
      const atZ = step * 4.1 - 90

      expect(wind.gustAt(atX + WEATHER_SPAN, atZ, 7)).toBeCloseTo(wind.gustAt(atX, atZ, 7), 9)
      expect(wind.gustAt(atX, atZ - WEATHER_SPAN, 7)).toBeCloseTo(wind.gustAt(atX, atZ, 7), 9)
    }
  })

  test('the drift a shader reads stays inside the span, however late it is', () => {
    const drift = wind.uniforms.uWindDrift.value

    for (const time of [ 0, 10, 599.5, 86_400, 31_536_000 ]) {
      wind.blow(time)

      expect(drift.x).toBeGreaterThanOrEqual(0)
      expect(drift.x).toBeLessThan(WEATHER_SPAN)
      expect(drift.y).toBeGreaterThanOrEqual(0)
      expect(drift.y).toBeLessThan(WEATHER_SPAN)
    }

    // Ten seconds apart the air is seventy units further on, whatever the wrap did.
    wind.blow(100)

    const before = drift.clone()

    wind.blow(110)

    const moved = drift.clone().sub(before)

    expect((moved.x % WEATHER_SPAN + WEATHER_SPAN) % WEATHER_SPAN).toBeCloseTo(wind.direction[0] * wind.speed * 10, 6)
    expect((moved.y % WEATHER_SPAN + WEATHER_SPAN) % WEATHER_SPAN).toBeCloseTo(wind.direction[1] * wind.speed * 10 + WEATHER_SPAN, 6)
  })

  test('the shader is written from the same numbers', () => {
    expect(WIND_GLSL).toContain(`const float WEATHER_SPAN = ${WEATHER_SPAN.toFixed(1)};`)
    expect(WIND_GLSL).toContain(`vec2(${wind.direction[0]}, ${wind.direction[1]})`)
    expect(WIND_GLSL).toContain('0.5 * sin(dot(air, vec2(12.0, -31.0)) + 0.0)')
  })
})
