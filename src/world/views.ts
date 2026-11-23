// src/world/views.ts
import type { Ground } from './shared/ground.ts'

/**
 * The postcards, in tour order.
 *
 * `hero` comes first and stays put: it is the frame every iteration is
 * photographed from, and the timelapse on the site only reads as one place
 * growing if that frame holds still. Add views freely; move `hero` only for a
 * reason worth breaking the timelapse over, and say so in the journal.
 */
export const VIEWS: readonly View[] = [
  { name: 'hero', at: [ 84, 104 ], height: 5, look: [ 6, 34 ], lookHeight: 12 },
  { name: 'shore', at: [ -96, 44 ], height: 2.6, look: [ -24, -6 ], lookHeight: 7 },
  { name: 'ridge', at: [ 8, -34 ], height: 13, look: [ 58, 62 ], lookHeight: 3 },
  { name: 'cove', at: [ -38, -104 ], height: 4.5, look: [ 4, -12 ], lookHeight: 9 },
]

/**
 * A named camera position: a postcard.
 *
 * Heights are measured above whatever is underneath (ground or water), not from
 * zero, so reshaping the land moves the camera with it instead of burying it.
 */
export interface View {
  name: string

  /** Where the camera stands, as [x, z]. */
  at: readonly [number, number]

  /** Camera height above the surface under it. */
  height: number

  /** What it looks at, as [x, z]. */
  look: readonly [number, number]

  /** Height of the look-at point above the surface under it. */
  lookHeight: number
}

/** A camera position and the point it looks at, in world space. */
export interface Pose {
  position: [number, number, number]
  target:   [number, number, number]
}

/** The surface a camera can stand over: the ground, or the water where the ground is under it. */
function surfaceAt (ground: Ground, x: number, z: number): number {
  return Math.max(ground.heightAt(x, z), ground.waterLevel)
}

export function resolveView (view: View, ground: Ground): Pose {
  const [ x, z ]   = view.at
  const [ lx, lz ] = view.look

  return {
    position: [ x, surfaceAt(ground, x, z) + view.height, z ],
    target:   [ lx, surfaceAt(ground, lx, lz) + view.lookHeight, lz ],
  }
}

export function findView (name: string): View | undefined {
  return VIEWS.find(view => view.name === name)
}
