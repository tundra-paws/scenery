// src/world/features/grass/index.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import type { Feature, World } from '../../world.ts'
import { REACH, createBladeGeometry, growGrass, patchCentre } from './blades.ts'
import { createSward } from './sward.ts'

/** Module-scope scratch, so finding the patch allocates nothing. */
const forward = new THREE.Vector3()

/**
 * The grass itself: tens of thousands of blades, standing in the turf
 * wherever the camera is.
 *
 * The tufts are plants, a few thousand of them, placed once over the whole
 * island. This is the sward they stand in: every blade a single triangle,
 * rooted on the land, leaning and shivering in the island's one wind, thick
 * in the meadow and thin on the dry tops, gone where there is heather, rock,
 * sand, a way, a wall or the burn. It is not planted anywhere: the same
 * blades are gathered in a patch of ground ahead of whoever is looking, and
 * shrink to nothing at its rim, so close to there is always grass and far
 * off there is the land's own texture, which is the same colours. Where the
 * patch holds no grass at all (the camera is out on the water, or over sand
 * or heather) not one blade is sent to be drawn.
 */
export function createGrass (world: World): Feature {
  const centre = new THREE.Vector2()

  let mesh: THREE.Mesh | null         = null
  let sward: THREE.DataTexture | null = null

  return {
    name: 'grass',

    build ({ scene, rng }) {
      const { tier } = world.quality
      const map      = createSward(world)
      const material = createLitMaterial(world, { name: 'grass', flatShading: false, side: THREE.DoubleSide })

      material.sheds()

      growGrass(material, { sward: map, wind: world.wind, tier, centre })

      sward              = map.texture
      mesh               = new THREE.Mesh(createBladeGeometry(tier, rng.fork('grass:blades')), material)
      mesh.name          = 'grass'
      mesh.receiveShadow = true
      mesh.frustumCulled = false

      // The patch is gathered for the camera that is about to draw it, and
      // drawn only if grass grows somewhere in it: from `hero`, out on the
      // water, every blade used to be sent and shrunk to nothing.
      mesh.onBeforeRender = (_renderer, _scene, camera, geometry) => {
        patchCentre(camera, tier, forward, centre)
        geometry.setDrawRange(0, map.growsNear(centre.x, centre.y, REACH[tier]) ? Infinity : 0)
      }

      // The sea gives back the meadow's colour from the land under the blades.
      keepOutOfMirror(mesh)
      scene.add(mesh)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      sward?.dispose()
      mesh?.removeFromParent()
      mesh  = null
      sward = null
    },
  }
}

// perf: one draw call and one texture (`sward.ts`, `blades.ts`): a triangle a
// blade, the same number every frame wherever there is grass in the patch,
// and none where there is not (the draw call is still made, of nothing).
