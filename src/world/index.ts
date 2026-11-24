// src/world/index.ts
import { createCairn } from './features/cairn/index.ts'
import { createClouds } from './features/clouds/index.ts'
import { createEnvironment } from './features/environment/index.ts'
import { createRocks } from './features/rocks/index.ts'
import { createShelterFeature } from './features/shelter/index.ts'
import { createTerrain } from './features/terrain/index.ts'
import { createTufts } from './features/tufts/index.ts'
import { createWaymarks } from './features/waymarks/index.ts'
import { createWater } from './features/water/index.ts'
import type { Feature, World } from './world.ts'


/**
 * The world, as an ordered list of features.
 *
 * This is the composition root: a feature exists in the world when it is in
 * this list, and it is built, updated and disposed in this order. `environment`
 * stays first because it settles the renderer's shadow configuration before any
 * other feature creates a material.
 *
 * Adding to the world is adding a folder under `features/` and one line here.
 * Removing from it is the reverse.
 */
export function createFeatures (world: World): Feature[] {
  return [
    createEnvironment(world),
    createClouds(world),
    createTerrain(world),
    createWater(world),
    createRocks(world),
    createTufts(world),
    createCairn(world),
    createWaymarks(world),
    createShelterFeature(world),
  ]
}
