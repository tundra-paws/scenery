// src/world/features/infield/index.ts
import * as THREE from 'three'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { disposeInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import type { Feature, World } from '../../world.ts'
import { sowBarley } from './barley.ts'
import { layDyke } from './dyke.ts'
import { hangGate } from './gate.ts'
import { ploughRigs } from './rigs.ts'


/** A mesh that owns its geometry and its one material, unhooked. */
function free (mesh: THREE.Mesh | null): void {
  mesh?.geometry.dispose()

  if (mesh?.material instanceof THREE.Material)
    mesh.material.dispose()

  mesh?.removeFromParent()
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
  let dyke: THREE.InstancedMesh | null   = null
  let rigs: THREE.Mesh | null            = null
  let gate: THREE.Mesh | null            = null
  let barley: THREE.InstancedMesh | null = null

  return {
    name: 'infield',

    build ({ scene, rng }) {
      const { ground, grid, infield, shelter, wind } = world

      const stone = new THREE.MeshStandardMaterial({ name: 'infield-stone', flatShading: true, roughness: 1, metalness: 0 })
      const earth = new THREE.MeshStandardMaterial({
        name:                'infield-rigs',
        vertexColors:        true,
        flatShading:         true,
        roughness:           1,
        metalness:           0,
        polygonOffset:       true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits:  -2,
      })
      const wood = new THREE.MeshStandardMaterial({ name: 'infield-gate', color: PALETTE.timber, flatShading: true, roughness: 0.95, metalness: 0 })

      shadeUnderClouds(stone, world)
      shadeUnderClouds(earth, world)
      shadeUnderClouds(wood, world)

      // A phone gets the same stones with fewer facets: there are hundreds of them.
      const detail = world.quality.tier === 'mobile' ? 0 : 1

      dyke = layDyke(createStoneGeometry(rng.fork('infield:shape').int(1, 1_000_000), detail), stone, rng.fork('infield:lay'), ground, infield)

      const field = ploughRigs(earth, rng.fork('infield:rigs'), ground, grid, infield, wind)
      const ears  = new THREE.MeshStandardMaterial({ name: 'infield-barley', roughness: 1, metalness: 0, side: THREE.DoubleSide })

      shadeUnderClouds(ears, world)

      rigs   = field.mesh
      barley = sowBarley(field.ears, ears, rng.fork('infield:barley'), world.quality.tier, wind)
      gate   = hangGate(ground, infield.gates[0]!, shelter, wood)

      scene.add(dyke, rigs, barley, gate)
    },

    dispose () {
      disposeInstances(dyke)
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

// perf: cheap — four draw calls and two shadow passes: the dyke's stones
// (`dyke.ts`), the rigs (`rigs.ts`), the barley on them (`barley.ts`) and
// the gate (`gate.ts`). Built once; the barley's sway is in its shaders.
