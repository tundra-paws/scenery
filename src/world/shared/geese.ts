// src/world/shared/geese.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

/**
 * The skeins: the lines the wild geese go over on, as where a skein's leader
 * is when it is over the island, where it is going (a bearing, from -z toward
 * +x like `NORTH` in `shared/daylight.ts`: they come down out of the north
 * with the back end of the year, and south is +z), how high it flies over
 * the water, how many seconds after second ten it is over that place, and
 * how many birds are in it.
 *
 * Typed in, like the starlings' wheel, because the first was chosen by
 * looking: at second ten it is coming on over the island straight at `hero`,
 * south-east for the bay, so the frame has it as a chevron, point up, in the
 * open sky between the cairn and the big cloud (`geese.test.ts` holds it in
 * that frame). The other two come over later on lines of their own: down
 * the west side, and over the brae.
 */
const SKEINS: readonly Line[] = [
  { over: [ 40, 51 ], bearing: 132, height: 52, after: 0, birds: { mobile: 15, desktop: 27, highEnd: 31 }, longer: -1 },
  { over: [ -46, 30 ], bearing: 171, height: 74, after: 45, birds: { mobile: 9, desktop: 15, highEnd: 19 }, longer: -1 },
  { over: [ 22, 52 ], bearing: 198, height: 61, after: 90, birds: { mobile: 9, desktop: 13, highEnd: 15 }, longer: 1 },
]

/** The moment the postcards are taken, in seconds: a skein's `after` is counted from it. */
const TEN = 10

/**
 * How far a skein flies before it is the next one coming: it goes out of
 * sight to the south and is brought round to the north again, as the clouds
 * are. And how far from either end of that it has dwindled to nothing, so
 * no bird is ever seen to go.
 */
export const LAP = 1560

const DWINDLE    = 170

/** How fast they fly, in units a second. Slower than a goose: unhurried, like everything here. */
export const SPEED = 11.5

/** From one bird to the next along an arm of the chevron, and how far the arm lies back from square to the way they go, in radians. */
const GAP   = 4.6
const SWEEP = 0.98

/** The share of a skein on its longer arm. A chevron of geese is never even. */
const LONGER = 0.62

/**
 * A skein is never a ruled line: a slow wave runs back along each arm, so
 * far to the side and so far up and down, and each bird keeps a little off
 * its place.
 */
const SNAKE = { aside: 0.9, lift: 0.7, pace: 0.33, along: 0.12, loose: 0.45 } as const

/** A wing's beat: how many radians a second it turns through, how far above and below level it goes, and how much later each bird back along the arm is in it. */
const BEAT = { rate: 9.4, up: 0.2, swing: 0.5, lag: 0.55 } as const

/** One line the geese go over on, as `SKEINS` lists them. */
interface Line {
  over:    readonly [number, number]
  bearing: number
  height:  number
  after:   number
  birds:   Record<QualityTier, number>

  /** Which side its longer arm is on: 1 is the leader's right. */
  longer: number
}

/** One goose, by its place in its skein. */
export interface Goose {

  /** How far behind the leader it flies, and how far to the leader's right. */
  readonly back:  number
  readonly aside: number

  /** How far it keeps off that place, to the side and up; where in its beat and its wavering it begins; and how big it is. */
  readonly off:   readonly [number, number]
  readonly phase: number
  readonly size:  number
}

/** One skein: a chevron of geese and the line it flies. */
export interface Skein {

  /** Where its leader is at its moment, the unit direction it flies, as `[x, z]`, and the turn about the upright that points a bird that way. */
  readonly over: readonly [number, number]
  readonly way:  readonly [number, number]
  readonly yaw:  number

  /** How high its leader flies, and the seconds after second ten it is over `over`. */
  readonly height: number
  readonly after:  number
  readonly birds:  readonly Goose[]
}

/** How a goose is at one moment. */
export interface Wingbeat {
  x: number
  y: number
  z: number

