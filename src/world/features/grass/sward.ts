// src/world/features/grass/sward.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { smoothstep } from 'threejs-scenes/primitives'

import { distanceToSpan } from '../../shared/path.ts'
import type { Waypoint } from '../../shared/path.ts'
import type { World } from '../../world.ts'

/** Texels a side of the map of where grass grows. A texel is about a pace. */
const SIDE: Record<QualityTier, number> = { mobile: 160, desktop: 256, highEnd: 320 }

/** Height over the water between which the turf begins, and the slope between which it gives way to rock. */
const TURF  = [ 1.25, 2.3 ] as const
const SCREE = [ 0.15, 0.25 ] as const

/** How much heather it takes to crowd the grass out, from and to. */
const HEATH = [ 0.2, 0.5 ] as const

/** Clear ground, from and to, kept from the middle of the path, a side way, the house, a wall, and the burn's bank. */
const OFF_PATH  = [ 1.5, 2.5 ] as const
const OFF_WAY   = [ 0.7, 1.4 ] as const
const OFF_HOUSE = [ 0.4, 1 ] as const
const OFF_DYKE  = [ 0.45, 0.9 ] as const
const OFF_BANK  = [ 0.2, 0.8 ] as const

/** How much thinner the grass is on the dry tops than in the meadow, and the part of the relief between which it thins. */
const THIN = 0.55
const DRY  = [ 0.35, 0.6 ] as const

/** Edge of a square of the coarse map that says whether any grass grows in it at all. */
const PLOT = 2

/** Where grass grows, and the land it grows on, as something a vertex shader can look up. */
export interface Sward {

  /** Two channels: red the drawn land's world height, green how thick the grass is there, 0 to 1. */
  texture: THREE.DataTexture

  /** World position to texture coordinate: `uv = xz * scale + 0.5`. */
  scale: number

  /** Whether any grass at all grows within `reach` of a place: out on the water, none does. */
  growsNear (x: number, z: number, reach: number): boolean
}

/** How far a place is from a line of points. */
function distanceToLine (x: number, z: number, line: readonly Waypoint[]): number {
  let nearest = Infinity

  for (let index = 1; index < line.length; index += 1)
    nearest = Math.min(nearest, distanceToSpan(x, z, line[index - 1]!, line[index]!))

  return nearest
}

/** How thick the grass grows at a place, 0 to 1: the meadow's own rule, cheapest question first. */
function thickness (world: World, x: number, z: number, height: number): number {
  const { ground, moor, path, shelter, infield, burn, mill, yard } = world
  const above                                                      = height - ground.waterLevel
  const turf                                                       = smoothstep(TURF[0], TURF[1], above)

  if (turf <= 0 || infield.inField(x, z))
    return 0

  const slope = ground.slopeAt(x, z)
  const open  = turf * (1 - smoothstep(SCREE[0], SCREE[1], slope)) * (1 - smoothstep(HEATH[0], HEATH[1], moor.heatherAt(x, z, height, slope)))

  if (open <= 0)
    return 0

  return open *
    (1 - THIN * smoothstep(DRY[0], DRY[1], above / ground.relief)) *
    smoothstep(OFF_PATH[0], OFF_PATH[1], path.distanceTo(x, z)) *
    smoothstep(OFF_WAY[0], OFF_WAY[1], Math.min(shelter.distanceToSpur(x, z), mill.distanceToSpur(x, z), yard.distanceToSpur(x, z), distanceToLine(x, z, infield.track))) *
    smoothstep(OFF_HOUSE[0], OFF_HOUSE[1], Math.min(shelter.distanceTo(x, z), mill.distanceTo(x, z), yard.distanceTo(x, z))) *
    smoothstep(OFF_DYKE[0], OFF_DYKE[1], infield.distanceTo(x, z)) *
    smoothstep(OFF_BANK[0], OFF_BANK[1], burn.distanceTo(x, z) - burn.pool.half)
}

/**
 * The sward: one picture of the island that says, a pace at a time, how high
 * the drawn land is and how thick the grass grows on it.
 *
 * The blades of grass are not placed: each is put where it belongs by the
 * vertex shader, round wherever the camera is (`blades.ts`), so the shader
 * has to be able to ask the land. Grass grows on the turf, above the sand
 * and off the rock; thins on the dry tops; gives way to the heather; and is
 * worn off every way, wall foot and bank, as the tufts are.
 */
export function createSward (world: World): Sward {
  const { ground, grid } = world
  const side             = SIDE[world.quality.tier]
  const data             = new Uint16Array(side * side * 2)

  // The same answer much coarser, for the feature to ask before it draws: a
  // plot is green if any texel in it is.
  const plots = Math.ceil(ground.size / PLOT)
  const green = new Uint8Array(plots * plots)
  const plot  = (at: number): number => Math.min(plots - 1, Math.max(0, Math.floor((at + ground.size / 2) / PLOT)))

  for (let row = 0; row < side; row += 1)
    for (let column = 0; column < side; column += 1) {
      const x      = ((column + 0.5) / side - 0.5) * ground.size
      const z      = ((row + 0.5) / side - 0.5) * ground.size
      const height = grid.heightAt(x, z)
      const thick  = thickness(world, x, z, height)
      const at     = (row * side + column) * 2

      data[at]     = THREE.DataUtils.toHalfFloat(height)
      data[at + 1] = THREE.DataUtils.toHalfFloat(thick)

      if (thick > 0)
        green[plot(z) * plots + plot(x)] = 1
    }

  // Half floats, because that is the float format every WebGL2 device filters.
  const texture = new THREE.DataTexture(data, side, side, THREE.RGFormat, THREE.HalfFloatType)

  texture.name        = 'sward'
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return {
    texture,
    scale: 1 / ground.size,

    growsNear (x, z, reach) {
      // A texel's grass is filtered a texel further out than it was asked.
      const far = reach + ground.size / side

      for (let row = plot(z - far); row <= plot(z + far); row += 1)
        for (let column = plot(x - far); column <= plot(x + far); column += 1) {
          if (green[row * plots + column] === 0)
            continue

          // The nearest point of this plot to the place.
          const nx = Math.min(Math.max(x, column * PLOT - ground.size / 2), (column + 1) * PLOT - ground.size / 2)
          const nz = Math.min(Math.max(z, row * PLOT - ground.size / 2), (row + 1) * PLOT - ground.size / 2)

          if (Math.hypot(nx - x, nz - z) < far)
            return true
        }

      return false
    },
  }
}

// perf: once — a drawn-land lookup a texel (26k to 102k), and for the third
// of them that are turf a slope, the moor's noise and the distances to the
// ways, walls and burn. One two-channel half-float texture, 100 KB to 410 KB.
// `growsNear` reads a few hundred bytes a frame, of a map of 17k plots.
