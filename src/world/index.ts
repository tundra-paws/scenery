// src/world/index.ts
import { createAurora } from './features/aurora/index.ts'
import { createBeyond } from './features/beyond/index.ts'
import { createBoat } from './features/boat/index.ts'
import { createBurnFeature } from './features/burn/index.ts'
import { createCairn } from './features/cairn/index.ts'
import { createClouds } from './features/clouds/index.ts'
import { createEnvironment } from './features/environment/index.ts'
import { createFlockFeature } from './features/flock/index.ts'
import { createGrass } from './features/grass/index.ts'
import { createInfieldFeature } from './features/infield/index.ts'
import { createMillFeature } from './features/mill/index.ts'
import { createPierFeature } from './features/pier/index.ts'
import { createRocks } from './features/rocks/index.ts'
import { createShelterFeature } from './features/shelter/index.ts'
import { createSkerryFeature } from './features/skerry/index.ts'
import { createStarlingsFeature } from './features/starlings/index.ts'
import { createTerrain } from './features/terrain/index.ts'
import { createTufts } from './features/tufts/index.ts'
import { createWashingFeature } from './features/washing/index.ts'
import { createWaymarks } from './features/waymarks/index.ts'
import { createWoodFeature } from './features/wood/index.ts'
import { createYardFeature } from './features/yard/index.ts'
import { createWater } from './features/water/index.ts'
import type { Feature, World } from './world.ts'


/**
 * The world, as an ordered list of features.
 *
 * This is the composition root: a feature exists in the world when it is in
 * this list, and it is built, updated and disposed in this order. `environment`
 * stays first because it settles the renderer's shadow configuration before any
 * other feature creates a material. `water` comes last: it breaks round what
 * the others stood in it (`world.wash`), so it is built once they have.
 * `washing` comes before `flock`, which grazes round what is laid on the
 * land before it (`world.clutter`), as `rocks` does.
 *
 * Adding to the world is adding a folder under `features/` and one line here.
 * Removing from it is the reverse.
 */
export function createFeatures (world: World): Feature[] {
  return [
    createEnvironment(world),
    createClouds(world),
    createAurora(world),
    createBeyond(world),
    createTerrain(world),
    createRocks(world),
    createTufts(world),
    createGrass(world),
    createCairn(world),
    createWaymarks(world),
    createBurnFeature(world),
    createMillFeature(world),
    createShelterFeature(world),
    createInfieldFeature(world),
    createYardFeature(world),
    createWoodFeature(world),
    createWashingFeature(world),
    createFlockFeature(world),
    createBoat(world),
    createPierFeature(world),
    createSkerryFeature(world),
    createStarlingsFeature(world),
    createWater(world),
  ]
}
