// src/world/views.ts
import type { Ground } from './shared/ground.ts'

/**
 * The postcards, in tour order.
 *
 * `hero` comes first and stays put: it is the frame every iteration is
 * photographed from, and the timelapse on the site only reads as one place
 * growing if that frame holds still. Add views freely; move `hero` only for a
 * reason worth breaking the timelapse over, and say so in the journal.
 *
 * The order is a visit and then a circuit. In from the sea to the landing, up
 * the path on foot, past the shelter, to the cairn, and back out over the
 * water until the whole island is in the frame; then round it: the summit, the
 * western beach, the northern cove, the ridge, the eastern shore, where the
 * island stands against the sun, in close under the shelter, with its lamp
 * lit and the cairn over it, and last back down to the water beside the boat
 * at its anchor, each stop a little further out until `hero` again. The tour
 * lifts itself over the land between two views, but it looks best when
 * neighbours in this list are neighbours on the island too, and when no leg
 * has to turn the camera right round: a view looking east followed by one
 * looking west wants a third between them.
 */
export const VIEWS: readonly View[] = [
  { name: 'hero', at: [ 84, 104 ], height: 5, look: [ 6, 34 ], lookHeight: 12 },
  { name: 'landing', at: [ 56.3, 103.3 ], height: 2.4, look: [ 36, 74 ], lookHeight: 3, walk: true },
  { name: 'climb', at: [ 31.3, 45.5 ], height: 3, look: [ 14, 58 ], lookHeight: 5 },
  { name: 'island', at: [ 150, 150 ], height: 40, look: [ 10, 20 ], lookHeight: 10 },
  { name: 'summit', at: [ 2, 86 ], height: 28, look: [ 28, -40 ], lookHeight: 4 },
  { name: 'shore', at: [ -96, 44 ], height: 2.6, look: [ -24, -6 ], lookHeight: 7 },
  { name: 'cove', at: [ -38, -104 ], height: 4.5, look: [ 4, -12 ], lookHeight: 9 },
  { name: 'ridge', at: [ 8, -34 ], height: 13, look: [ 58, 62 ], lookHeight: 3 },
  { name: 'east', at: [ 112, 52 ], height: 9, look: [ 18, 50 ], lookHeight: 8 },
  { name: 'shelter', at: [ 64, 73 ], height: 7, look: [ 50, 58 ], lookHeight: 4 },
  { name: 'boat', at: [ 75, 92 ], height: 2.4, look: [ 48, 86.5 ], lookHeight: 6 },
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

  /**
   * The tour goes from this view to the next on foot instead of flying: to the
   * nearest point of the path, along it, and off it again to the next view.
   */
  walk?: true
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
