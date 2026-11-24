// src/world/shared/starlings.ts
import type { QualityTier, SeededRng } from 'threejs-scenes'
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

import { elevationAt, hourAt } from './daylight.ts'
import type { Ground } from './ground.ts'
import type { Infield } from './infield.ts'

/** How many birds come in of an evening, by tier. Every tier draws the same birds in the same order and stops sooner. */
const COUNT: Record<QualityTier, number> = { mobile: 1200, desktop: 2400, highEnd: 3200 }

/**
 * Where the murmuration wheels, as [x, height over the water, z]: over the
 * summit's western shoulder, where `hero` sees it against the glow the sun
 * leaves low in the west. Typed in, like a postcard, and like one it was
 * chosen by looking.
 */
const OVER = [ -11, 50, 62 ] as const

/** How far its middle drifts from there on its round, along x, up and along z. */
const DRIFT = [ 15, 4, 11 ] as const

/** Seconds for its middle to go once round, and where on the round it is at the start of the world. */
const LAP    = 80
const SETOUT = 1.2

/**
 * Which way its length lies, as an angle on the ground from +x toward +z, and
 * how far and how slowly it swings from there. At second ten it lies across
 * `hero`'s line of sight, so the postcard has it broadside.
 */
const LIE   = -0.84
const SWING = [ 0.7, 90 ] as const

/** Half its length, height and breadth, and how far each of them breathes in and out. */
const SIZE   = [ 19, 8, 10 ] as const
const BREATH = [ 0.3, 0.45, 0.35 ] as const

/** How far a fold runs up and down it, and the surge that bunches the birds along it into darker bands. */
const FOLD  = 3.6
const SURGE = 3.2

/** Seconds for a bird to go once round inside it, quickest and slowest. */
const CIRCUIT = [ 13, 19 ] as const

/**
 * The sun's height, in degrees, at which the birds start and finish each of
 * their passages: in from the sea after noon, down into the walls as the sun
 * goes, and up out of them and away as it comes up again.
 */
const COME  = [ 42, 28 ] as const
const ROOST = [ 2, -4.5 ] as const
const LEAVE = [ -3.5, 5 ] as const

/** The share of a passage over which the birds' starts are spread: each takes the rest of it for its own part. */
const STAGGER = 0.7

/** How far off, over the sea toward the land beyond, they come in from and go back to, and from which bearings (radians from -z toward +x). */
const AFAR    = [ 330, 430 ] as const
const BEARING = [ -1.75, -1.05 ] as const

/** How high over the wall's foot a bird goes into it. */
const LEDGE = 0.8

/**
 * Where they roost: the stretch of the head-dyke under the brae, within
 * `REACH` of this place, which `hero` looks across. The cloud comes over it
 * first, gathering itself in, and `HIGH` over it the birds pour out of it.
 */
const ROOST_AT = { x: 22, z: 80 } as const
const REACH    = 12
const HIGH     = 20

/** The share of the roosting passage the cloud takes to come over the wall, and each bird's own drop into it. */
const GATHER = 0.35
const DROP   = 0.22

/** How far apart the walls are read when looking for chinks. */
const CHINK_STEP = 0.5

/** Wingbeats a second, and how far a wing goes up and down. */
const BEAT = [ 3.4, 4.4 ] as const
const FLAP = 0.55

/** Seconds over which a bird's heading is read, and how far it leans into a turn. */
const GLANCE = 0.08
const LEAN   = 0.35

const TAU = Math.PI * 2

/** Module-scope scratch, so a step allocates nothing. */
const here  = { x: 0, y: 0, z: 0 }
const ahead = { x: 0, y: 0, z: 0 }
const back  = { x: 0, y: 0, z: 0 }

/** A point in the world. */
export interface Point {
  x: number
  y: number
  z: number
}

/** One bird: its place in the murmuration, its wings, and where it comes from, roosts and goes. */
export interface Starling {

  /** How far out from the murmuration's axis it wheels (0 to 1), how high in it (-1 to 1), and where round its circuit it starts. */
  readonly reach: number
  readonly rise:  number
  readonly start: number

  /** Radians a second round its circuit. */
  readonly pace: number

  /** Wingbeats a second, and where in a beat it starts. */
  readonly beat:  number
  readonly phase: number

  /** Its turn in every passage: 0 the first to go, 1 the last. */
  readonly turn: number

  /** Out over the sea, where it comes in from of an evening and goes back to in the morning. */
  readonly from: Point
  readonly away: Point

  /** The chink in the walls it roosts in. */
  readonly roost: Point
}

/** Where the day has the birds: how far through each passage the sun's height is, once a step for all of them. */
export interface Hour {
  time: number

  /** 0 before the first bird has come in, 1 once the last has. */
  come: number

  /** 0 until the cloud starts toward the wall it roosts in, 1 once it is over it and the first bird drops. */
  settle: number

  /** 0 until the first goes down, 1 once the last is in the walls. */
  roost: number

