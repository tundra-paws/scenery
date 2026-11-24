// src/world/shared/height-map.ts
import * as THREE from 'three'

import type { Ground } from './ground.ts'
import type { HeightGrid } from './height-grid.ts'

/** The land's height above the water, as something a shader can look up. */
export interface HeightMap {

  /** One channel, in world units: positive on land, negative under the water. */
  texture: THREE.DataTexture

  /** World position to texture coordinate: `uv = xz * scale + 0.5`. */
  scale: number
}

/**
 * Pack the height grid into a texture, one texel a grid corner.
 *
 * It is the terrain's own grid, so a linear lookup returns what the terrain
 * mesh draws rather than the function behind it, and a shader that asks where
 * the land breaks the surface gets the edge that is in the picture. Beyond the
 * grid the lookup holds its last texel, which is the sea floor.
 */
export function createHeightMap (ground: Ground, { segments, side, heights }: HeightGrid): HeightMap {
  const data = new Uint16Array(side * side)

  for (let index = 0; index < data.length; index += 1)
    data[index] = THREE.DataUtils.toHalfFloat(heights[index]! - ground.waterLevel)

  // Half floats, because that is the float format every WebGL2 device filters.
  const texture = new THREE.DataTexture(data, side, side, THREE.RedFormat, THREE.HalfFloatType)

  texture.name        = 'height-map'
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return { texture, scale: segments / (side * ground.size) }
}

// perf: cheap — one single-channel texture of 97, 161 or 225 texels a side
// (19 KB to 101 KB), packed once from the grid the world already holds.
