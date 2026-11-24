// src/rig/walk.ts

/**
 * How far ahead on its way a walking camera looks: at the middle of three
 * points this far in front of it, so a bend comes into the picture before the
 * feet reach it.
 */
const AHEAD = [ 8, 14, 20 ] as const

/** How far under its own eye height a walker looks: at the ground ahead, not over it. */
const LOOK_DOWN = 1.2

/** Distance between the points at which a walk's pace is worked out. */
const STRIDE = 0.5

/** How fast the head may turn, in radians a second. The pace drops in a bend to keep to it. */
const HEAD_TURN = 0.3

/** The least of its pace a walker keeps, in the tightest bend. */
const SLOWEST = 0.3

/** Strides either side over which the pace is evened out, twice over: a walker sees the bend coming. */
const EVEN = 5

/** Distance over which a walk gets up to pace from rest and loses it again, and the part of its pace it sets off at. */
const RAMP  = 6
const CREEP = 0.12

/** Scratch, so a step allocates nothing. */
const here  = [ 0, 0, 0 ]
const there = [ 0, 0, 0 ]
const ahead = [ 0, 0, 0 ]

export type Point = readonly [number, number, number]

/** A walk, as it is asked for: where the feet go between two views, at eye height, and how fast at most. */
export interface WalkOptions {
  way: readonly Point[]

  /** World units a second on the straight. */
  pace: number
}

/** A line to walk, and how far along it each of its points is. */
interface Line {
  line:  readonly Point[]
  reach: readonly number[]

  /** Distance from the first point to the last but one. The last is only looked at. */
  length: number
}

/**
 * A leg the camera walks instead of flying: along a line on the ground,
 * looking where it is going, slower through the bends.
 *
 * A pure function of the seconds gone, like the rest of the tour: the pace is
 * worked out once, as a clock along the line.
 */
export interface Walk extends Line {

  /** Seconds it takes. */
  travel: number

  /** Seconds gone on reaching each stride of the line. */
  clock: readonly number[]
}

function ease (value: number): number {
  const t = Math.min(1, Math.max(0, value))

  return t * t * (3 - 2 * t)
}

/** The point `distance` along a line, written into `out`. Past the end it is the end. */
function pointAlong ({ line, reach }: Line, distance: number, out: number[]): void {
  let index = 1

  while (index < line.length - 1 && reach[index]! < distance)
    index += 1

  const from  = line[index - 1]!
  const to    = line[index]!
  const span  = reach[index]! - reach[index - 1]!
  const along = span > 0 ? Math.min(1, Math.max(0, (distance - reach[index - 1]!) / span)) : 0

  for (let axis = 0; axis < 3; axis += 1)
    out[axis] = from[axis]! + (to[axis]! - from[axis]!) * along
}

/** What a walker `distance` along a line is looking at, written into `out`. */
function lookFrom (line: Line, distance: number, out: number[]): void {
  out[0] = 0
  out[1] = -LOOK_DOWN
  out[2] = 0

  for (const further of AHEAD) {
    pointAlong(line, distance + further, there)

    for (let axis = 0; axis < 3; axis += 1)
      out[axis]! += there[axis]! / AHEAD.length
  }
}

/** Which way a walker `distance` along a line is looking, as a unit vector. */
function gazeAt (line: Line, distance: number): number[] {
  pointAlong(line, distance, here)
  lookFrom(line, distance, ahead)

  const gaze = ahead.map((value, axis) => value - here[axis]!)
  const far  = Math.hypot(gaze[0]!, gaze[1]!, gaze[2]!) || 1

  return gaze.map(value => value / far)
}

/** A list of numbers, each averaged with its `EVEN` neighbours either side. */
function even (values: readonly number[]): number[] {
  return values.map((_, index) => {
    let sum = 0

    for (let offset = -EVEN; offset <= EVEN; offset += 1)
      sum += values[Math.min(values.length - 1, Math.max(0, index + offset))]!

    return sum / (EVEN * 2 + 1)
  })
}

/**
 * The seconds gone on reaching each stride of a line.
 *
 * On the straight the walker keeps `pace`. Where the way bends, the head has
 * to turn to keep looking along it, and the pace drops so that it turns no
 * faster than `HEAD_TURN`. Both ends are taken from rest.
 */
function keepClock (line: Line, pace: number): number[] {
  const strides = Math.max(1, Math.ceil(line.length / STRIDE))
  const stride  = line.length / strides
  const gazes   = Array.from({ length: strides + 1 }, (_, index) => gazeAt(line, index * stride))

  const paces = even(even(Array.from({ length: strides }, (_, index) => {
    const [ x, y, z ]    = gazes[index]!
    const [ nx, ny, nz ] = gazes[index + 1]!
    const turn           = Math.acos(Math.min(1, x * nx + y * ny + z * nz)) / stride

    return Math.min(pace, Math.max(pace * SLOWEST, HEAD_TURN / turn))
  })))

  const clock = [ 0 ]

  paces.forEach((steady, index) => {
    const gone = (index + 0.5) * stride
    const ramp = CREEP + (1 - CREEP) * ease(Math.min(gone, line.length - gone) / RAMP)

    clock.push(clock[index]! + stride / (steady * ramp))
  })

  return clock
}

/**
 * A walk from one camera position to another along `way`, with the eyes
 * running on, past its end, toward `toward`.
 */
export function createWalk (from: Point, to: Point, toward: Point, { way, pace }: WalkOptions): Walk {
  const line  = [ from, ...way, to, toward ].map(([ x, y, z ]): Point => [ x, y, z ])
  const reach = [ 0 ]

  for (let index = 1; index < line.length; index += 1) {
    const [ x, y, z ]    = line[index]!
    const [ px, py, pz ] = line[index - 1]!

    reach.push(reach[index - 1]! + Math.hypot(x - px, y - py, z - pz))
  }

  const length = reach.at(-2)!
  const clock  = keepClock({ line, reach, length }, pace)

  return { line, reach, length, clock, travel: clock.at(-1)! }
}

/** Where a walk is `seconds` after it set off, and what it looks at from there, written into the two outs. */
export function walkAt (walk: Walk, seconds: number, position: number[], target: number[]): void {
  const { clock } = walk

  let before = 0
  let after  = clock.length - 1

  while (after - before > 1) {
    const middle = before + after >> 1

    if (clock[middle]! <= seconds)
      before = middle
    else
      after = middle
  }

  const span   = clock[after]! - clock[before]!
  const within = span > 0 ? Math.min(1, Math.max(0, (seconds - clock[before]!) / span)) : 0
  const gone   = (before + within) * walk.length / (clock.length - 1)

  pointAlong(walk, gone, position)
  lookFrom(walk, gone, target)
}

// perf: trivial — a step on a walked leg is a binary search of its clock and
// four scans of its line: a few hundred compares, no allocation. The clock is
// worked out once, at a few hundred points.
