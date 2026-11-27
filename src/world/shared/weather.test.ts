// src/world/shared/weather.test.ts
import { describe, expect, test } from 'bun:test'
import { createSeededRng } from 'threejs-scenes/primitives'

import { layOutPassing, layOutShowers } from '../features/clouds/showers.ts'
import { WORLD_SEED } from '../world.ts'
import { MOST_SHOWERS, createWeather } from './weather.ts'
import { WEATHER_SPAN, createWind } from './wind.ts'


describe('the weather', () => {
  const wind    = createWind()
  const drift   = wind.driftAt(10)
  const rng     = createSeededRng(WORLD_SEED)
  const showers = [ ...layOutShowers({ rng: rng.fork('clouds:showers'), count: 5, along: wind.direction, drift }), layOutPassing({ rng: rng.fork('clouds:showers'), along: wind.direction, drift }) ]
  const weather = createWeather(wind)

  weather.fall(showers)

  test('the sky holds no more showers than a shader is told of', () => {
    expect(showers.length).toBeLessThanOrEqual(MOST_SHOWERS)
  })

  test('the visit opens on an island soaked by the shower that has just gone over, and no rain on it', () => {
    expect(weather.wetAt(10)).toBeGreaterThan(0.85)
    expect(weather.rainAt(10)).toBe(0)
    expect(weather.rainAt(-15)).toBeGreaterThan(0.5)
  })

  test('the land dries when the rain stops, and wets when it falls', () => {
    for (let time = 12; time < 180; time += 6)
      if (weather.rainAt(time) === 0 && weather.rainAt(time - 6) === 0)
        expect(weather.wetAt(time)).toBeLessThan(weather.wetAt(time - 6))

    const showery = Array.from({ length: 360 }, (_, second) => second).filter(second => weather.rainAt(second) > 0.9 && weather.rainAt(second - 3) > 0.9)

    expect(showery.length).toBeGreaterThan(0)

    for (const second of showery)
      expect(weather.wetAt(second)).toBeGreaterThan(weather.wetAt(second - 3))
  })

  test('is never more than soaked nor less than dry, and is the same whenever it is asked', () => {
    for (let time = 0; time < 720; time += 7.3) {
      const wet = weather.wetAt(time)

      expect(wet).toBeGreaterThanOrEqual(0)
      expect(wet).toBeLessThanOrEqual(1)
      expect(weather.wetAt(time)).toBe(wet)
    }
  })

  test('a step puts each shower where the clouds draw it, and the wet with them', () => {
    weather.step(10)

    showers.forEach((shower, index) => {
      const held = weather.showers[index]!.value
      const dx   = (held.x - shower.x - drift[0]) / WEATHER_SPAN
      const dz   = (held.y - shower.z - drift[1]) / WEATHER_SPAN

      expect(Math.abs(dx - Math.round(dx))).toBeLessThan(1e-9)
      expect(Math.abs(dz - Math.round(dz))).toBeLessThan(1e-9)
      expect(Math.abs(held.x)).toBeLessThanOrEqual(WEATHER_SPAN / 2)
      expect(held.z).toBe(shower.reach[0])
      expect(held.w).toBe(shower.reach[1])
    })

    expect(weather.wet.value).toBe(weather.wetAt(10))
    expect(weather.showers.slice(showers.length).every(held => held.value.z === 0)).toBe(true)
  })
})
