// src/world/world.ts
import type { QualitySettings } from 'threejs-scenes'
import type { AppModule } from 'threejs-scenes/core'

import { createLands, createSkyline } from './shared/beyond.ts'
import type { Land } from './shared/beyond.ts'
import { createCloudShadow } from './shared/cloud-shadow.ts'
import { createClutter } from './shared/clutter.ts'
import type { Clutter } from './shared/clutter.ts'
import type { CloudShadow } from './shared/cloud-shadow.ts'
import { createDaylight } from './shared/daylight.ts'
import type { Daylight } from './shared/daylight.ts'
import { createGround } from './shared/ground.ts'
import type { Ground } from './shared/ground.ts'
import { GRID_SEGMENTS, createHeightGrid } from './shared/height-grid.ts'
import type { HeightGrid } from './shared/height-grid.ts'
import { createInfield } from './shared/infield.ts'
import type { Infield } from './shared/infield.ts'
import { createMoor } from './shared/moor.ts'
import type { Moor } from './shared/moor.ts'
import { createPath, findSummit } from './shared/path.ts'
import type { Path, Waypoint } from './shared/path.ts'
import { createShelter } from './shared/shelter.ts'
import type { Shelter } from './shared/shelter.ts'
import { createSkerry } from './shared/skerry.ts'
import type { Skerry } from './shared/skerry.ts'
import { createWash } from './shared/wash.ts'
import type { Wash } from './shared/wash.ts'
import { createWind } from './shared/wind.ts'
import type { Wind } from './shared/wind.ts'
import { createWood } from './shared/wood.ts'
import type { Wood } from './shared/wood.ts'


/**
 * One simulation step, in seconds.
 *
 * The clock is fixed, so the world advances in steps of exactly this size and
 * the time anything animates from is `frame.frame * STEP`. Never the wall clock:
 * a capture of frame 600 has to be the same picture today and next year.
 */
export const STEP = 1 / 60

/** The seed the published world is built from. `?seed=` overrides it for experiments. */
export const WORLD_SEED = 20_261_123

/** App state. Input writes it from outside the tick; modules only read it. */
export interface WorldState {

  /** Whether the visitor has taken the camera to walk or fly. */
  explore: boolean
}

/** A world feature: built once, updated every sim step, disposed at teardown. */
export type Feature = AppModule<WorldState>

/**
 * What every feature is handed at construction.
 *
 * `ctx` (scene, camera, renderer, rng) arrives later, in `build`. This is the
 * part that has to exist before any of that: the shape of the land, which the
 * terrain meshes, the scatterers place on, the water meets and the camera walks
 * over, and which must therefore be one function they all share. The same goes
 * for the air over it: one wind, one shadow from the clouds it carries, and
 * one hour of the day that the sky, the light and the sea all keep, under a
 * horizon with land on it.
 * And for what was made on it: the summit the cairn stands on, the one path
 * up to it, the shelter beside that path, and the walls round the ground
 * worked from it. And for what grows on it: the wood beside the shelter,
 * and the heather on the hill.
 * And for what stands in the sea, which the sea breaks round, and what lies
 * loose on the land, which the flock grazes round. And for the reef off
 * the east shore, its mark and its seals.
 */
export interface World {
  seed:    number
  quality: QualitySettings
  ground:  Ground

  /** `ground` sampled on the terrain's lattice, for what is drawn or looked up there. */
  grid:   HeightGrid
  wind:   Wind
  clouds: CloudShadow
  day:    Daylight

  /** The land on the horizon, which the sun goes down behind. */
  beyond: readonly Land[]

  /** The highest point of the land. */
  summit:  Waypoint
  path:    Path
  shelter: Shelter

  /** The field below the shelter, its dyke and gate, and the fold across the path. */
  infield: Infield
  wood:    Wood

  /** The heather on the hill above the worked ground, for the land's colour and the clumps on it. */
  moor: Moor

  /** The reef off the east shore, the mark on it and the seals hauled out there. */
  skerry: Skerry

  /** What stands in the sea and what floats on it, for the sea to break round. Filled in as the features are built. */
  wash: Wash

  /** What lies loose on the land (the boulders), for what is built after it to keep off. Filled in as the features are built. */
  clutter: Clutter
}

interface WorldOptions {
  seed:    number
  quality: QualitySettings
}

export function createWorld ({ seed, quality }: WorldOptions): World {
  const ground  = createGround({ seed })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const beyond  = createLands(seed)
  const shelter = createShelter(ground, path)
  const wind    = createWind()

  return {
    seed,
    quality,
    ground,
    summit,
    path,
    grid:    createHeightGrid(ground, GRID_SEGMENTS[quality.tier]),
    wind,
    clouds:  createCloudShadow(wind),
    beyond,
    day:     createDaylight(createSkyline(beyond)),
    shelter,
    infield: createInfield(shelter),
    wood:    createWood({ ground, summit, path, shelter }, seed),
    moor:    createMoor(ground, seed),
    skerry:  createSkerry(ground, seed, quality.tier),
    wash:    createWash(),
    clutter: createClutter(),
  }
}
