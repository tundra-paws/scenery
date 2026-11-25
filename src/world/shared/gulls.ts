// src/world/shared/gulls.ts
import type { QualityTier } from 'threejs-scenes'
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

import type { Pier } from './pier.ts'

/** How many gulls keep to the pier, and how many of them never leave their perch. A phone gets the idea of them. */
const GULLS: Record<QualityTier, number> = { mobile: 5, desktop: 7, highEnd: 8 }
const SITTING                            = 2

/**
 * Where the birds on the wing go round: each on a round of its own over the
 * bay off the landing, to either side of the pier, in the pier's frame. The
 * middle of a round lies between these along the pier and across it, and
 * reaches this far each way. Over the water and nowhere else: the tour
 * flies over the land, and comes in low over the sea.
 */
const ROUND = { along: [ 8.5, 11 ], across: [ -5, 2.5 ], reach: [ 3, 5 ]} as const

/**
 * How high over the water a bird goes round, the least and the most, and
 * how much of that it rises and falls on the way. High enough that a camera
 * on the water under one does not have it in its picture.
 */
const HEIGHT = [ 8.5, 11.5 ] as const
const SOAR   = 0.5

/** Seconds a round takes. Slow: they are riding the wind off the sea, not going anywhere. */
const PERIOD = [ 15, 24 ] as const

/** How far over it leans into its turn, in radians. */
const BANK = 0.42

/**
 * The sun's height, in degrees, at which a bird has come down to its perch
 * for the night; each has its own between these. And how far the sun stands
 * over that when it starts down, which is also when it is up and away again
 * in the morning.
 */
const ROOST  = [ -1.5, 2.5 ] as const
const COMING = 2

/** How far over its perch the middle of a standing bird is, for each unit of its size. */
const STANDS = 0.2

/** A place a gull can stand: the head of a post or a pole, in the world's frame. */
export type Perch = readonly [number, number, number]

/** One gull: where it stands, the round it flies, and what it is like. */
export interface Gull {
  readonly perch: Perch

  /** The middle of its round, how far it reaches along its long way and its short, and how that is turned. */
  readonly middle: readonly [number, number]
  readonly reach:  readonly [number, number]
  readonly turned: number

  /** How high it goes round, how long a round takes, where on it the bird begins, and which way it goes: 1 turns it to its right. */
  readonly height: number
  readonly period: number
  readonly phase:  number
  readonly way:    number

  /** The sun's height it is down by. A bird that never flies has one the sun never reaches. */
  readonly roost: number
  readonly size:  number
}

/** How a gull holds itself at one moment. */
export interface Glide {
  x: number
  y: number
  z: number

  /** Its heading, as three turns it about the upright; how far it leans to its right; and how far its bill is up. */
  yaw:   number
  bank:  number
  pitch: number

  /** Its wings: 1 spread on the wind, 0 folded on its back. */
  spread: number
}

/**
 * The gulls that keep to the pier: a few going round on the wind over the
 * water off it, and a couple that only stand and look about.
 *
 * A layout and a clock, DOM-free and GPU-free like the seals': as the sun
 * goes each bird comes down to a perch of its own and stands there through
 * the night, facing the wind, and is away again a little after sunrise. A
 * pure function of the time and the sun's height.
 */
export interface Gulls {
  readonly birds: readonly Gull[]

  /** How `gull` holds itself at `time` seconds, the sun standing `elevation` degrees up. Written into `out`. */
  at (gull: Gull, time: number, elevation: number, out: Glide): Glide
}

/** The shorter way round from one heading to another. */
function swing (from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

export function createGulls (pier: Pier, perches: readonly Perch[], wind: readonly [number, number], seed: number, tier: QualityTier): Gulls {
  // The stream was picked by looking, as the wind's head start was: at second
  // ten three of them are strung across the sun's glow in `hero`, wings out.
  const rng   = createSeededRng(seed).fork('gulls:b')
  const count = Math.min(GULLS[tier], perches.length)

  // A bird at rest stands head to wind.
  const upwind = Math.atan2(wind[1], -wind[0])

  const birds = Array.from({ length: count }, (_, index): Gull => {
    const middle = pier.place(rng.range(...ROUND.along), rng.range(...ROUND.across))
    const long   = rng.range(...ROUND.reach)

    return {
      perch:  perches[index]!,
      middle: [ middle.x, middle.z ],
      reach:  [ long, long * rng.range(0.62, 0.9) ],
      turned: rng.range(0, Math.PI),
      height: pier.jetty.deck - 1.35 + rng.range(...HEIGHT),
      period: rng.range(...PERIOD),
      phase:  rng.range(0, Math.PI * 2),
      way:    rng.next() < 0.5 ? -1 : 1,
      roost:  index < SITTING ? 90 : rng.range(...ROOST),
      size:   rng.range(0.9, 1.12),
    }
  })

  return {
    birds,

    at (gull, time, elevation, out) {
      const { perch, middle, reach, turned, way } = gull

      const round = gull.phase + way * time * Math.PI * 2 / gull.period
      const cos   = Math.cos(turned)
      const sin   = Math.sin(turned)
      const along = reach[0] * Math.cos(round)
      const cross = reach[1] * Math.sin(round)
      const goesA = -reach[0] * Math.sin(round) * way
      const goesC = reach[1] * Math.cos(round) * way

      // Down on its perch, 0 to 1: all the way once the sun is as low as its hour.
      const down = 1 - smoothstep(gull.roost, gull.roost + COMING, elevation)
      const yaw  = Math.atan2(-(goesA * sin + goesC * cos), goesA * cos - goesC * sin)
      const look = upwind + 0.5 * Math.sin(time * 0.23 + gull.phase) * Math.sin(time * 0.071 + gull.phase * 2)

      const x = middle[0] + along * cos - cross * sin
      const y = gull.height + SOAR * Math.sin(round * 2 + gull.phase)
      const z = middle[1] + along * sin + cross * cos

      out.x      = x + (perch[0] - x) * down
      out.y      = y + (perch[1] + STANDS * gull.size - y) * down
      out.z      = z + (perch[2] - z) * down
      out.yaw    = yaw + swing(yaw, look) * down
      out.bank   = way * BANK * (1 - down)
      out.pitch  = 0.38 * down
      out.spread = 1 - smoothstep(0.55, 1, down)

      return out
    },
  }
}

// perf: trivial — a few birds, laid out once. `at` is a dozen sines.
