// src/world/shared/flock.ts
import type { QualityTier, SeededRng } from 'threejs-scenes'
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

import { VIEWS, resolveView } from '../views.ts'
import type { Burn } from './burn.ts'
import { DAY, elevationAt } from './daylight.ts'
import type { Ground } from './ground.ts'
import type { Infield } from './infield.ts'
import type { Path, Waypoint } from './path.ts'
import type { Shelter } from './shelter.ts'
import type { Wood } from './wood.ts'


/**
 * Where the sheep keep to, each its own patch of the island: a heft. A
 * sheep raised on one stays on it, so every heft is a few dozen strides
 * across, and its sheep graze it and nowhere else.
 *
 * Typed in, like the wood's heart and the field's line, because they were
 * chosen by looking: from `hero` the brae under the cairn and the inbye
 * above the landing are flecked with them, a few have come down to the
 * house, and four are penned in the fold. The far side of the island has two
 * of its own, for the morning's stops. Which ground a sheep stands on is read
 * from the land, the walls, the path, the trees and the boulders.
 */
export const HEFTS: readonly Heft[] = [
  { name: 'brae', x: 21, z: 72, reach: 12, count: { mobile: 11, desktop: 20, highEnd: 24 }},
  { name: 'inbye', x: 22, z: 88, reach: 11, count: { mobile: 9, desktop: 16, highEnd: 18 }},
  { name: 'dooryard', x: 64.5, z: 64.5, reach: 3.6, count: { mobile: 3, desktop: 4, highEnd: 4 }},
  { name: 'fold', x: 0, z: 0, reach: 0, count: { mobile: 3, desktop: 4, highEnd: 4 }, penned: true },
  { name: 'north', x: -20, z: -82, reach: 13, count: { mobile: 5, desktop: 9, highEnd: 12 }},
  { name: 'west', x: -70, z: 0, reach: 16, count: { mobile: 4, desktop: 8, highEnd: 10 }},
]

/** Clear ground kept from the middle of the path (its waymarks stand beside it), a wall, a trunk, the house, the way to its door, the cairn, a boulder's edge, and the middle of the burn. */
const OFF_PATH    = 4.4
const OFF_WALL    = 1.3
const OFF_TREE    = 1.2
const OFF_SHELTER = 2.8
const OFF_SPUR    = 1.8
const OFF_SUMMIT  = 6
const OFF_STONE   = 0.7
const OFF_BURN    = 2.1

/** How far a sheep keeps from where a postcard's camera stands, and from the fold's wall inside it. */
const OFF_CAMERA = 5
const PEN_INSIDE = 1.1

/** The lowest ground a sheep grazes (over the water: the top of the beach) and the steepest (`ground.slopeAt`). */
const SHORE = 1
const STEEP = 0.36

/** The least ground between two sheep's first places. */
const APART = 1.8

/** Tries for a sheep's first place, and for each step to the next. */
const TRIES = 40

/** Places a sheep grazes round, from and to, and how far it walks between two. */
const ROUND  = [ 2, 4 ] as const
const STRIDE = [ 1.4, 3.2 ] as const

/** Seconds a sheep grazes in one place, from and to. */
const GRAZE = [ 9, 24 ] as const

/** How fast a sheep walks, in units a second, and the seconds it takes to turn before it does. */
export const PACE = 0.42

const TURN        = 1.6

/** Seconds for the head to go down to the grass, or come up from it. */
const NOD = 0.8

/** The sun's height, in degrees, under which a sheep lies down for the night: the first and the last of them. */
const REST = [ -5, -1 ] as const

/** Degrees either side of its own `rest` over which a sheep lies down. */
const SETTLE = 1.5

/** The sun's height over which the flock moves about: they stop wandering before the first of them lies down. */
const ASTIR = [ REST[1] + SETTLE, REST[1] + SETTLE + 3 ] as const

/** Samples of the flock's clock over a day. */
const CLOCK_SAMPLES = 1024

/** How many ewes have a lamb at foot, how big it is against her, and how far to her side and behind her it keeps. */
const LAMBED  = 0.35
const LAMB    = [ 0.56, 0.66 ] as const
const AT_FOOT = 1
const LAG     = 0.7

/** What a sheep's fleece is: most white, some brown (`moorit`), a few black. */
export type Coat = 'fleece' | 'moorit' | 'black'

