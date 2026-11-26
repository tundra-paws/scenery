// src/world/features/aurora/aurora.test.ts
import { describe, expect, test } from 'bun:test'

import { DAY, createDaylight } from '../../shared/daylight.ts'
import { auroraStrength } from './index.ts'


describe('the merry dancers', () => {
  const day = createDaylight(() => -90)

  /** How bright they are at `time`, with the night as the sky has it then. */
  const at = (time: number): number => {
    day.turn(time)

    return auroraStrength(time, day.night)
  }

  test('are not there at second ten, nor at any hour the sun is up', () => {
    expect(at(10)).toBe(0)

    for (let time = 0; time <= DAY; time += 0.5) {
      day.turn(time)

      if (day.night === 0)
        expect(auroraStrength(time, day.night)).toBe(0)
    }
  })

  test('come out in the night, and come and go through it', () => {
    let brightest = 0
    let faintest  = Infinity

    for (let time = 0; time <= DAY; time += 0.5) {
      const strength = at(time)

      day.turn(time)

      if (day.night === 1) {
        brightest = Math.max(brightest, strength)
        faintest  = Math.min(faintest, strength)
      }
    }

    expect(brightest).toBeGreaterThan(0.3)
    expect(faintest).toBeLessThan(brightest * 0.5)
  })
})
