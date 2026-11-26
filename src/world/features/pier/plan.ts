// src/world/features/pier/plan.ts
import { JETTY_DECK, JETTY_HALF } from '../../shared/pier.ts'

/**
 * The measures of the pier and of what stands on it and by it. Places on
 * the pier are in its own frame: `along` from its root toward its head,
 * `across` from its middle line toward its lee, heights over the water.
 */

/** Height of a course of its stones: the house's. */
export const COURSE = 0.45

/**
 * The pier's wall: how many courses stand over the water and how many are
 * laid under it (the sea hides the rest), how far each steps in from the one
 * under it, and how far a side's stones stop short of a corner on the
 * courses where the end turns it.
 */
export const WALL = {
  over:   Math.round(JETTY_DECK / COURSE),
  under:  2,
  batter: 0.045,
  quoin:  0.5,
} as const

/** The deck: flat stones laid across it in rows, so many to a row, each row this long. */
export const DECK = { across: 3, row: 0.86, thick: 0.24 } as const

/** How far inside the stones' line the dark behind them begins. */
export const INSET = 0.42

/**
 * The posts a boat is made fast to: where each stands, a hand in from the
 * deck's edge, and how tall. The two on the lee side hold the small boat,
 * fore and aft of where it lies.
 */
export const POSTS = [
  { along: 5.2, across: JETTY_HALF - 0.4 },
  { along: 11.6, across: JETTY_HALF - 0.4 },
  { along: 12.5, across: -JETTY_HALF + 0.45 },
] as const

export const POST = { tall: 0.8, half: 0.13 } as const

/** The ladder down the lee side to the small boat: where along the pier, how far under the water it goes, its width and its rungs. */
export const LADDER = { along: 8.4, under: 0.7, wide: 0.55, rung: 0.36 } as const

/** A creel: a tunnel of net on a slatted base, as long, as wide and as high as this. */
export const CREEL = { long: 1, wide: 0.66, high: 0.46 } as const

/**
 * Where the creels are: stacked short of the light at the pier's head,
 * where they are landed, each as a place in the pier's frame, how many
 * courses of creels up it sits, and how it is turned. And a few at the foot
 * of the first net pole.
 */
export const CREELS = [
  { along: 9.75, across: -1.02, up: 0, turn: 0.04 },
  { along: 10.55, across: -1.05, up: 0, turn: -0.05 },
  { along: 10.25, across: -1, up: 1, turn: 0.08 },
  { along: 8.6, across: -1.05, up: 0, turn: 0.9 },
  { along: 10.45, across: 0.95, up: 0, turn: 1.45 },
] as const

/**
 * The light at the pier's head: a round tower of the pier's own stone, its
 * middle this far in from the head, so many courses tall, its outer line
 * this far from its middle at the foot and at the top. Its door looks back
 * along the pier, this much of the round wide and this many courses high.
 */
export const TOWER = { back: 1.38, courses: 8, foot: 1.12, top: 0.94, door: 0.44, doorway: 4 } as const

/**
 * The lantern on the tower: a glazed room of eight sides this far from its
 * middle to a corner and this tall, on a plinth this tall, under a roof
 * this tall that oversails it to this far out; and the rail round the
 * gallery, this far out and this high.
 */
export const LANTERN = { radius: 0.55, glazed: 0.82, plinth: 0.3, roof: 0.5, eaves: 0.74, rail: 0.18, railHigh: 0.62 } as const

/** Creels left on the beach, by how far past the first pole they lie and how far down the sand from the row. */
export const BEACHED = [
  { past: -1.3, down: 0.1, turn: 0.4, up: 0 },
  { past: -1.9, down: 0.55, turn: -0.3, up: 0 },
  { past: -1.55, down: 0.3, turn: 0.2, up: 1 },
] as const

/** The barrel and the fish box by the root, and the coil of rope half way out. */
export const BARREL = { along: 1.4, across: -1, radius: 0.36, tall: 0.98 } as const
export const BOX    = { along: 2.6, across: -1.05, long: 1, wide: 0.6, high: 0.34 } as const
export const COIL   = { along: 6.6, across: -0.8, radius: 0.42 } as const

/**
 * A net pole: half its thickness, and how far under the sand it is drawn.
 * The rope the nets hang from runs pole to pole this far under their tops,
 * and sags this much between two.
 */
export const POLE = { half: 0.075, sunk: 0.3, rope: 0.18, sag: 0.24 } as const

/**
 * The nets: how far they hang below the rope at their shortest and their
 * longest, how many folds a span is drawn in, how far a fold stands out of
 * the line of the poles, and how many cork floats show along a span's rope.
 */
export const NET = { hang: [ 1.7, 2.5 ], folds: 8, pleat: 0.13, floats: 4 } as const

/**
 * The rack: its two trestles lean together to this half-width at the foot,
 * the rails are at these parts of its height, and a fish is this long and
 * this broad at the shoulder.
 */
export const RACK = { splay: 0.7, rails: [ 1, 0.68 ], fish: [ 0.78, 0.2 ], gap: 0.36 } as const

/** The small boat: how big it is against the one at anchor. */
export const TENDER_SIZE = 0.6
