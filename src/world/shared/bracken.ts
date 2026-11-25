// src/world/shared/bracken.ts
import { createNoise2D, smoothstep } from 'threejs-scenes/primitives'

import type { Burn } from './burn.ts'
import type { Ground } from './ground.ts'
import type { Infield } from './infield.ts'
import { MOOR_FOOT } from './moor.ts'
import type { Moor } from './moor.ts'
import type { Path } from './path.ts'

/**
 * Height over the water between which the bracken comes in off the shore's
 * turf, and the part of the relief between which it gives the hill up. Above
 * the head-dyke it holds only the grass between the heather's patches
 * (`HEATH`), so the two never stand together.
 */
const FOOT = [ 1.6, 3.2 ] as const
const TOP  = [ MOOR_FOOT + 0.08, MOOR_FOOT + 0.16 ] as const

/** The heather's share at which bracken starts to give way to it, and by which it is gone. */
const HEATH = [ 0.02, 0.2 ] as const

/** Bracken wants a drained slope: none on the flats, thinning again where it steepens toward rock. */
const DRAINED = [ 0.025, 0.08 ] as const
const SCREE   = [ 0.32, 0.46 ] as const

/** The size of a bed, as the noise's frequency, how much of the band is in beds, and how ragged a bed's edge is. */
const PATCH  = 0.045
const COVER  = -0.12
const FRINGE = 0.3

/** How far it keeps from the path's middle, from the field's dyke, and from the burn's water. Feet, a plough and wet ground keep it down. */
const OFF_PATH  = 2.6
const OFF_FIELD = 1.5
const OFF_BURN  = 2

/** What the rule keeps off: the worked ground and the ways over it. */
export interface Kept {
  moor:    Moor
  path:    Path
  infield: Infield
  burn:    Burn
}

/**
 * The bracken on the lower hill: where it grows, as a share from none to all.
 *
 * The back end of the year has turned it the colour of rust. One rule, like
 * the heather's, that the land's colour and the fronds standing on it both
 * read: on the drained slopes between the shore's turf and the moor, in beds
 * with grazing between them, never on the flats, the path, the field or the
 * burn's wet edge.
 */
export interface Bracken {
  brackenAt (x: number, z: number, height: number, slope: number): number
}

export function createBracken (ground: Ground, seed: number, { moor, path, infield, burn }: Kept): Bracken {
  const noise = createNoise2D(seed + 13)

  return {
    brackenAt (x, z, height, slope) {
      const above = height - ground.waterLevel
      const band  = smoothstep(FOOT[0], FOOT[1], above) * (1 - smoothstep(TOP[0], TOP[1], above / ground.relief))

      if (band <= 0)
        return 0

      const lie = smoothstep(DRAINED[0], DRAINED[1], slope) * (1 - smoothstep(SCREE[0], SCREE[1], slope))

      if (lie <= 0)
        return 0

      const bed = smoothstep(COVER, COVER + FRINGE, noise.fbm(x * PATCH, z * PATCH, 3))

      if (bed <= 0 || infield.inField(x, z))
        return 0

      const heath = 1 - smoothstep(HEATH[0], HEATH[1], moor.heatherAt(x, z, height, slope))

      if (heath <= 0)
        return 0

      const kept = smoothstep(OFF_PATH, OFF_PATH + 2, path.distanceTo(x, z)) *
        smoothstep(OFF_FIELD, OFF_FIELD + 1, infield.distanceTo(x, z)) *
        smoothstep(OFF_BURN, OFF_BURN + 1.5, burn.distanceTo(x, z))

      return band * lie * bed * heath * kept
    },
  }
}

// perf: cheap — two three-octave noises and, inside a bed, three distances, asked
// once a terrain vertex and once a candidate clump at build.