  /** How far its wings are above level, in radians: under it on the downstroke. */
  beat: number

  /** How much of itself it is: nothing where the skein goes out of sight, 1 over the island. */
  shown: number
}

/**
 * The wild geese: skeins going over, high, on their way south.
 *
 * A layout and a clock, DOM-free and GPU-free like the gulls': each skein is
 * a ragged chevron behind one bird, on a straight line across the whole sky,
 * and comes round again as the clouds do. They do not land and they keep no
 * hours: geese go over by day and under the moon alike. A pure function of
 * the time.
 */
export interface Geese {
  readonly skeins: readonly Skein[]

  /** How far along its line a skein's leader is at `time` seconds: nothing when it is over the island. */
  along (skein: Skein, time: number): number

  /** How `goose` of `skein` is at `time` seconds. Written into `out`. */
  at (skein: Skein, goose: Goose, time: number, out: Wingbeat): Wingbeat
}

/** The chevron: the leader, then birds dealt out to the two arms until the longer has its share. */
function form (count: number, longer: number, seed: number, index: number): Goose[] {
  const rng   = createSeededRng(seed).fork(`geese:${index}`)
  const arms  = [ 0, 0 ]
  const birds = [] as Goose[]

  for (let bird = 0; bird < count; bird += 1) {
    // The leader is on neither arm. After it, a bird goes to the longer arm while that has less than its share.
    const arm  = arms[0]! < bird * LONGER ? 0 : 1
    const rank = bird === 0 ? 0 : arms[arm]! + 1
    const side = arm === 0 ? longer : -longer
    const away = bird === 0 ? 0 : (rank + rng.range(-0.12, 0.12)) * GAP

    if (bird > 0)
      arms[arm] = rank

    birds.push({
      back:  away * Math.sin(SWEEP),
      aside: side * away * Math.cos(SWEEP),
      off:   [ rng.range(-SNAKE.loose, SNAKE.loose), rng.range(-SNAKE.loose, SNAKE.loose) ],
      phase: rng.range(0, Math.PI * 2),
      size:  rng.range(0.92, 1.08),
    })
  }

  return birds
}

export function createGeese (seed: number, tier: QualityTier): Geese {
  const skeins = SKEINS.map((line, index): Skein => {
    const angle = THREE.MathUtils.degToRad(line.bearing)
    const way   = [ Math.sin(angle), -Math.cos(angle) ] as const

    return {
      way,
      over:   line.over,
      yaw:    Math.atan2(-way[1], way[0]),
      height: line.height,
      after:  line.after,
      birds:  form(line.birds[tier], line.longer, seed, index),
    }
  })

  const along = (skein: Skein, time: number): number => {
    const flown = SPEED * (time - TEN - skein.after) + LAP / 2

    return (flown % LAP + LAP) % LAP - LAP / 2
  }

  return {
    skeins,
    along,

    at (skein, goose, time, out) {
      const { over, way } = skein
      const lead          = along(skein, time)

      // The wave that runs back along the arm, and the bird's own wavering in it.
      const wave  = time * SNAKE.pace - goose.back * SNAKE.along
      const aside = goose.aside + goose.off[0] + SNAKE.aside * Math.sin(wave + skein.after) * Math.min(1, goose.back / 12)
      const lift  = goose.off[1] + SNAKE.lift * Math.sin(wave * 1.3 + goose.phase * 0.2)
      const ahead = lead - goose.back

      out.x     = over[0] + way[0] * ahead - way[1] * aside
      out.y     = skein.height + lift
      out.z     = over[1] + way[1] * ahead + way[0] * aside
      out.beat  = BEAT.up + BEAT.swing * Math.sin(time * BEAT.rate - goose.back * BEAT.lag + goose.phase * 0.3)
      out.shown = 1 - smoothstep(LAP / 2 - DWINDLE, LAP / 2 - 20, Math.abs(lead))

      return out
    },
  }
}

// perf: trivial — some fifty birds, laid out once. `at` is four sines.
