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
 * the path on foot, past the shelter, to the cairn; round to look back over
 * the way up and out to sea; over the summit, and out over the water until
 * the whole island is in the frame; then round it: the western beach, the
 * northern cove, the ridge, the eastern shore, in to the edge of the wood
 * where the stumps and the stacked logs are, close under the shelter with
 * the cairn over it, back down to the water beside the boat at its anchor,
 * and last off the beach below the field, looking up its rigs to the gate
 * and the house, each stop a little further out until `hero` again.
 *
 * The loop is also a day (`shared/daylight.ts`), so the order is the hours
 * too. `hero` is the last of the afternoon, the landing is sunset, the walk
 * up is dusk, `climb` the first stars, `seaward` the moon on the water,
 * `summit` and `island` the night, `shore` and `cove` first light and
 * sunrise, `ridge` the morning, and the rest the day going round to gold
 * again. Every postcard is taken at second ten, in the evening light: the
 * hour a stop has on the tour is for the visitor who stays.
 *
 * The tour lifts itself over the land between two views, but it looks best
 * when neighbours in this list are neighbours on the island too, and when no
 * leg has to turn the camera right round: a view looking east followed by one
 * looking west wants a third between them. A leg that is a long way round
 * can be given its own time (`travel`); the day is then that much longer.
 * A short hop can be given less: `wood` stands between `east` and `shelter`
 * on time taken from the three legs round it, and `infield` between `boat`
 * and `hero` on the one leg it splits, so the day is the length it was and
 * every stop before them keeps its hour.
 */
export const VIEWS: readonly View[] = [
  { name: 'hero', at: [ 84, 104 ], height: 5, look: [ 6, 34 ], lookHeight: 12 },
  { name: 'landing', at: [ 56.3, 103.3 ], height: 2.4, look: [ 36, 74 ], lookHeight: 3, walk: true },
  { name: 'climb', at: [ 31.3, 45.5 ], height: 3, look: [ 14, 58 ], lookHeight: 5 },
  { name: 'seaward', at: [ 28, 42 ], height: 4, look: [ 60, 92 ], lookHeight: 25, travel: 18 },
  { name: 'summit', at: [ 2, 86 ], height: 28, look: [ 28, -40 ], lookHeight: 4 },
  { name: 'island', at: [ 150, 150 ], height: 40, look: [ 10, 20 ], lookHeight: 10, travel: 22 },
  { name: 'shore', at: [ -86, 40 ], height: 2.6, look: [ -184, 14 ], lookHeight: 9 },
  { name: 'cove', at: [ -38, -104 ], height: 4.5, look: [ 4, -12 ], lookHeight: 9 },
  { name: 'ridge', at: [ 8, -34 ], height: 13, look: [ 58, 62 ], lookHeight: 3 },
  { name: 'east', at: [ 112, 52 ], height: 9, look: [ 18, 50 ], lookHeight: 8, travel: 8 },
  { name: 'wood', at: [ 74, 66 ], height: 3.2, look: [ 59, 50 ], lookHeight: 3, travel: 7 },
  { name: 'shelter', at: [ 64, 73 ], height: 7, look: [ 50, 58 ], lookHeight: 4, travel: 10 },
  { name: 'boat', at: [ 75, 92 ], height: 2.4, look: [ 48, 86.5 ], lookHeight: 6, travel: 5 },
  { name: 'infield', at: [ 70, 87 ], height: 4, look: [ 53, 69 ], lookHeight: 4, travel: 5 },
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

  /** Seconds the tour takes to fly from this view to the next, where the usual time would hurry it, or dawdle over a few strides. */
  travel?: number
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
