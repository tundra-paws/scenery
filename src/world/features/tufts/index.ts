// src/world/features/tufts/index.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { QualityTier } from 'threejs-scenes'
import { createNoise3D } from 'threejs-scenes/primitives'

import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import type { Feature, World } from '../../world.ts'


const COUNT: Record<QualityTier, number> = { mobile: 900, desktop: 2600, highEnd: 4200 }

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** One tuft: three open cones leaning apart. Nine triangles. */
function createTuftGeometry (): THREE.BufferGeometry {
  const blades = [ -0.45, 0, 0.45 ].map((lean, index) => {
    const blade = new THREE.ConeGeometry(0.09, 0.8, 3, 1, true)

    blade.translate(0, 0.4, 0)
    blade.rotateZ(lean)
    blade.rotateY(index * 2.1)

    return blade
  })

  const merged = mergeGeometries(blades)

  for (const blade of blades)
    blade.dispose()

  // Every normal points straight up, so a tuft is lit like the ground it
  // stands on. Left with its own normals, half of each blade faces away from
  // the sun and a meadow reads as a field of black spikes.
  const normal = merged.getAttribute('normal')

  for (let index = 0; index < normal.count; index += 1)
    normal.setXYZ(index, 0, 1, 0)

  merged.computeBoundingBox()
  merged.computeBoundingSphere()

  return merged
}

/** Grass tufts on the gentle, low ground: one instanced mesh, in patches. */
export function createTufts (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null

  return {
    name: 'tufts',

    build ({ scene, rng }) {
      const { ground } = world
      const place      = rng.fork('tufts:place')
      const patches    = createNoise3D(rng.fork('tufts:patches').int(1, 1_000_000))

      const spots = scatterOnGround({
        ground,
        rng:   place,
        count: COUNT[world.quality.tier],

        accept (spot) {
          const above = spot.height - ground.waterLevel

          // Above the sand, below the bare tops, off the steep ground, and only
          // where the patch noise says grass grows: an even carpet reads as
          // texture, clumps read as plants.
          return above > 1.1 &&
            above < ground.relief * 0.5 &&
            spot.slope < 0.2 &&
            patches.fbm(spot.x * 0.03, 9.1, spot.z * 0.03, 2) > -0.08
        },
      })

      const geometry = createTuftGeometry()

      const material = new THREE.MeshStandardMaterial({
        name:      'tuft',
        roughness: 1,
        metalness: 0,
        side:      THREE.DoubleSide,
      })

      mesh = new THREE.InstancedMesh(geometry, material, spots.length)
      mesh.name          = 'tufts'
      mesh.receiveShadow = true

      spots.forEach((spot, index) => {
        const size = place.range(0.7, 1.7)

        dummy.position.set(spot.x, spot.height - 0.05, spot.z)
        dummy.rotation.set(0, place.range(0, Math.PI * 2), 0)
        dummy.scale.set(size, size * place.range(0.8, 1.4), size)
        dummy.updateMatrix()

        mesh!.setMatrixAt(index, dummy.matrix)
        mesh!.setColorAt(index, tint.set(place.next() < 0.3 ? PALETTE.grassDry : PALETTE.grass).offsetHSL(0, 0, place.range(-0.05, 0.08)))
      })

      mesh.instanceMatrix.needsUpdate = true

      if (mesh.instanceColor)
        mesh.instanceColor.needsUpdate = true

      mesh.computeBoundingSphere()
      scene.add(mesh)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      mesh?.removeFromParent()
      mesh?.dispose()
      mesh = null
    },
  }
}

// perf: cheap — one draw call, no shadow pass. Nine triangles a tuft: 8k on the
// mobile tier, 23k on desktop. Placed once; nothing per frame.
