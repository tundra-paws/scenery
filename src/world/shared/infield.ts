// src/world/shared/infield.ts
import { distanceToSpan } from './path.ts'
import type { Waypoint } from './path.ts'
import type { Shelter } from './shelter.ts'

/**
 * The line of the dyke round the field: the ground between the foot of the
 * path, the top of the beach and the slope under the shelter's door, which
 * the house looks down over.
 *
 * Typed in, like the shelter's site and the wood's heart, because it was
 * chosen by looking: from `hero` the field fills the middle of the frame
 * under the house. It runs beside the path, a little more than an arm's
 * length from its middle, from where the path leaves the beach to where the
 * way to the door leaves it; across the slope under the door; and back down
 * along the top of the beach. What the field holds is read from the land.
 */
const FIELD: readonly Waypoint[] = [
  { x: 55.6, z: 70 },
  { x: 60.6, z: 68.5 },
  { x: 63.9, z: 68.9 },
  { x: 62.3, z: 71.8 },
  { x: 61.4, z: 73.7 },
  { x: 60.2, z: 75.7 },
  { x: 59, z: 77.3 },
  { x: 56.1, z: 80.3 },
  { x: 52, z: 82.8 },
  { x: 47.2, z: 83.4 },
  { x: 50.2, z: 80 },
  { x: 53.2, z: 76.7 },
  { x: 55.2, z: 73.2 },
]

/**
 * The gate: in the top wall, this far along it from the corner by the path,
 * and this wide between its posts. It opens toward the way to the door.
 */
const GATE_ALONG = 2.4
const GATE_WIDTH = 2.2

/** How far out from the side of a gap its post stands. */
const POST_OUT = 0.28

/** How far into the field the trodden way runs through the gate. */
const GATE_IN = 1.6

/**
 * The fold: a ring of wall on the shelf across the path from the field, where
 * the hill comes down gentle enough to pen sheep on. Its middle, its radius,
 * and the width of its mouth, which faces the path.
 */
const FOLD: Waypoint    = { x: 37.6, z: 70.7 }
const FOLD_RADIUS       = 3.7
const FOLD_MOUTH        = 1.5
const FOLD_FACING       = 0.35
const FOLD_STONES_ROUND = 28

/**
 * The head-dyke: the long wall between the worked ground and the hill. It
 * starts across the path from the field's wall, so the path goes up through
 * the gap between them, runs along the fold's foot, and follows the foot of
 * the steep ground west and down until it goes into the sea. Typed in along
 * the land's own break of slope, and clear of the lone birches.
 */
const HEAD: readonly Waypoint[] = [
  { x: 47.3, z: 75.2 },
  { x: 42, z: 75.9 },
  { x: 37.6, z: 74.9 },
  { x: 32.5, z: 76.6 },
  { x: 27, z: 80 },
  { x: 20, z: 82.6 },
  { x: 12, z: 84.6 },
  { x: 4.5, z: 86.6 },
  { x: 1.5, z: 90 },
  { x: -0.5, z: 95 },
]

/** A gap in a wall, between two posts stood on end. */
export interface Gate extends Waypoint {

  /** Unit direction along the wall it is in, from the one post to the other. */
  readonly along: readonly [number, number]

  /** Clear width between the posts. */
  readonly width: number
}

/** The fold's wall and the gap left in it. */
interface Fold {
  run:   Waypoint[]
  mouth: Gate
}

/**
 * The walls the island's people laid round the ground they worked: a field of
 * rigs below the shelter, a fold for the sheep on the shelf across the path,
 * and the head-dyke that keeps them both from the hill.
 *
 * DOM-free and GPU-free, like the shelter and the wood: the feature lays the
 * stones and the rigs, the boulders, the grass and the trees keep off, the
 * terrain wears the way to the gate, and a test can ask where it all is.
 */
export interface Infield {

  /** The dyke's line round the field, as a closed ring, the gate left in. */
  readonly field: readonly Waypoint[]

  /** Every stretch of wall, gates left out: each an open line of stones. */
  readonly runs: readonly (readonly Waypoint[])[]

  /** The gaps in the walls, the field's and the fold's mouth. */
  readonly gates: readonly Gate[]

  /** Long stones stood on end: one each side of every gap, and one at the head-dyke's end by the path. */
  readonly posts: readonly (Waypoint & { readonly turn: number })[]

  /** The fold's middle and its radius. */
  readonly fold: Waypoint & { readonly radius: number }

  /** The way worn from the path to the field gate and a little through it. */
  readonly track: readonly Waypoint[]

  /** How far a place is from the middle of the nearest wall. */
  distanceTo (x: number, z: number): number

  /** Whether a place is inside the field's dyke. */
  inField (x: number, z: number): boolean
}