/** A heft: its middle, how far it reaches, and how many ewes keep to it on each tier. */
export interface Heft extends Waypoint {
  name:    string
  reach:   number
  count:   Record<QualityTier, number>
  penned?: true
}

/**
 * One sheep, and its round: the places it grazes, in order, and how long it
 * spends at each and getting to the next. It goes round them for ever.
 */
export interface Sheep {
  readonly heft:   string
  readonly spots:  readonly Waypoint[]
  readonly grazes: readonly number[]

  /** Seconds from each place to the next: a turn, then the walk. */
  readonly walks: readonly number[]

  /** Its heading on arriving at each place, in radians from +x toward +z. */
  readonly arrive: readonly number[]

  /** Seconds once round. */
  readonly period: number

  /** Seconds into its round at the start of the world. */
  readonly phase: number

  /** 1 is a grown ewe. */
  readonly size: number
  readonly coat: Coat

  /** The sun's height, in degrees, under which it lies down. */
  readonly rest: number

  /** A number of its own, for what it does now and then. */
  readonly whim: number
}

/** What the flock's clock says at a moment: how far on the sheep's own time is, and how high the sun is. */
export interface Moment {
  tau:       number
  elevation: number
}

/** How a sheep stands at a moment. */
export interface Hold {
  x: number
  z: number

  /** Heading, in radians from +x toward +z. */
  yaw: number

  /** 0 standing, 1 walking: how far its legs swing. */
  stride: number

  /** 0 head up, 1 head down in the grass. */
  graze: number

  /** 0 on its feet, 1 lying down. */
  lie: number
}

/** What the rule for a place reads. */
interface Site {
  ground:  Ground
  summit:  Waypoint
  path:    Path
  shelter: Shelter
  infield: Infield
  wood:    Wood

  /** The burn, where there is one: no sheep stands in it. */
  burn?: Burn
}

/** Whether a sheep may stand at a place: penned in the fold, or out on the island. */
type Rule = (x: number, z: number, penned: boolean) => boolean

/** The island's sheep, and their clock. */
export interface Flock {
  readonly sheep: readonly Sheep[]

  /** The moment it is at `time` seconds into the world. */
  at (time: number, out: Moment): Moment

  /** How `sheep` stands at `moment`. */
  hold (sheep: Sheep, moment: Moment, out: Hold): Hold
}

/** The rule for a place a sheep may graze: on the island's open grass, clear of everything that stands on it. */
function makeRule (site: Site, clear: (x: number, z: number) => number): Rule {
  const { ground, summit, path, shelter, infield, wood, burn } = site
  const cameras                                                = VIEWS.map(view => resolveView(view, ground).position)
  const fold                                                   = infield.fold
  const dry                                                    = (x: number, z: number): boolean => burn === undefined || burn.distanceTo(x, z) > OFF_BURN

  return (x, z, penned) => {
    const height = ground.heightAt(x, z)
    const inFold = Math.hypot(x - fold.x, z - fold.z)

    return height > ground.waterLevel + SHORE &&
      (penned ? inFold < fold.radius - PEN_INSIDE : inFold > fold.radius + OFF_WALL) &&
      ground.slopeAt(x, z) < STEEP &&
      !infield.inField(x, z) &&
      infield.distanceTo(x, z) > OFF_WALL &&
      path.distanceTo(x, z) > OFF_PATH &&
      wood.distanceTo(x, z) > OFF_TREE &&
      shelter.distanceTo(x, z) > OFF_SHELTER &&
      shelter.distanceToSpur(x, z) > OFF_SPUR &&
      Math.hypot(x - summit.x, z - summit.z) > OFF_SUMMIT &&
      clear(x, z) > OFF_STONE &&
      dry(x, z) &&
      cameras.every(([ cx, , cz ]) => Math.hypot(x - cx, z - cz) > OFF_CAMERA)
  }
}

/** Whether the whole way from one place to another keeps to the rule: no walking through a wall. */
function clearWay (rule: Rule, from: Waypoint, to: Waypoint, penned: boolean): boolean {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.5)

  for (let step = 1; step <= steps; step += 1)
    if (!rule(from.x + (to.x - from.x) * step / steps, from.z + (to.z - from.z) * step / steps, penned))
      return false

  return true
}

