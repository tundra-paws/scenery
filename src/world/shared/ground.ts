// src/world/shared/ground.ts
import { createNoise3D, smoothstep } from 'threejs-scenes/primitives'

/** World height of the sea at high water: the level everything on the island was placed against. */
export const HIGH_WATER = 0

/** How far below the water the sea floor sits at the rim. */
const SHELF = 7

/**
 * Depth of water from which the sea shows nothing of what is under it.
 *
 * A promise two features share: the water draws itself opaque and at its
 * darkest from here down, and the terrain does not build the floor below it.
 * Less than `SHELF`, so the open sea past the land's own square is that deep
 * all the way round and the square never shows.
 */
export const DEEP_WATER = 5

/** Sample spacing for the slope's finite difference. */
const EPSILON = 0.5

/**
 * The shape of the land as a function, not as a mesh.
 *
 * DOM-free and GPU-free on purpose: the terrain mesh samples it, scatterers ask
 * it where they may stand, the camera walks on it, and the tests call it in a
 * plain runtime with no canvas anywhere.
 */
export interface Ground {

  /** Edge length of the square the land is defined on, centred on the origin. */
  readonly size: number

  /** Rough height of the tallest ground above the water. */
  readonly relief: number

  /** World height of the water surface at high water. The tide falls from here (`shared/tide.ts`). */
  readonly waterLevel: number
  heightAt (x: number, z: number): number

  /** 0 on flat ground, approaching 1 on a cliff. */
  slopeAt (x: number, z: number): number
}

interface GroundOptions {
  seed:        number
  size?:       number
  relief?:     number
  waterLevel?: number
}

export function createGround ({ seed, size = 260, relief = 40, waterLevel = HIGH_WATER }: GroundOptions): Ground {
  const noise = createNoise3D(seed)
  const half  = size / 2

  function heightAt (x: number, z: number): number {
    // An island: full height inland, sinking under the water toward the rim, so
    // the land never ends in a visible edge.
    const rim    = Math.hypot(x, z) / half
    const island = 1 - smoothstep(0.3, 0.98, rim)

    const hills = noise.fbm(x * 0.011, 0.5, z * 0.011, 4)
    const ridge = noise.ridged(x * 0.0055, 3.7, z * 0.0055, 3)
    const land  = 0.2 + 0.42 * hills + 0.78 * ridge * ridge

    return waterLevel + land * relief * island - SHELF * (1 - island)
  }

  function slopeAt (x: number, z: number): number {
    const dx = heightAt(x + EPSILON, z) - heightAt(x - EPSILON, z)
    const dz = heightAt(x, z + EPSILON) - heightAt(x, z - EPSILON)

    // The surface normal is (-dx, 2e, -dz) normalised; its y is how level it is.
    return 1 - 2 * EPSILON / Math.hypot(dx, 2 * EPSILON, dz)
  }

  return { size, relief, waterLevel, heightAt, slopeAt }
}
