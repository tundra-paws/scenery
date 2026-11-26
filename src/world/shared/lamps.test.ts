// src/world/shared/lamps.test.ts
import { describe, expect, test } from 'bun:test'

import { DAY, elevationAt } from './daylight.ts'
import { lampLevel } from './lamps.ts'


describe('the lamps for the night', () => {
  const STEP = 1 / 60

  test('are out at second ten, when every postcard is taken', () => {
    expect(lampLevel(10)).toBe(0)
  })

  test('burn full from a little after sunset to a little before sunrise, and are out while the sun is clear of the horizon', () => {
    let full = 0

    for (let time = 0; time <= DAY; time += 0.25) {
      const elevation = elevationAt(time)
      const level     = lampLevel(time)

      if (elevation > 1.2)
        expect(level).toBe(0)

      if (elevation < -0.25)
        expect(level).toBe(1)

      if (level === 1)
        full += 0.25
    }

    // The night is the slow part of the day: a good share of the tour has them lit.
    expect(full).toBeGreaterThan(DAY * 0.3)
  })

  test('are turned up, never switched on: no step changes them by more than a little', () => {
    for (let time = 0; time <= DAY; time += STEP)
      expect(Math.abs(lampLevel(time + STEP) - lampLevel(time))).toBeLessThan(0.05)
  })
})
