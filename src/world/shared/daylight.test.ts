// src/world/shared/daylight.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { DAY, POLE, createDaylight, elevationAt, hourAt, sunAt } from './daylight.ts'


const STEP = 1 / 60

/** Every step of one day. */
function* steps (): Generator<number> {
  for (let frame = 0; frame <= DAY * 60; frame += 1)
    yield frame * STEP
}

describe('the sun', () => {
  test('is a direction, and a pure function of time', () => {
    const first = sunAt(37.5, new THREE.Vector3())

    sunAt(3, new THREE.Vector3())
    sunAt(4000.25, new THREE.Vector3())

    expect(first.length()).toBeCloseTo(1, 9)
    expect(sunAt(37.5, new THREE.Vector3()).equals(first)).toBe(true)
  })

  test('comes round to the same place after a day, and after a hundred', () => {
    const now = sunAt(10, new THREE.Vector3())

    expect(sunAt(10 + DAY, new THREE.Vector3()).distanceTo(now)).toBeLessThan(1e-9)
    expect(sunAt(10 + DAY * 100, new THREE.Vector3()).distanceTo(now)).toBeLessThan(1e-6)
    expect(hourAt(DAY) - hourAt(0)).toBeCloseTo(Math.PI * 2, 9)
  })

  test('never goes back, and never jumps', () => {
    let last = hourAt(0)
    let pace = hourAt(STEP) - last

    for (const time of steps()) {
      const turned = hourAt(time + STEP) - hourAt(time)

      expect(hourAt(time)).toBeGreaterThanOrEqual(last)
      expect(Math.abs(turned - pace)).toBeLessThan(1e-4)

      last = hourAt(time)
      pace = turned
    }
  })

  test('keeps the same distance from the pole all day', () => {
    const away = sunAt(0, new THREE.Vector3()).dot(POLE)

    for (const time of [ 20, 70, 140, 200, 260 ])
      expect(sunAt(time, new THREE.Vector3()).dot(POLE)).toBeCloseTo(away, 9)
  })

  test('is low in the evening when the postcards are taken, and going down', () => {
    expect(elevationAt(10)).toBeGreaterThan(8)
    expect(elevationAt(10)).toBeLessThan(12)
    expect(elevationAt(11)).toBeLessThan(elevationAt(10))
  })

  test('is up for longer than it is down, never overhead, and the night is dark', () => {
    let up     = 0
    let dark   = 0
    let lowest = 90
    let top    = -90

    for (const time of steps()) {
      const elevation = elevationAt(time)

      up     += elevation > 0 ? STEP : 0
      dark   += elevation < -15 ? STEP : 0
      lowest  = Math.min(lowest, elevation)
      top     = Math.max(top, elevation)
    }

    expect(top).toBeLessThan(50)
    expect(lowest).toBeLessThan(-18)

    // A summer's day in the north, but the tour lingers from dusk to dawn.
    expect(up).toBeGreaterThan(DAY * 0.4)
    expect(dark).toBeGreaterThan(60)
    expect(dark).toBeLessThan(DAY * 0.3)
  })
})

describe('the hour', () => {
  test('is the same whenever it is asked for', () => {
    const day = createDaylight()

    day.turn(10)

    const horizon = day.uniforms.uHorizon.value.clone()
    const light   = day.light.direction.clone()

    day.turn(133)
    day.turn(10)

    expect(day.uniforms.uHorizon.value.equals(horizon)).toBe(true)
    expect(day.light.direction.equals(light)).toBe(true)
  })

  test('has the light on the land above the horizon, always', () => {
    const day = createDaylight()

    for (const time of steps()) {
      day.turn(time)

      expect(day.light.direction.y).toBeGreaterThan(0.12)
      expect(day.light.direction.length()).toBeCloseTo(1, 6)
    }
  })

  test('changes hands from the sun to the moon only while the light is out', () => {
    const day  = createDaylight()
    const last = new THREE.Vector3()

    let swaps = 0

    day.turn(0)
    last.copy(day.light.direction)

    for (const time of steps()) {
      day.turn(time)

      // The light never swings: a jump in where it comes from is the
      // handover, and at the handover it has no strength, and a cloud's lit
      // face is the colour of its shaded one.
      if (day.light.direction.angleTo(last) > 0.05) {
        swaps += 1

        expect(day.light.intensity).toBeLessThan(0.03)
        expect(day.uniforms.uCloudLit.value.clone().sub(day.uniforms.uCloudShade.value)
          .getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(0.01)
      }

      last.copy(day.light.direction)
    }

    expect(swaps).toBe(2)
  })

  test('never changes colour in a step that could be seen', () => {
    const day  = createDaylight()
    const last = new THREE.Color()
    const sky  = new THREE.Color()

    day.turn(0)
    last.copy(day.haze)
    sky.copy(day.fill.sky)

    for (const time of steps()) {
      day.turn(time)

      for (const channel of [ 'r', 'g', 'b' ] as const) {
        expect(Math.abs(day.haze[channel] - last[channel])).toBeLessThan(0.004)
        expect(Math.abs(day.fill.sky[channel] - sky[channel])).toBeLessThan(0.004)
      }

      last.copy(day.haze)
      sky.copy(day.fill.sky)
    }
  })

  test('is day at noon and night at midnight, with the moon where the sun is not', () => {
    const day = createDaylight()

    let noon     = 0
    let midnight = 0

    for (const time of steps()) {
      noon     = elevationAt(time) > elevationAt(noon) ? time : noon
      midnight = elevationAt(time) < elevationAt(midnight) ? time : midnight
    }

    day.turn(noon)

    expect(day.night).toBe(0)
    expect(day.uniforms.uNight.value).toBe(0)
    expect(day.uniforms.uGlow.value.getHSL({ h: 0, s: 0, l: 0 }).l).toBe(0)
    expect(day.uniforms.uBodyDirection.value.equals(day.uniforms.uSunDirection.value)).toBe(true)

    const bright = day.light.intensity + day.fill.intensity

    day.turn(midnight)

    expect(day.night).toBe(1)
    expect(day.uniforms.uBodyDirection.value.clone().add(day.uniforms.uSunDirection.value)
      .length()).toBeLessThan(1e-9)
    expect(day.uniforms.uBodyDirection.value.y).toBeGreaterThan(0.3)
    expect(day.light.intensity + day.fill.intensity).toBeLessThan(bright)
    expect(day.light.intensity).toBeGreaterThan(0.5)
  })
})
