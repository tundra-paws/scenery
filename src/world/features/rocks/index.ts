// src/world/features/rocks/index.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import type { Feature, World } from '../../world.ts'


const COUNT: Record<QualityTier, number> = { mobile: 60, desktop: 140, highEnd: 220 }

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** Boulders along the shore and on the slopes: one instanced mesh. */
export function createRocks (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null

  return {
    name: 'rocks',

    build ({ scene, rng }) {
      const { ground } = world
      const place      = rng.fork('rocks:place')
      const shape      = rng.fork('rocks:shape')

      const spots = scatterOnGround({
        ground,
        rng:    place,
        count:  COUNT[world.quality.tier],
        accept: spot => spot.height > ground.waterLevel - 0.4 && spot.slope < 0.5,
      })

      const geometry = createStoneGeometry(shape.int(1, 1_000_000))
      const material = new THREE.MeshStandardMaterial({ name: 'rock', flatShading: true, roughness: 1, metalness: 0 })

      shadeUnderClouds(material, world)

      mesh = new THREE.InstancedMesh(geometry, material, spots.length)
      mesh.name          = 'rocks'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      spots.forEach((spot, index) => {
        const size = place.range(0.5, 2.6)

        // Sunk a little, so a boulder on a slope does not hover on its high side.
        dummy.position.set(spot.x, spot.height - size * 0.18, spot.z)
        dummy.rotation.set(place.range(-0.3, 0.3), place.range(0, Math.PI * 2), place.range(-0.3, 0.3))
        dummy.scale.set(size, size * place.range(0.7, 1.1), size * place.range(0.8, 1.2))
        dummy.updateMatrix()

        mesh!.setMatrixAt(index, dummy.matrix)
        mesh!.setColorAt(index, tint.set(PALETTE.rock).offsetHSL(0, 0, place.range(-0.07, 0.07)))
      })

      commitInstances(mesh)
      scene.add(mesh)
    },

    dispose () {
      disposeInstances(mesh)
      mesh = null
    },
  }
}

// perf: cheap — one draw call (two with its shadow pass), 80 triangles a rock:
// 5k on the mobile tier, 11k on desktop. Placed once; nothing per frame.
