// src/world/shared/tide.test.ts
import { describe, expect, test } from 'bun:test'

import { DRAFT, LENGTH } from '../features/boat/hull.ts'
import { berthAt, findMooring } from '../features/boat/mooring.ts'
import type { Berth } from '../features/boat/mooring.ts'
import { TENDER_SIZE } from '../features/pier/plan.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { DAY } from './daylight.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath } from './path.ts'
import { createPier } from './pier.ts'
import { createShelter } from './shelter.ts'
import { RANGE, TIDE, createTide, ebbAt } from './tide.ts'
import { createWind } from './wind.ts'


describe('the tide', () => {
  const ground = createGround({ seed: WORLD_SEED })
  const path   = createPath(ground)
  const wind   = createWind()
  const tide   = createTide(ground.waterLevel)

  test('is at low water at second ten, when every postcard is taken', () => {
    expect(ebbAt(10)).toBeCloseTo(RANGE, 9)
    expect(tide.at(10)).toBeCloseTo(tide.low, 9)
  })

  test('never stands over high water, where everything was placed against it, nor under low', () => {
    for (let time = 0; time < DAY; time += 0.5) {
      expect(tide.at(time)).toBeLessThanOrEqual(tide.high)
      expect(tide.at(time)).toBeGreaterThanOrEqual(tide.low - 1e-9)
    }
  })

  test('comes round with the day, so the tour closes on the sea it opened on', () => {
    for (let time = 0; time < TIDE; time += 7)
      expect(tide.at(time + DAY)).toBeCloseTo(tide.at(time), 9)
  })

  test('is at high water half a tide after low, and moves slowly enough to watch', () => {
    expect(tide.at(10 + TIDE / 2)).toBeCloseTo(tide.high, 9)

    for (let time = 0; time < DAY; time += 1)
      expect(Math.abs(tide.at(time + 1) - tide.at(time))).toBeLessThan(0.03)
  })

  test('says the level it was last turned to', () => {
    tide.turn(55)
    expect(tide.level.value).toBe(tide.at(55))
  })

  test('leaves the boat at her anchor afloat at low water, wherever she swings', () => {
    const mooring      = findMooring(ground, path, wind)
    const berth: Berth = { x: 0, z: 0, heave: 0, yaw: 0, pitch: 0, roll: 0 }

    for (let time = 0; time < 600; time += 0.5) {
      berthAt(mooring, wind, time, berth)

      for (const end of [ -1, 0, 1 ]) {
        const x = berth.x + Math.cos(berth.yaw) * end * LENGTH / 2
        const z = berth.z - Math.sin(berth.yaw) * end * LENGTH / 2

        expect(tide.low - ground.heightAt(x, z)).toBeGreaterThan(DRAFT * 2)
      }
    }
  })

  test('leaves the small boat afloat in the pier\'s lee, and the pier\'s head standing in the sea', () => {
    const { tender, jetty } = createPier(ground, path, wind)

    expect(tide.low - ground.heightAt(tender.x, tender.z)).toBeGreaterThan(DRAFT * TENDER_SIZE * 2)
    expect(ground.heightAt(jetty.head.x, jetty.head.z)).toBeLessThan(tide.low - 1)
    expect(ground.heightAt(jetty.root.x, jetty.root.z)).toBeGreaterThan(tide.high)
  })

  test('the burn is followed out over the strand to low water', () => {
    const burn = createBurn(ground, path, [ createInfield(createShelter(ground, path)).fold ])
    const last = burn.reaches.at(-1)!

    expect(ground.heightAt(last.x, last.z)).toBeLessThan(tide.low)
    expect(ground.heightAt(burn.mouth.x, burn.mouth.z)).toBeLessThanOrEqual(tide.high)
  })
})