/** A sheep's places, from a first one: each a stride from the last, wandering, and a clear way back round to the first. */
function walkRound (rule: Rule, rng: SeededRng, first: Waypoint, heft: Heft): Waypoint[] {
  const spots  = [ first ]
  const wanted = rng.int(ROUND[0], ROUND[1])
  let bearing  = rng.range(0, Math.PI * 2)

  for (let tries = 0; spots.length < wanted && tries < TRIES; tries += 1) {
    const last   = spots.at(-1)!
    const stride = rng.range(STRIDE[0], STRIDE[1])
    const turn   = bearing + rng.range(-1.3, 1.3)
    const next   = { x: last.x + Math.cos(turn) * stride, z: last.z + Math.sin(turn) * stride }
    const home   = Math.hypot(next.x - heft.x, next.z - heft.z) < heft.reach * 1.2

    if (home && rule(next.x, next.z, heft.penned === true) && clearWay(rule, last, next, heft.penned === true)) {
      spots.push(next)
      bearing = turn
    }
  }

  // The round closes: back from the last to the first. Shorten it until it can.
  while (spots.length > 1 && !clearWay(rule, spots.at(-1)!, first, heft.penned === true))
    spots.pop()

  return spots
}

/** A sheep that goes round `spots`, with its times drawn from `rng`. */
function makeSheep (heft: string, spots: readonly Waypoint[], rng: SeededRng, size: number, coat: Coat): Sheep {
  const count  = spots.length
  const grazes = spots.map(() => rng.range(GRAZE[0], GRAZE[1]))
  const walks  = spots.map((spot, index) => {
    const next = spots[(index + 1) % count]!

    return count > 1 ? TURN + Math.hypot(next.x - spot.x, next.z - spot.z) / PACE : 0
  })

  const heading = rng.range(-Math.PI, Math.PI)
  const arrive  = spots.map((spot, index) => {
    const last = spots[(index + count - 1) % count]!

    return count > 1 ? Math.atan2(spot.z - last.z, spot.x - last.x) : heading
  })

  const period = grazes.reduce((sum, graze) => sum + graze, 0) + walks.reduce((sum, walk) => sum + walk, 0)

  return {
    heft,
    spots,
    grazes,
    walks,
    arrive,
    period,
    phase: rng.range(0, period),
    size,
    coat,
    rest:  rng.range(REST[0], REST[1]),
    whim:  rng.range(0, 100),
  }
}

/** Her lamb: the same round, a stride to her side, a moment behind her, and smaller. */
function makeLamb (ewe: Sheep, spots: readonly Waypoint[], rng: SeededRng): Sheep {
  return {
    ...ewe,
    spots,
    phase: ewe.phase - LAG,
    size:  rng.range(LAMB[0], LAMB[1]),
    rest:  Math.min(ewe.rest + 0.6, REST[1]),
    whim:  rng.range(0, 100),
  }
}

/** The sheep's own clock over one day: seconds they have been about, by the sun's height, from sunset. */
function tallyClock (): Float64Array {
  const tally = new Float64Array(CLOCK_SAMPLES + 1)
  const span  = DAY / CLOCK_SAMPLES
  let last    = smoothstep(ASTIR[0], ASTIR[1], elevationAt(0))

  for (let sample = 1; sample <= CLOCK_SAMPLES; sample += 1) {
    const astir = smoothstep(ASTIR[0], ASTIR[1], elevationAt(sample * span))

    tally[sample] = tally[sample - 1]! + (last + astir) / 2 * span
    last          = astir
  }

  return tally
}

