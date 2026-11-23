// src/world/world.ts
import type { QualitySettings } from 'threejs-scenes'
import type { AppModule } from 'threejs-scenes/core'

import { createGround } from './shared/ground.ts'
import type { Ground } from './shared/ground.ts'


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
 * over, and which must therefore be one function they all share.
 */
export interface World {
  seed:    number
  quality: QualitySettings
  ground:  Ground
}

interface WorldOptions {
  seed:    number
  quality: QualitySettings
}

export function createWorld ({ seed, quality }: WorldOptions): World {
  return { seed, quality, ground: createGround({ seed }) }
}
