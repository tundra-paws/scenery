// src/world/features/water/wash.ts
import * as THREE from 'three'

import type { Footing } from '../../shared/wash.ts'


/** Texels a side. About one a unit over the island, which is finer than any stone's foam needs: the shader reads distances, and they interpolate. */
const SIDE = 256

/** The furthest from anything standing that the map tells apart. Past this the sea does not care. */
export const FAR = 4

/** How far from what stands in the water each point of the sea is, as a shader looks it up. */
export interface WashMap {

  /** One channel, in world units from the nearest footing's edge: negative inside it, `FAR` and over where there is nothing near. */
  texture: THREE.DataTexture

  /** World position to texture coordinate: `uv = xz * scale + 0.5`. */
  scale: number
}

/**
 * Lay out every footing in a distance map over the island.
 *
 * Each one touches only the texels within `FAR` of its edge, so the bake is a
 * few hundred thousand sums however many there are. Beyond the map the lookup
 * holds its border, where nothing stands.
 */
export function createWashMap (footings: readonly Footing[], span: number): WashMap {
  const distances = new Float32Array(SIDE * SIDE).fill(FAR)
  const texel     = span / SIDE

  for (const { x, z, radius } of footings) {
    const reach = radius + FAR
    const fromI = Math.max(0, Math.floor((x - reach) / texel + SIDE / 2))
    const toI   = Math.min(SIDE - 1, Math.ceil((x + reach) / texel + SIDE / 2))
    const fromJ = Math.max(0, Math.floor((z - reach) / texel + SIDE / 2))
    const toJ   = Math.min(SIDE - 1, Math.ceil((z + reach) / texel + SIDE / 2))

    for (let j = fromJ; j <= toJ; j += 1)
      for (let i = fromI; i <= toI; i += 1) {
        const index    = j * SIDE + i
        const distance = Math.hypot((i + 0.5 - SIDE / 2) * texel - x, (j + 0.5 - SIDE / 2) * texel - z) - radius

        if (distance < distances[index]!)
          distances[index] = distance
      }
  }

  const data = new Uint16Array(distances.length)

  for (let index = 0; index < data.length; index += 1)
    data[index] = THREE.DataUtils.toHalfFloat(distances[index]!)

  const texture = new THREE.DataTexture(data, SIDE, SIDE, THREE.RedFormat, THREE.HalfFloatType)

  texture.name        = 'wash-map'
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return { texture, scale: 1 / span }
}

// perf: cheap — one 256-texel half-float texture (128 KB), baked once from a
// few dozen discs; nothing per frame.
