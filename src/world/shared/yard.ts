// src/world/shared/yard.ts
import type { Ground } from './ground.ts'
import { distanceToSpan } from './path.ts'
import type { Path, Waypoint } from './path.ts'
import { SHELTER_LONG } from './shelter.ts'
import type { Shelter } from './shelter.ts'

/**
 * Where the kiln stands: on the level shelf between the fold and the field
 * gate, below the path's first turn, half way from the rigs to the mill.
 *
 * Typed in, like the shelter's site, because it was chosen by looking: from
 * `hero` it stands in the middle of the picture, on the one lit green the
 * walls had left empty, and its smoke goes up between the mill's roof and
 * the house's. How it sits there is read from the land.
 */
const KILN: Waypoint = { x: 45.8, z: 69.5 }

/** The line its stones are laid round, from the middle of its floor. */
export const KILN_RADIUS = 1.75

/**
 * Which way its fire-hole looks, as an angle from +x toward +z: out over the
 * fall of the shelf toward the field, so the draught is drawn up through it
 * and `hero` looks into its dark.
 */
const KILN_MOUTH = 0.55

/** How far out of the mouth its step lies, and how far beyond that the way to it swings before it turns for the path. */
const STEP   = 0.7
const STRIDE = 3

/**
 * Where the stacks stand: the green before the house's door, between the
 * path's turn and the hill, on the levellest ground the island has.
 *
 * Typed in for `hero` too: the four stand left of the house's gable, in the
 * evening sun, against the heather. `raised` is how much of one is built:
 * the last of them is half up, the sledge beside it.
 */
const STACKS: readonly (Waypoint & { size: number, raised: number })[] = [
  { x: 49.5, z: 62.1, size: 1.04, raised: 1 },
  { x: 49.3, z: 58.7, size: 1.12, raised: 1 },
  { x: 46.2, z: 58.5, size: 0.98, raised: 1 },
  { x: 46.6, z: 61.5, size: 1, raised: 0.45 },
]

/** A stack's radius where it is widest, at the eaves, and at its foot, before it is sized. */
export const STACK_EAVE = 1.45
export const STACK_FOOT = 1.12

/**
 * How far the top of a stack's base of stones stands over the ground at its
 * middle: the base is level and the green is not quite, so its upper side
 * is let into the turf and its lower side built up.
 */
const STEDDLE = 0.34

/**
 * Which side of the stack that is building the work is done on, as an angle
 * from +x toward +z: the side the path is, where the sledge comes up. And how
 * far that way the way from the door swings, to clear the stacks between.
 */
export const WORK = 1

const SWING = 2.3

/** Spans a way is drawn in. */
const SPANS = 8

/** A round stack of sheaves on its base of stones. */
export interface Stack extends Waypoint {

  /** World height of the top of its base, which is level: the sheaves start here. */
  readonly base: number

  /** How big it is against the others: 1 is a stack three strides across at the eaves. */
  readonly size: number

  /** How much of it is built, 0 to 1. Under 1 it has no thatch yet. */
  readonly raised: number
}

/** The kiln: a round tower of placed stone with a fire-hole on its low side. */
export interface Kiln extends Waypoint {

  /** World height of its floor, which is the ground at its mouth. */
  readonly floor: number

  /** Unit direction out of its mouth. */
  readonly mouth: readonly [number, number]

  /** The angle of that direction, from +x toward +z. */
  readonly bearing: number
}

/**
 * The stackyard and the kiln, as places on the ground: where the harvest
 * comes home to.
 *
 * DOM-free and GPU-free, like the shelter and the mill: the feature builds on
 * it, everything that grows or grazes keeps off it, the terrain wears the
 * ways to it, and a test can ask where it is.
 */
export interface Yard {
  readonly kiln:   Kiln
  readonly stacks: readonly Stack[]

  /** The trodden ways: from the path to the kiln's mouth, and from the house's door to the stack that is building. */
  readonly ways: readonly (readonly Waypoint[])[]

  /** How far a place is from the kiln's wall or the nearest stack's eaves. Nothing, inside one. */
  distanceTo (x: number, z: number): number

  /** How far a place is from the middle of the nearest of the ways. */
  distanceToSpur (x: number, z: number): number
}

/** One curve from `from` to `to`, drawn toward `round` on its way. */
function curve (from: Waypoint, round: Waypoint, to: Waypoint): Waypoint[] {
  return Array.from({ length: SPANS + 1 }, (_, index) => {
    const t = index / SPANS

    return {
      x: from.x * (1 - t) ** 2 + round.x * 2 * t * (1 - t) + to.x * t ** 2,
      z: from.z * (1 - t) ** 2 + round.z * 2 * t * (1 - t) + to.z * t ** 2,
    }
  })
}

export function createYard (ground: Ground, path: Path, shelter: Shelter): Yard {
  const mouth = [ Math.cos(KILN_MOUTH), Math.sin(KILN_MOUTH) ] as const
  const sill  = { x: KILN.x + mouth[0] * (KILN_RADIUS + STEP), z: KILN.z + mouth[1] * (KILN_RADIUS + STEP) }
  const out   = { x: sill.x + mouth[0] * STRIDE, z: sill.z + mouth[1] * STRIDE }
  const join  = path.points.reduce((best, point) => Math.hypot(point.x - out.x, point.z - out.z) < Math.hypot(best.x - out.x, best.z - out.z) ? point : best)

  const kiln = {
    ...KILN,
    mouth,
    bearing: KILN_MOUTH,
    floor:   ground.heightAt(KILN.x + mouth[0] * KILN_RADIUS, KILN.z + mouth[1] * KILN_RADIUS),
  }

  const stacks = STACKS.map(stack => ({ ...stack, base: ground.heightAt(stack.x, stack.z) + STEDDLE }))

  // From the door to the stack that is building, round the foot of the
  // others: where the sheaves are carried the last few strides.
  const door     = shelter.place(0, SHELTER_LONG / 2 + 0.9)
  const building = stacks.find(stack => stack.raised < 1) ?? stacks[0]!
  const before   = { x: building.x + Math.cos(WORK) * STACK_EAVE * 1.5, z: building.z + Math.sin(WORK) * STACK_EAVE * 1.5 }
  const round    = { x: (door.x + before.x) / 2 + Math.cos(WORK) * SWING, z: (door.z + before.z) / 2 + Math.sin(WORK) * SWING }
  const ways     = [ curve(join, out, sill), curve(door, round, before) ]

  return {
    kiln,
    stacks,
    ways,

    distanceTo (x, z) {
      let nearest = Math.hypot(x - kiln.x, z - kiln.z) - KILN_RADIUS

      for (const stack of stacks)
        nearest = Math.min(nearest, Math.hypot(x - stack.x, z - stack.z) - STACK_EAVE * stack.size)

      return Math.max(0, nearest)
    },

    distanceToSpur (x, z) {
      let nearest = Infinity

      for (const way of ways)
        for (let index = 1; index < way.length; index += 1)
          nearest = Math.min(nearest, distanceToSpan(x, z, way[index - 1]!, way[index]!))

      return nearest
    },
  }
}

// perf: trivial — a few dozen ground samples and one pass over the path's
// points, once. `distanceTo` is five circles; `distanceToSpur` sixteen spans.
