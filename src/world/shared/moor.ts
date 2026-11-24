// src/world/shared/moor.ts
import { createNoise2D, smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from './ground.ts'

/**
 * Where the heather starts and where it has the hill to itself, as fractions
 * of the land's relief above the water. The head-dyke runs at about a fifth:
 * under it the ground was worked and grazed close, and stays grass.
 */
export const MOOR_FOOT = 0.2

const FULL = 0.28

/** How steep the ground may get before the heather gives way to bare rock, from first thinning to gone. */
const SCREE = [ 0.3, 0.45 ] as const

/** The size of a patch of heather, as the noise's frequency, and how much of the hill is in patches. */
const PATCH  = 0.05
const COVER  = -0.1
const FRINGE = 0.4

/**
 * The hill's heather: where it grows, as a share from none to all of the ground.
 *
 * One rule that the land's colour and the clumps standing on it both read, so
 * the bloom is where the bushes are. Above the head-dyke's level, off the
 * cliffs, in patches with grass between them; on the tops nearly everywhere.
 */
export interface Moor {
  heatherAt (x: number, z: number, height: number, slope: number): number
}

export function createMoor (ground: Ground, seed: number): Moor {
  const noise = createNoise2D(seed + 7)

  return {
    heatherAt (x, z, height, slope) {
      const up = smoothstep(MOOR_FOOT, FULL, (height - ground.waterLevel) / ground.relief)

      if (up <= 0)
        return 0

      const patch = smoothstep(COVER, COVER + FRINGE, noise.fbm(x * PATCH, z * PATCH, 3) + up * 0.3)

      return up * patch * (1 - smoothstep(SCREE[0], SCREE[1], slope))
    },
  }
}

// perf: trivial — one three-octave noise a call, asked once a terrain vertex
// and once a candidate clump at build.
