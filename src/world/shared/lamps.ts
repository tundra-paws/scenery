// src/world/shared/lamps.ts
import * as THREE from 'three'

import { elevationAt } from './daylight.ts'

/**
 * The sun's height, in degrees, at which the lamps that are only lit for the
 * night (the light at the pier's head, the boat's riding light) are lit in
 * the evening and put out in the morning, and how many degrees it takes to
 * bring one up to its full light: somebody trims the wick and turns it up.
 */
const LIT_AT = 1.2
const RAMP   = 1.4

/** How far up a lamp for the night is turned at `time`: nothing by day, all of it from a little after sunset to a little before sunrise. */
export function lampLevel (time: number): number {
  return THREE.MathUtils.clamp((LIT_AT - elevationAt(time)) / RAMP, 0, 1)
}

// perf: trivial — the sun's height, once a step for each lamp.
