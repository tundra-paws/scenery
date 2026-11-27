// src/world/features/clouds/showers.ts
import type { SeededRng } from 'threejs-scenes'

import { WEATHER_SPAN } from '../../shared/wind.ts'
import { PUFF_FLOOR } from './layout.ts'
import type { Cloud, Puff } from './layout.ts'

/**
 * Where the first shower stands at second ten, when the postcards are taken.
 *
 * Typed in, like the wind's head start, because it was chosen by looking:
 * from `hero` it is off the far headland at the picture's left, beside the
 * low sun and clear of it, under the starlings and well away from the cairn.
 * Where it started from, and where it is at any other time, is the wind's.
 */
export const OPENING = { x: -334, z: 82 } as const

/**
 * Where the shower that has just gone over the island is at second ten:
 * some twenty seconds downwind of it, across its northern half, so that
 * from `hero` its rain still trails behind the wood at the picture's right
 * and everything it crossed is wet. Typed in, like `OPENING`.
 */
export const PASSED = { x: -17, z: -178 } as const

/** World height of a shower's flat underside: lower and heavier than the fair-weather clouds over it. */
export const SHOWER_BASE = 78

/** How long a shower is along the wind, from and to, and its girth as a part of that. */
const LENGTH = [ 66, 84 ] as const
const GIRTH  = 0.3

/** How far the other showers keep from the island in the visit's first moments, and from each other, round the weather's seam. */
const OFFSHORE = 520
const APART    = 620

/** Redraws allowed per shower before giving up on filling the count. */
const PATIENCE = 60

/** A shower: a heavy cloud, and the patch of sea or land under it that its rain falls on. */
export interface Shower extends Cloud {

  /** Unit direction its row of puffs lies along, as `[x, z]`: the wind's. */
  row: readonly [number, number]

  /** Half the length and half the width of the ground its rain falls on. */
  reach: readonly [number, number]
}

interface ShowerOptions {
  rng:   SeededRng
  count: number

  /** The wind's direction, as a unit `[x, z]`. */
  along: readonly [number, number]

  /** How far the air has moved by second ten (`wind.driftAt`). */
  drift: readonly [number, number]
}

/** A place brought back onto the weather's square, centred on the island. */
function wrapped (value: number): number {
  return ((value + WEATHER_SPAN / 2) % WEATHER_SPAN + WEATHER_SPAN) % WEATHER_SPAN - WEATHER_SPAN / 2
}

/** Distance between two points on a square that wraps round. */
function apart (ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx)
  const dz = Math.abs(az - bz)

  return Math.hypot(Math.min(dx, WEATHER_SPAN - dx), Math.min(dz, WEATHER_SPAN - dz))
}

/**
 * A rain cloud: the fair-weather heap grown up. A row of big puffs along the
 * wind, all cut flat at one base, and a second storey heaped on its middle.
 */
function heap (rng: SeededRng, along: readonly [number, number], length: number): Puff[] {
  const girth = length * GIRTH
  const row   = Array.from({ length: 6 }, (_, index): Puff => {
    const place  = index / 5 - 0.5 + rng.range(-0.04, 0.04)
    const radius = girth * (0.62 + 0.38 * Math.cos(place * Math.PI)) * rng.range(0.9, 1.12)
    const height = radius * rng.range(0.8, 1)
    const aside  = radius * rng.range(-0.25, 0.25)

    return {
      offset: [ along[0] * place * length - along[1] * aside, height * PUFF_FLOOR, along[1] * place * length + along[0] * aside ],
      scale:  [ radius, height, radius * rng.range(0.88, 1) ],
      turn:   rng.range(0, Math.PI * 2),
    }
  })

  const crown = Array.from({ length: 3 }, (_, index): Puff => {
    const place  = (index - 1) * 0.2 + rng.range(-0.05, 0.05)
    const radius = girth * rng.range(0.58, 0.74)

    return {
      offset: [ along[0] * place * length, girth * rng.range(0.52, 0.7), along[1] * place * length ],
      scale:  [ radius, radius * rng.range(0.75, 0.9), radius * rng.range(0.88, 1) ],
      turn:   rng.range(0, Math.PI * 2),
    }
  })

  return [ ...row, ...crown ]
}

/** A shower grown from a stream at a place: the row of puffs, and the ground its rain falls on. */
function grow (shape: SeededRng, along: readonly [number, number], x: number, z: number): Shower {
  const length = shape.range(LENGTH[0], LENGTH[1])

  return { x, y: SHOWER_BASE + shape.range(-4, 6), z, puffs: heap(shape, along, length), row: along, reach: [ length * 0.46, length * GIRTH * 0.62 ]}
}

/**
 * The shower that has just gone over: put where it is at second ten
 * (`PASSED`), from a stream of its own, so the others are the ones they were.
 */
export function layOutPassing ({ rng, along, drift }: Omit<ShowerOptions, 'count'>): Shower {
  return grow(rng.fork('passed'), along, wrapped(PASSED.x - drift[0]), wrapped(PASSED.z - drift[1]))
}

/**
 * Where the showers are, over the whole of the weather's square, before the
 * wind has moved them.
 *
 * The first is put where the visit opens on it (`OPENING`). The others are
 * spread by rejection, far from each other and, in the visit's first
 * moments, well off the island: the opening is one shower in the sound, and
 * what the weather brings after that is the wind's affair. Like the clouds
 * they come round again, each time on another line.
 */
export function layOutShowers ({ rng, count, along, drift }: ShowerOptions): Shower[] {
  const place = rng.fork('place')
  const shape = rng.fork('shape')
  const half  = WEATHER_SPAN / 2

  const showers = count > 0 ? [ grow(shape, along, wrapped(OPENING.x - drift[0]), wrapped(OPENING.z - drift[1])) ] : []

  for (let tries = 0; showers.length < count && tries < count * PATIENCE; tries += 1) {
    const x = place.range(-half, half)
    const z = place.range(-half, half)

    if (Math.hypot(wrapped(x + drift[0]), wrapped(z + drift[1])) > OFFSHORE && showers.every(shower => apart(shower.x, shower.z, x, z) > APART))
      showers.push(grow(shape, along, x, z))
  }

  return showers
}

// perf: trivial — a few hundred draws from the stream, once, at build.
