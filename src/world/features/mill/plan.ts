// src/world/features/mill/plan.ts
import { MILL_DEEP, MILL_DOOR, MILL_LONG, MILL_RACE } from '../../shared/mill.ts'

/**
 * The mill's measures, in its own frame: x across the ridge and down the
 * burn, y up from the floor, z along the ridge.
 *
 * Smaller than the house and lower in the door, but taller from below: the
 * floor is level and the burn is not, so the wall the water leaves by stands
 * a storey over it, and under the floor there is the wheel's own room.
 */

/** Half the walls' outer line, across and along. */
export const HALF_DEEP = MILL_DEEP / 2
export const HALF_LONG = MILL_LONG / 2

/** Height of a course of stones. The eaves and the door's head fall on one. */
export const COURSE = 0.45

/** Height over the floor of the top of the long walls, and of the ridge. */
export const EAVE  = COURSE * 5
export const RIDGE = EAVE + 1.25

/** The roof, as the shared turf slope reads it: its turf's thickness, and how far it oversails the walls. */
export const ROOF = { halfDeep: HALF_DEEP, halfLong: HALF_LONG, eave: EAVE, ridge: RIDGE, turf: 0.3, eaves: 0.42, verge: 0.36 } as const

/** How far inside the walls' line the dark behind the stones begins. */
export const INSET = 0.15

/** Where the water runs under, along the ridge from the middle. */
export const RACE = MILL_RACE

/** How far under the floor the wheel's room has its ceiling: the thickness of the floor and its joists. */
export const UNDER = 0.3

/** The hole the burn comes in by, in the upstream wall: half its width. Its head is the floor's underside. */
export const INLET_HALF = 0.62

/** The hole it leaves by, in the downstream wall: half its width, and how far back under the floor the wheel's room reaches. */
export const OUTLET_HALF = 0.95
export const ROOM_BACK   = -0.55

/** The door, in the upstream wall: where along it, half its width, and its height. */
export const DOOR      = MILL_DOOR
export const DOOR_HALF = 0.56
export const DOOR_TOP  = COURSE * 4

/**
 * The wheel, a tirl: an upright shaft with flat blades round its foot, lying
 * in the water under the floor and turning the stone over it. Where its
 * shaft stands, across the ridge; how far its blades reach; how many; their
 * height; and how far over the bed their feet turn.
 */
export const TIRL = { across: 0.42, radius: 0.84, blades: 8, tall: 0.46, clear: 0.2 } as const

/** How fast the wheel turns, in radians a second: the click of the stone is once a turn. */
export const TURN = 2.1
