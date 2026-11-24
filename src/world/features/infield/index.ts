// src/world/features/infield/index.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import { disposeInstances } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inItself, inWorld, stone as stonework, tilth, timber } from '../../shared/surface.ts'
import type { Feature, World } from '../../world.ts'
import { sowBarley } from './barley.ts'
import { layDyke } from './dyke.ts'
import type { Dyke } from './dyke.ts'
import { hangGate } from './gate.ts'
import { ploughRigs } from './rigs.ts'


/**
 * Where a wall goes into the sea: how often along it the sea is told, how
 * wide it is at the waterline, and how deep the water may be over its foot
 * before even its cope is under.
 */
const WADE = { every: 0.5, half: 0.42, drowned: 0.8 } as const


/** A mesh that owns its geometry and its one material, unhooked. */
function free (mesh: THREE.Mesh | null): void {
  mesh?.geometry.dispose()

  if (mesh?.material instanceof THREE.Material)
    mesh.material.dispose()

  mesh?.removeFromParent()
}

/** Tell the sea where the walls stand in it: the head-dyke runs down into it. */
function wade (world: World): void {
  const { ground, infield, wash } = world

  for (const run of infield.runs)
    for (let index = 1; index < run.length; index += 1) {
      const from = run[index - 1]!
      const to   = run[index]!
      const span = Math.hypot(to.x - from.x, to.z - from.z)

      for (let along = 0; along <= span; along += WADE.every) {
        const x     = from.x + (to.x - from.x) * along / span
        const z     = from.z + (to.z - from.z) * along / span
        const depth = ground.waterLevel - ground.heightAt(x, z)

        if (depth > 0 && depth < WADE.drowned)
          wash.stand(x, z, WADE.half)
      }
    }
}

/**
 * The infield: the ground below the shelter that was dug and sown, walled
 * round with the stones that came out of it, and a fold for sheep across the
 * path from it.
 *
 * Still nobody: the barley stands in its rigs and the gate is open. The crop
 * answers the one wind with everything else, and the walls are the boulders'
 * shape, placed, like the cairn and the house.
 */
export function createInfieldFeature (world: World): Feature {
  let dyke: Dyke | null                  = null
  let rigs: THREE.Mesh | null            = null
  let gate: THREE.Mesh | null            = null
  let barley: THREE.InstancedMesh | null = null

  return {
    name: 'infield',

    build ({ scene, rng }) {
      const { ground, grid, infield, shelter, wind } = world

      const stone = createLitMaterial(world, { name: 'infield-stone' })
      const earth = createLitMaterial(world, {
        name:                'infield-rigs',
        vertexColors:        true,
        polygonOffset:       true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits:  -2,
      })
      const wood = createLitMaterial(world, { name: 'infield-gate', color: PALETTE.timber, roughness: 0.95 })

      // Each in its own grain: the dyke's stone where it lies, the rigs' earth
      // where it was turned (before the crop on it bows), the gate's boards along their rails.
      stone.finish(stonework(inWorld(world.quality.tier)))
      earth.finish(tilth(inItself(world.quality.tier)))
      wood.finish(timber(inItself(world.quality.tier)))

      // A phone gets the same stones with fewer facets: there are hundreds of them.
      const detail = world.quality.tier === 'mobile' ? 0 : 1

      const shape = rng.fork('infield:shape').int(1, 1_000_000)

      dyke = layDyke(createStoneGeometry(shape, detail), createStoneGeometry(shape, 0), stone, rng.fork('infield:lay'), ground, infield)

      const field = ploughRigs(earth, rng.fork('infield:rigs'), ground, grid, infield, wind)
      const ears  = createLitMaterial(world, { name: 'infield-barley', flatShading: false, side: THREE.DoubleSide })

      rigs   = field.mesh
      barley = sowBarley(field.ears, ears, rng.fork('infield:barley'), world.quality.tier, wind)
      gate   = hangGate(ground, infield.gates[0]!, shelter, wood)

      // The ears are many and small; in the sea the rigs' colour is enough.
      // A phone leaves the walls' hundreds of stones out of it too.
      keepOutOfMirror(barley)

      if (world.quality.tier === 'mobile') {
        keepOutOfMirror(dyke.stones)
        keepOutOfMirror(dyke.cope)
      }

      wade(world)
      scene.add(dyke.stones, dyke.cope, rigs, barley, gate)
    },

    dispose () {
      disposeInstances(dyke?.stones ?? null)
      disposeInstances(dyke?.cope ?? null)
      disposeInstances(barley)
      free(rigs)
      free(gate)

      dyke = null
      rigs = null
      gate   = null
      barley = null
    },
  }
}

// perf: cheap — five draw calls and three shadow passes: the dyke's stones
// and its cope (`dyke.ts`), the rigs (`rigs.ts`), the barley on them (`barley.ts`) and
// the gate (`gate.ts`). Built once; the barley's sway is in its shaders.