  /** 0 until the first is up in the morning, 1 once the last has gone. */
  leave: number

  /** Whether the sun is in the west: the evening's passages, not the morning's. */
  evening: boolean
}

/** A bird in the air: where it is, which way it flies and how it holds its wings. `up` is false when it is in the walls or away. */
export interface Flight extends Point {
  up:    boolean
  yaw:   number
  pitch: number
  bank:  number
  wing:  number
}

/**
 * The island's starlings.
 *
 * Every afternoon they come in over the sea from the land beyond, a few at a
 * time, and gather into one cloud that wheels over the summit's shoulder
 * through the gold of the evening: folding, stretching, darkening in bands
 * where the birds bunch. As the sun goes they pour down into the walls, a
 * stream at a time, and are not seen again until first light, when they rise
 * out of the stones and go back over the water. Nobody keeps them.
 *
 * DOM-free and GPU-free, like the flock: the feature draws them where this
 * says, and a test can ask where every one of them is at any second.
 */
export interface Starlings {
  readonly birds: readonly Starling[]

  /** The day's passages at `time`. */
  at (time: number, out: Hour): Hour

  /** Where a bird is at the hour given, and how it flies. */
  fly (bird: Starling, hour: Hour, out: Flight): Flight
}

/** The walls the birds roost in, and the land under them. */
interface Site {
  ground:  Ground
  infield: Infield
}

/** A share of a passage that has got `through`, for a bird whose turn is `turn`. */
function partOf (through: number, turn: number): number {
  return Math.min(1, Math.max(0, (through - turn * STAGGER) / (1 - STAGGER)))
}

/** How far the sun's height has gone from `from` toward `to`, from 0 to 1. */
function between (elevation: number, [ from, to ]: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (elevation - from) / (to - from)))
}

/** Where in the murmuration a bird is at `time`, into `out`: on its round, or as far over the roost as it has `settle`d. */
function wheel (bird: Starling, time: number, settle: number, roost: Point, out: Point): Point {
  const lap   = TAU * time / LAP + SETOUT
  const midX  = OVER[0] + DRIFT[0] * Math.cos(lap)
  const midY  = OVER[1] + DRIFT[1] * Math.sin(lap * 2)
  const midZ  = OVER[2] + DRIFT[2] * Math.sin(lap)
  const along = LIE + SWING[0] * Math.sin(TAU * (time - 10) / SWING[1])
  const tight = 1 - 0.5 * settle

  // Its own shape: an ellipsoid the birds go round inside, breathing.
  const long  = SIZE[0] * tight * (1 + BREATH[0] * Math.sin(time * 0.11 + 0.4))
  const high  = SIZE[1] * tight * (1 + BREATH[1] * Math.sin(time * 0.083 + 2.1))
  const broad = SIZE[2] * tight * (1 + BREATH[2] * Math.sin(time * 0.07 + 4.2))
  const round = bird.start + bird.pace * time

  let x = Math.cos(round) * bird.reach * long
  let z = Math.sin(round) * bird.reach * broad
  // Thick where it bunches, thin where it streams out: the bulge travels along it.
  const bulge = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(x * 0.16 + time * 0.17 + 0.8))
  let y       = bird.rise * high * bulge * (1 - bird.reach * bird.reach * 0.5)

  // Bent by a fold that runs along it, snaking, and bunched by a surge.
  y += FOLD * Math.sin(x * 0.13 + time * 0.31)
  z += FOLD * 0.7 * Math.sin(x * 0.09 - time * 0.23 + 1.3)
  x += SURGE * Math.sin(x * 0.21 - time * 0.9)

  out.x = midX + (roost.x - midX) * settle + x * Math.cos(along) - z * Math.sin(along)
  out.y = midY + (roost.y + HIGH - midY) * settle + y
  out.z = midZ + (roost.z - midZ) * settle + x * Math.sin(along) + z * Math.cos(along)

  return out
}

