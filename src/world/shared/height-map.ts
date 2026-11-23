// src/world/shared/height-map.ts
import * as THREE from 'three'

import type { Ground } from './ground.ts'

/** The land's height above the water, as something a shader can look up. */
export interface HeightMap {

  /** One channel, in world units: positive on land, negative under the water. */
  texture: THREE.DataTexture

  /** World position to texture coordinate: `uv = xz * scale + 0.5`. */
  scale: number
}

/**
 * Bake the ground function onto a grid of `segments` cells a side, one texel a
 * grid corner.
 *
 * Given the terrain's own grid, a linear lookup returns what the terrain mesh
 * draws rather than the function behind it, so a shader that asks where the
 * land breaks the surface gets the edge that is in the picture. Beyond the
 * grid the lookup holds its last texel, which is the sea floor.
 */
export function createHeightMap (ground: Ground, segments: number): HeightMap {
  const side = segments + 1
  const cell = ground.size / segments
  const half = ground.size / 2
  const data = new Uint16Array(side * side)

  for (let row = 0; row < side; row += 1)
    for (let column = 0; column < side; column += 1) {
      const height = ground.heightAt(column * cell - half, row * cell - half)

      data[row * side + column] = THREE.DataUtils.toHalfFloat(height - ground.waterLevel)
    }

  // Half floats, because that is the float format every WebGL2 device filters.
  const texture = new THREE.DataTexture(data, side, side, THREE.RedFormat, THREE.HalfFloatType)

  texture.name        = 'height-map'
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return { texture, scale: segments / (side * ground.size) }
}

// perf: cheap — one single-channel texture of 97, 161 or 225 texels a side
// (19 KB to 101 KB), filled once from a few thousand ground samples.