/** The shortest turn from one heading to another. */
function turnBetween (from: number, to: number): number {
  return ((to - from) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI
}

/**
 * One ewe of a heft, and her lamb if she has one: her first place, somewhere
 * on the heft clear of the others' (added to `homes`), and her round from it.
 * None if the heft has no room left for her.
 */
function raise (rule: Rule, draw: SeededRng, heft: Heft, homes: Waypoint[]): Sheep[] {
  const penned = heft.penned === true
  let first: Waypoint | null = null

  for (let tries = 0; !first && tries < TRIES; tries += 1) {
    const away  = Math.sqrt(draw.next()) * heft.reach
    const angle = draw.range(0, Math.PI * 2)
    const spot  = { x: heft.x + Math.cos(angle) * away, z: heft.z + Math.sin(angle) * away }

    if (rule(spot.x, spot.z, penned) && homes.every(home => Math.hypot(home.x - spot.x, home.z - spot.z) > APART))
      first = spot
  }

  if (!first)
    return []

  const roll   = draw.next()
  const coat   = roll < 0.72 ? 'fleece' : roll < 0.9 ? 'moorit' : 'black'
  const mother = makeSheep(heft.name, walkRound(rule, draw, first, heft), draw, draw.range(0.92, 1.08), coat)

  homes.push(first)

  if (penned || draw.next() > LAMBED)
    return [ mother ]

  // At foot: to one side of her, the same side all the way round, if there
  // is room there everywhere she goes.
  const side   = draw.range(0, Math.PI * 2)
  const beside = mother.spots.map(spot => ({ x: spot.x + Math.cos(side) * AT_FOOT, z: spot.z + Math.sin(side) * AT_FOOT }))
  const room   = beside.every((spot, index) => rule(spot.x, spot.z, false) && clearWay(rule, spot, beside[(index + 1) % beside.length]!, false))

  return room ? [ mother, makeLamb(mother, beside, draw) ] : [ mother ]
}

/** The island's sheep: drawn from `seed`, as many as `tier` keeps, kept off whatever `clear` says is within reach of a place. */
export function createFlock (site: Site, seed: number, tier: QualityTier, clear: (x: number, z: number) => number = () => Infinity): Flock {
  const rule  = makeRule(site, clear)
  const sheep = [] as Sheep[]
  const homes = [] as Waypoint[]
  const tally = tallyClock()

  for (const hefted of HEFTS) {
    const heft = hefted.penned ? { ...hefted, ...site.infield.fold, reach: site.infield.fold.radius - PEN_INSIDE } : hefted
    const rng  = createSeededRng(seed).fork(`flock:${heft.name}`)

    // Every tier draws the same ewes in the same order and stops sooner.
    for (let ewe = 0; ewe < heft.count.highEnd; ewe += 1) {
      const draw = rng.fork(`ewe:${ewe}`)

      if (ewe >= heft.count[tier])
        break

      sheep.push(...raise(rule, draw, heft, homes))
    }
  }

  return {
    sheep,

    at (time, out) {
      const days    = Math.floor(time / DAY)
      const into    = (time - days * DAY) / DAY * CLOCK_SAMPLES
      const sample  = Math.min(Math.floor(into), CLOCK_SAMPLES - 1)
      const between = into - sample

      out.tau       = days * tally[CLOCK_SAMPLES]! + tally[sample]! + (tally[sample + 1]! - tally[sample]!) * between
      out.elevation = elevationAt(time)

      return out
    },

    hold (one, { tau, elevation }, out) {
      const count = one.spots.length
      let left    = ((tau + one.phase) % one.period + one.period) % one.period

      out.lie    = smoothstep(one.rest + SETTLE, one.rest - SETTLE, elevation)
      out.stride = 0

      for (let index = 0; index < count; index += 1) {
        const here  = one.spots[index]!
        const graze = one.grazes[index]!

        if (left < graze) {
          // Head down, and now and then up to look round.
          const look = smoothstep(0.8, 0.95, Math.sin(tau * 0.37 + one.whim))

          out.x     = here.x
          out.z     = here.z
          out.yaw   = one.arrive[index]!
          out.graze = smoothstep(0, 1, Math.min(left, graze - left) / NOD) * (1 - look)

          return out
        }

        left -= graze

        const walk = one.walks[index]!

        if (left < walk) {
          const next   = one.spots[(index + 1) % count]!
          const toward = one.arrive[(index + 1) % count]!
          const from   = one.arrive[index]!
          const moved  = smoothstep(TURN, walk, left)

          out.x      = here.x + (next.x - here.x) * moved
          out.z      = here.z + (next.z - here.z) * moved
          out.yaw    = from + turnBetween(from, toward) * smoothstep(0, TURN, left)
          out.stride = Math.min(1, left / TURN * 2, (walk - left) / NOD)
          out.graze  = 0

          return out
        }

        left -= walk
      }

      // Only a rounding error ends up here: at the first place, as it arrives.
      out.x     = one.spots[0]!.x
      out.z     = one.spots[0]!.z
      out.yaw   = one.arrive[0]!
      out.graze = 0

      return out
    },
  }
}

// perf: cheap — a few hundred ground samples a sheep at build, and the sun's
// height a thousand times for the clock. A step is one sun height for the
// flock and a short walk round each sheep's places.