/** Where a bird is at the hour, into `out`; false when it is in the walls or away over the sea. `roost` is the wall's foot under where the cloud gathers. */
function place (bird: Starling, hour: Hour, time: number, roost: Point, out: Point): boolean {
  if (hour.evening) {
    const come = partOf(hour.come, bird.turn)
    const drop = Math.min(1, Math.max(0, (hour.roost - GATHER - bird.turn * (1 - GATHER - DROP)) / DROP))

    if (come <= 0 || drop >= 1)
      return false

    wheel(bird, time, hour.settle, roost, out)

    if (come < 1) {
      // In over the water, straight for where the cloud is, slowing as it joins.
      const join = 1 - (1 - come) ** 2

      out.x = bird.from.x + (out.x - bird.from.x) * join
      out.y = bird.from.y + (out.y - bird.from.y) * join
      out.z = bird.from.z + (out.z - bird.from.z) * join
    }

    if (drop > 0) {
      // Out of the cloud and down into its chink, in a coiling stream.
      const over = smoothstep(0, 0.6, drop)
      const down = smoothstep(0.1, 1, drop) ** 1.4
      const coil = 2 * (1 - drop) * over

      out.x += (bird.roost.x - out.x) * over + coil * Math.cos(drop * 8 + bird.start)
      out.z += (bird.roost.z - out.z) * over + coil * Math.sin(drop * 8 + bird.start)
      out.y += (bird.roost.y - out.y) * down
    }

    return true
  }

  const leave = partOf(hour.leave, bird.turn)

  if (leave <= 0 || leave >= 1)
    return false

  // Up out of the wall first, and then away, quicker as it goes.
  const up  = smoothstep(0, 0.35, leave)
  const off = smoothstep(0.1, 1, leave) ** 2

  out.x = bird.roost.x + (bird.away.x - bird.roost.x) * off
  out.y = bird.roost.y + 18 * up + (bird.away.y - bird.roost.y - 18) * off
  out.z = bird.roost.z + (bird.away.z - bird.roost.z) * off

  return true
}

/** A point out over the sea toward the land beyond. */
function afar (rng: SeededRng): Point {
  const bearing  = rng.range(BEARING[0], BEARING[1])
  const distance = rng.range(AFAR[0], AFAR[1])

  return { x: Math.sin(bearing) * distance, y: rng.range(30, 60), z: -Math.cos(bearing) * distance }
}

/** Places along the walls, `CHINK_STEP` apart, within `REACH` of where they roost. */
function chinks ({ ground, infield }: Site): Point[] {
  return infield.runs.flatMap(run => run.slice(1).flatMap((to, index) => {
    const from  = run[index]!
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / CHINK_STEP)

    return Array.from({ length: steps }, (_, step) => {
      const x = from.x + (to.x - from.x) * step / steps
      const z = from.z + (to.z - from.z) * step / steps

      return { x, y: ground.heightAt(x, z) + LEDGE, z }
    })
  })).filter(({ x, z }) => Math.hypot(x - ROOST_AT.x, z - ROOST_AT.z) < REACH)
}

export function createStarlings (site: Site, seed: number, tier: QualityTier): Starlings {
  const rng   = createSeededRng(seed).fork('starlings')
  const holes = chinks(site)
  const roost = { ...ROOST_AT, y: site.ground.heightAt(ROOST_AT.x, ROOST_AT.z) }
  const birds = Array.from({ length: COUNT[tier] }, (_, index): Starling => {
    const draw = rng.fork(`bird:${index}`)

    return {
      reach: draw.range(0.02, 1) ** 1.1,
      rise:  (draw.range(-1, 1) + draw.range(-1, 1)) / 2,
      start: draw.range(0, TAU),
      pace:  TAU / draw.range(CIRCUIT[0], CIRCUIT[1]),
      beat:  TAU * draw.range(BEAT[0], BEAT[1]),
      phase: draw.range(0, TAU),
      turn:  draw.range(0, 1),
      from:  afar(draw),
      away:  afar(draw),
      roost: holes[draw.int(0, holes.length - 1)]!,
    }
  })

  return {
    birds,

    at (time, out) {
      const elevation = elevationAt(time)
      const hour      = hourAt(time) % TAU

      out.time    = time
      out.evening = (hour + TAU) % TAU < Math.PI
      out.come    = between(elevation, COME)
      out.roost   = between(elevation, ROOST)
      out.settle  = smoothstep(0, GATHER, out.roost)
      out.leave   = between(elevation, LEAVE)

      return out
    },

    fly (bird, hour, out) {
      out.up = place(bird, hour, hour.time, roost, here)

      if (!out.up)
        return out

      // Its heading and its lean, read from where it was a moment ago and will be in a moment.
      place(bird, hour, hour.time + GLANCE, roost, ahead)
      place(bird, hour, hour.time - GLANCE, roost, back)

      const dx    = ahead.x - back.x
      const dz    = ahead.z - back.z
      const yaw   = Math.atan2(dz, dx)
      const swing = Math.atan2(ahead.z - here.z, ahead.x - here.x) - Math.atan2(here.z - back.z, here.x - back.x)

      out.x     = here.x
      out.y     = here.y
      out.z     = here.z
      out.yaw   = yaw
      out.pitch = Math.atan2(ahead.y - back.y, Math.hypot(dx, dz))
      out.bank  = Math.max(-1, Math.min(1, Math.atan2(Math.sin(swing), Math.cos(swing)) * LEAN / GLANCE))
      out.wing  = FLAP * Math.sin(hour.time * bird.beat + bird.phase) * smoothstep(-0.3, 0.3, Math.sin(hour.time * 0.6 + bird.phase))

      return out
    },
  }
}

// perf: build draws a dozen numbers a bird and reads the walls once. A step
// is the sun's height once, and for each bird up three places in the cloud (a
// dozen sines each) and three arctangents: some 7k places on desktop.
