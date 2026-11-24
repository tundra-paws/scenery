// src/world/features/burn/index.ts
import * as THREE from 'three'

import { disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inWorld, stone } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { countStones, layStones } from './stones.ts'
import { createStreamGeometry, createStreamMaterial } from './water.ts'

/**
 * The burn: the island's fresh water.
 *
 * It rises at a spring under the cairn, in a basin someone kerbed with
 * stones and marked with one stood on end; comes down the gully on the brae
 * white where the land is steep; slows into a pool beside the fold, where
 * stepping stones cross its tail; goes under the head-dyke, falls again past
 * the lone birch, and spreads over the sand into the sea a few strides from
 * the landing. It is why the house, the fold and the landing are where they
 * are. Its course is the land's (`shared/burn.ts`); here are its water and
 * its stones.
 */
export function createBurnFeature (world: World): Feature {
  const time = { value: 0 }

  let water: THREE.Mesh | null           = null
  let stones: THREE.InstancedMesh | null = null

  return {
    name: 'burn',

    build ({ scene, rng }) {
      const { burn, ground, grid, quality } = world

      water      = new THREE.Mesh(createStreamGeometry(burn, grid), createStreamMaterial({ clouds: world.clouds, day: world.day, level: ground.waterLevel, time }))
      water.name = 'burn'

      // The island's stone, in the boulders' own material and grain, so the
      // two are one program: cut with few facets, for the grain carries them.
      const rock = createLitMaterial(world, { name: 'burn-stones' })

      rock.finish(stone(inWorld(quality.tier)))

      stones               = new THREE.InstancedMesh(createStoneGeometry(rng.fork('burn:shape').int(1, 1_000_000), 0), rock, countStones(burn, quality.tier))
      stones.name          = 'burn-stones'
      stones.receiveShadow = true

      layStones(stones, burn, ground, quality.tier, rng.fork('burn:lay'))

      // Small and many: a phone leaves them out of the sea's reflection.
      if (quality.tier === 'mobile')
        keepOutOfMirror(stones)

      scene.add(water, stones)
    },

    update (_state, frame) {
      time.value = frame.frame * STEP
    },

    dispose () {
      water?.geometry.dispose()

      if (water?.material instanceof THREE.Material)
        water.material.dispose()

      water?.removeFromParent()
      disposeInstances(stones)
      water  = null
      stones = null
    },
  }
}

// perf: cheap — two draw calls (four with the sea's mirror), no shadow pass:
// the water's 500 triangles and under 2k of stones. A step sets one number.
