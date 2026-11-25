// src/world/features/yard/plan.ts
import { KILN_RADIUS, STACK_EAVE, STACK_FOOT } from '../../shared/yard.ts'

/**
 * The measures of the kiln and of a stack, each about its own middle: a
 * radius out from it, and a height up from the kiln's floor or the top of
 * the stack's base.
 */

/** Height of a course of the kiln's stones: the mill's. */
export const COURSE = 0.45

/**
 * The kiln: the line its stones are laid round at the floor, how many
 * courses stand over it, and how far each steps in from the one under it,
 * so the tower narrows as it rises. Its mouth, the fire-hole: half its
 * width, and its height, which falls on a course. Its roof: a cone of turf
 * from past the wall's top up to the vent the smoke leaves by.
 */
export const KILN = {
  radius:    KILN_RADIUS,
  courses:   6,
  batter:    0.05,
  mouthHalf: 0.55,
  mouthTop:  COURSE * 3,
  eaves:     0.62,
  turf:      0.28,
  apex:      COURSE * 6 + 1.8,
  vent:      0.34,
} as const

/** Height over the floor of the top of the kiln's wall. */
export const KILN_WALL = COURSE * KILN.courses

/** How far inside the stones' line the dark behind them begins. */
export const INSET = 0.15

/**
 * A stack, before it is sized: its radius at the foot and at the eaves, the
 * height of the eaves, where the thatch's edge hangs, and the height of the
 * top. A stride and a half across at the foot and wider at the shoulder, so
 * the rain it sheds falls clear of the sheaves under it.
 */
export const STACK = {
  foot:  STACK_FOOT,
  eave:  STACK_EAVE,
  high:  2,
  drip:  [ 1.58, 1.82 ],
  apex:  4.05,
  sides: 10,
} as const

/**
 * The thatch, from its hanging edge to the point: rounded like a beehive,
 * not a cone, the way a stack's head is built up in ever smaller rings.
 */
export const THATCH = [ STACK.drip, [ 1.52, 2.1 ], [ 1.3, 2.72 ], [ 0.94, 3.3 ], [ 0.5, 3.76 ], [ 0, STACK.apex ]] as const

/** The ropes over a stack's thatch, each with a stone hung on its end, and where on the thatch a rope goes round them all. */
export const ROPES = 8
export const HOOP  = 2

/** Stones round the foot of a stack, and the height of one. */
export const STEDDLE = { round: 9, thick: 0.34 } as const

/** A place round a stack or the kiln: `radius` out from the middle at `angle`, from +x toward +z. */
type MiddleType = { x: number, z: number }

export function ringed (middle: MiddleType, radius: number, angle: number): readonly [number, number] {
  return [ middle.x + Math.cos(angle) * radius, middle.z + Math.sin(angle) * radius ]
}
