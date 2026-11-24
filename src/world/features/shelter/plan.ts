// src/world/features/shelter/plan.ts
import { SHELTER_DEEP, SHELTER_LONG } from '../../shared/shelter.ts'

/**
 * The shelter's measures, in its own frame: x across the ridge and downhill,
 * y up from the floor, z along the ridge and out of the door.
 *
 * A walker's eye is three units up, so this is a low house: a door to stoop
 * through, and eaves a hand could reach.
 */

/** Half the walls' outer line, across and along. */
export const HALF_DEEP = SHELTER_DEEP / 2
export const HALF_LONG = SHELTER_LONG / 2

/** Height of a course of stones. The eaves, the door and the window all fall on one. */
export const COURSE = 0.5

/** Height over the floor of the top of the long walls, and of the ridge. */
export const EAVE  = 3
export const RIDGE = 5

/** Thickness of the turf, square to the roof, and how far it oversails the walls at the eaves and at the gables. */
export const TURF  = 0.32
export const EAVES = 0.5
export const VERGE = 0.4

/** How far inside the walls' line the dark behind the stones begins. */
export const INSET = 0.15

/** The doorway, in the middle of the gable at +z: half its width, and its height. */
export const DOOR_HALF = 0.75
export const DOOR_TOP  = 2.5

/** The window in the downhill wall: where along the wall it runs from and to, and its sill and its head. */
export const WINDOW = { from: -2.1, to: -1.2, sill: 1, head: 2 } as const

/** The chimney, on the ridge at the gable away from the door: where, half its width, and how far it stands over the ridge. */
export const CHIMNEY = { along: -3.15, half: 0.62, over: 1.4 } as const

/** The lamp: hung in the doorway, to one side, under the lintel. */
export const LAMP = [ -0.32, 1.85, HALF_LONG + 0.12 ] as const

/** Height over the floor of the underside of the roof, `across` from the ridge. */
export function underRoof (across: number): number {
  return RIDGE - (RIDGE - EAVE) * Math.abs(across) / HALF_DEEP
}
