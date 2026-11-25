// src/world/shared/pier.ts
import type { Ground } from './ground.ts'
import { distanceToSpan } from './path.ts'
import type { Path, Waypoint } from './path.ts'
import type { Wind } from './wind.ts'

/**
 * Where the pier runs, in the landing's own frame: `along` is out to sea
 * from where the path meets the water, `aside` is along the shore toward the
 * side the boat lies on.
 *
 * Typed in, like the shelter's site, because it was chosen by looking: from
 * `hero` it runs out of the beach left of the boat, across the sun's road on
 * the water, its head toward the camera. And by what was there already: it
 * goes between the landing's east row of stones and the corner of the field,
 * short of the boat's swing and of the rope to its anchor, and beside the
 * way the tour comes in, not across it (`pier.test.ts` holds all of that).
 */
const JETTY = { aside: 5.7, from: 1.2, to: 14.6 } as const

/** Half its width over the stones, and how high its deck stands over the water: three courses. */
export const JETTY_HALF = 1.8
export const JETTY_DECK = 1.35

/**
 * The poles the nets dry on: a row along the top of the beach under the
 * field's dyke, where the wind off the sea goes through them. How far down
 * the beach the row stands, from where to where along the shore, how many
 * poles, and how tall.
 */
const NETS = { along: 4, from: 9.4, to: 18.2, poles: 5, tall: 3.4 } as const

/**
 * The rack the fish dry on: on the green west of the landing, above the
 * beach, lying along the shore in the one gap there is, between the
 * landing's west row of stones and the burn's bank. Its middle, half its
 * length, and its height.
 */
const RACK = { along: -4.8, aside: -5, half: 1.3, tall: 2.9 } as const

/**
 * The small boat: afloat in the pier's lee, made fast fore and aft. How far
 * along the pier its middle lies from the root, and how far off the stones.
 */
const TENDER = { along: 8.4, off: 1.3 } as const

/** How far up the beach from the pier's root the way to it leaves the path, and where it swings on the way. */
const WAY_FROM = 3.4
const SPANS    = 6

/** A pole stood in the beach: where, the ground at its foot, and its top. */
export interface Pole extends Waypoint {
  readonly foot: number
  readonly top:  number
}

/** The pier: a tongue of placed stone from the beach out into deep water. */
export interface Jetty {

  /** The middle of its landward end, and of its seaward one. */
  readonly root: Waypoint
  readonly head: Waypoint

  /** From root to head. */
  readonly length: number
  readonly half:   number

  /** World height of the deck. */
  readonly deck: number
}

/** The fish rack: two trestles and the rails between them. */
export interface Rack extends Waypoint {

  /** Unit direction its rails run. */
  readonly run:  readonly [number, number]
  readonly half: number
  readonly tall: number
}

/** Where the small boat lies when nothing moves it. */
export interface TenderBerth extends Waypoint {

  /** Unit direction its bow points: out to sea, along the pier. */
  readonly bow: readonly [number, number]
}

/**
 * The fishing: the pier at the landing, the small boat in its lee, the nets
 * on their poles along the beach and the fish on the rack.
 *
 * A layout, DOM-free and GPU-free like the yard's: the feature builds on it,
 * the boulders and the grass keep off it, the sea breaks round the stones
 * that stand in it, and a test can ask where everything is.
 */
export interface Pier {

  /** Unit direction along the pier, root to head, and across it toward its lee: the side the boat lies on. */
  readonly seaward: readonly [number, number]
  readonly lee:     readonly [number, number]
  readonly jetty:   Jetty
  readonly poles:   readonly Pole[]
  readonly rack:    Rack
  readonly tender:  TenderBerth

  /** The trodden way from the path to the pier's root. */
  readonly way: readonly Waypoint[]

  /** A place in the pier's own frame: `along` from its root toward its head, `across` from its middle line toward its lee. */
  place (along: number, across: number): Waypoint

