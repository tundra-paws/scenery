// src/world/shared/tide.ts
import type { Node } from 'three/webgpu'

import { DAY } from './daylight.ts'
import { heldFloat } from './nodes.ts'
import type { Held } from './nodes.ts'

/**
 * How far the sea falls from high water to low. Everything on the island
 * was placed against high water (`ground.waterLevel`), so the tide only
 * ever goes down from there: nothing that stood dry is ever flooded, and
 * the boat at her anchor still has water under her at the bottom of it
 * (`boat.test.ts`).
 */
export const RANGE = 1.2

/** Tides in a day, as the sea keeps them: two, so a visitor who stays sees it come in and go out again. */
const TIDES = 2

/**
 * When it is low water: second ten, when every postcard is taken, so the
 * pictures are of the ebb, the strand bare and the weed showing.
 */
const LOW_AT = 10

/** Seconds from one low water to the next. */
export const TIDE = DAY / TIDES

/**
 * How high over low water the weed grows on rock and stone: bladder wrack
 * to a little under high water, and nothing but barnacles over that.
 */
export const WRACK_LINE = RANGE - 0.2

/** The tide, as the shaders read it. */
export interface TideNodes {

  /** The sea's level now, in world units: the ground's water level at high water, `RANGE` under it at low. */
  level: Node<'float'>

  /** How far the sea is under high water now: 0 to `RANGE`. */
  ebb: Node<'float'>
}

/**
 * The tide: the third shared signal, with the wind and the hour. One number,
 * the height of the sea, which falls and comes back twice in the day.
 *
 * The sea lies at it (`features/water`); the boats ride at it; the land
 * between its marks is wet, and the burn runs out over the strand to
 * wherever the edge has gone. DOM-free on the CPU side, so the tests can ask
 * it the level at any second.
 */
export interface Tide {

  /** High water and low water, in world units. */
  readonly high: number
  readonly low:  number

  /** The level now: written by `turn`, read by anything that wants it this step. */
  readonly level: Held<number>
  readonly nodes: TideNodes

  /** The sea's level at `time` seconds. */
  at (time: number): number

  /** Set `level` for `time`. Once a step, before anything that reads it. */
  turn (time: number): void
}

/** How far the sea is under high water at `time` seconds: 0 at high water, `RANGE` at low, and smooth between. */
export function ebbAt (time: number): number {
  return RANGE * (0.5 + 0.5 * Math.cos((time - LOW_AT) / TIDE * Math.PI * 2))
}

export function createTide (high: number): Tide {
  const level = { value: high - ebbAt(0) }
  const node  = heldFloat(level)

  return {
    high,
    low:   high - RANGE,
    level,
    nodes: { level: node, ebb: node.negate().add(high) },

    at (time) {
      return high - ebbAt(time)
    },

    turn (time) {
      level.value = high - ebbAt(time)
    },
  }
}

// perf: trivial — one cosine a step and one uniform.