/** Whether a place is inside a closed ring, by counting the edges a ray from it crosses. */
function inside (ring: readonly Waypoint[], x: number, z: number): boolean {
  let crossed = false

  for (let index = 0, last = ring.length - 1; index < ring.length; last = index, index += 1) {
    const a = ring[index]!
    const b = ring[last]!

    if (a.z > z !== b.z > z && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x)
      crossed = !crossed
  }

  return crossed
}

/** A place a distance along a straight piece of wall. */
function along (from: Waypoint, to: Waypoint, distance: number): Waypoint {
  const length = Math.hypot(to.x - from.x, to.z - from.z)

  return { x: from.x + (to.x - from.x) * distance / length, z: from.z + (to.z - from.z) * distance / length }
}

/** The fold's wall, as one open line round from one side of its mouth to the other. */
function ringFold (): Fold {
  const gap  = FOLD_MOUTH / FOLD_RADIUS
  const run  = []
  const from = FOLD_FACING + gap / 2
  const span = Math.PI * 2 - gap

  for (let stone = 0; stone <= FOLD_STONES_ROUND; stone += 1) {
    const angle = from + span * stone / FOLD_STONES_ROUND

    run.push({ x: FOLD.x + Math.cos(angle) * FOLD_RADIUS, z: FOLD.z + Math.sin(angle) * FOLD_RADIUS })
  }

  const first = run[0]!
  const last  = run.at(-1)!
  const width = Math.hypot(first.x - last.x, first.z - last.z)

  return {
    run,
    mouth: { x: (first.x + last.x) / 2, z: (first.z + last.z) / 2, along: [ (first.x - last.x) / width, (first.z - last.z) / width ], width },
  }
}

/** The way from the nearest of the way to the door, out through the gate and into the field, as one curve. */
function wearTrack (shelter: Shelter, gate: Gate): Waypoint[] {
  // Into the field is square to the wall, on the side away from the house.
  const square = [ -gate.along[1], gate.along[0] ] as const
  const sign   = (gate.x - shelter.x) * square[0] + (gate.z - shelter.z) * square[1] > 0 ? 1 : -1
  const end    = { x: gate.x + square[0] * sign * GATE_IN, z: gate.z + square[1] * sign * GATE_IN }
  const out    = { x: gate.x - square[0] * sign * GATE_IN, z: gate.z - square[1] * sign * GATE_IN }
  const join   = shelter.spur.reduce((best, point) => Math.hypot(point.x - out.x, point.z - out.z) < Math.hypot(best.x - out.x, best.z - out.z) ? point : best)

  return Array.from({ length: 9 }, (_, index) => {
    const t = index / 8

    return {
      x: join.x * (1 - t) ** 2 + out.x * 2 * t * (1 - t) + end.x * t ** 2,
      z: join.z * (1 - t) ** 2 + out.z * 2 * t * (1 - t) + end.z * t ** 2,
    }
  })
}

export function createInfield (shelter: Shelter): Infield {
  // The ring, opened at the gate: from the gate's far post all the way round
  // to the corner by the path, and on to its near post.
  const corner = FIELD[0]!
  const next   = FIELD[1]!
  const near   = along(corner, next, GATE_ALONG - GATE_WIDTH / 2)
  const far    = along(corner, next, GATE_ALONG + GATE_WIDTH / 2)
  const middle = along(corner, next, GATE_ALONG)
  const width  = Math.hypot(next.x - corner.x, next.z - corner.z)
  const gate   = { ...middle, along: [ (next.x - corner.x) / width, (next.z - corner.z) / width ] as const, width: GATE_WIDTH }
  const round  = [ far, ...FIELD.slice(1), corner, near ]
  const fold   = ringFold()
  const runs   = [ round, fold.run, HEAD ]
  const gates  = [ gate, fold.mouth ]
  const end    = HEAD[0]!
  const before = HEAD[1]!

  const posts = [
    ...gates.flatMap(({ x, z, along: [ ax, az ], width: span }) => [ -1, 1 ].map(side => ({
      x:    x + ax * side * (span / 2 + POST_OUT),
      z:    z + az * side * (span / 2 + POST_OUT),
      turn: Math.atan2(-az, ax),
    }))),
    { x: end.x, z: end.z, turn: Math.atan2(end.z - before.z, before.x - end.x) },
  ]

  return {
    field: FIELD,
    runs,
    gates,
    posts,
    fold:  { ...FOLD, radius: FOLD_RADIUS },
    track: wearTrack(shelter, gate),

    distanceTo (x, z) {
      let nearest = Infinity

      for (const run of runs)
        for (let index = 1; index < run.length; index += 1)
          nearest = Math.min(nearest, distanceToSpan(x, z, run[index - 1]!, run[index]!))

      return nearest
    },

    inField (x, z) {
      return inside(FIELD, x, z)
    },
  }
}

// perf: trivial — a few dozen points, once. `distanceTo` is some forty spans:
// ask it at build time, not per frame.