  /** How far a place is from the pier's stones, a pole or the rack. Nothing, on the pier. */
  distanceTo (x: number, z: number): number

  /** How far a place is from the middle of the way to the pier. */
  distanceToSpur (x: number, z: number): number
}

export function createPier (ground: Ground, path: Path, wind: Wind): Pier {
  const { x, z, seaward } = path.landing

  // The side the wind holds the boat on (`boat/mooring.ts`): the pier's lee.
  const side = seaward[1] * wind.direction[0] - seaward[0] * wind.direction[1] >= 0 ? 1 : -1
  const lee  = [ seaward[1] * side, -seaward[0] * side ] as const

  /** A place in the landing's frame. */
  const from = (along: number, aside: number): Waypoint => ({ x: x + seaward[0] * along + lee[0] * aside, z: z + seaward[1] * along + lee[1] * aside })

  const root   = from(JETTY.from, JETTY.aside)
  const head   = from(JETTY.to, JETTY.aside)
  const length = JETTY.to - JETTY.from
  const place  = (along: number, across: number): Waypoint => from(JETTY.from + along, JETTY.aside + across)
  const jetty  = { root, head, length, half: JETTY_HALF, deck: ground.waterLevel + JETTY_DECK }

  const poles = Array.from({ length: NETS.poles }, (_, index) => {
    const pole = from(NETS.along, NETS.from + (NETS.to - NETS.from) * index / (NETS.poles - 1))
    const foot = ground.heightAt(pole.x, pole.z)

    return { ...pole, foot, top: foot + NETS.tall }
  })

  const rack   = { ...from(RACK.along, RACK.aside), run: lee, half: RACK.half, tall: RACK.tall }
  const ends   = [ -1, 1 ].map(end => ({ x: rack.x + lee[0] * rack.half * end, z: rack.z + lee[1] * rack.half * end }))
  const tender = { ...place(TENDER.along, JETTY_HALF + TENDER.off), bow: seaward }

  // From the path, where it turns along the shore, down the sand to the root.
  const step  = place(-0.6, 0)
  const up    = place(-WAY_FROM, 0)
  const join  = path.points.reduce((best, point) => Math.hypot(point.x - up.x, point.z - up.z) < Math.hypot(best.x - up.x, best.z - up.z) ? point : best)
  const round = { x: (join.x + step.x) / 2 - lee[0] * 0.8, z: (join.z + step.z) / 2 - lee[1] * 0.8 }

  const way = Array.from({ length: SPANS + 1 }, (_, index) => {
    const t = index / SPANS

    return {
      x: join.x * (1 - t) ** 2 + round.x * 2 * t * (1 - t) + step.x * t ** 2,
      z: join.z * (1 - t) ** 2 + round.z * 2 * t * (1 - t) + step.z * t ** 2,
    }
  })

  return {
    seaward,
    lee,
    jetty,
    poles,
    rack,
    tender,
    way,
    place,

    distanceTo (px, pz) {
      const along  = (px - root.x) * seaward[0] + (pz - root.z) * seaward[1]
      const across = (px - root.x) * lee[0] + (pz - root.z) * lee[1]

      let nearest = Math.hypot(Math.max(-along, 0, along - length), Math.max(Math.abs(across) - JETTY_HALF, 0))

      for (const pole of poles)
        nearest = Math.min(nearest, Math.hypot(px - pole.x, pz - pole.z))

      return Math.min(nearest, distanceToSpan(px, pz, ends[0]!, ends[1]!))
    },

    distanceToSpur (px, pz) {
      let nearest = Infinity

      for (let index = 1; index < way.length; index += 1)
        nearest = Math.min(nearest, distanceToSpan(px, pz, way[index - 1]!, way[index]!))

      return nearest
    },
  }
}

// perf: trivial — a few ground samples and one pass over the path's points,
// once. `distanceTo` is seven spans and points; `distanceToSpur` six spans.
