// src/world/features/clouds/index.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createNoise3D } from 'threejs-scenes/primitives'

import { createCloudShadowTexture } from '../../shared/cloud-shadow.ts'
import type { Blot } from '../../shared/cloud-shadow.ts'
import { disposeInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { SUN } from '../../shared/sun.ts'
import type { Feature, World } from '../../world.ts'
import { PUFF_FLOOR, layOutClouds } from './layout.ts'
import { createCloudMaterial } from './material.ts'


/**
 * Clouds over the whole of the weather's square. A dozen or so are in sight at
 * once, most of them far off. The same on every tier: the sky is one thing,
 * and a phone that drew fewer would have their shadows fall somewhere else.
 */
const COUNT = 60

/** Texels a side of the picture the clouds' shadow is drawn from: eight world units each on a phone, four above. */
const SHADOW_SIDE: Record<QualityTier, number> = { mobile: 256, desktop: 512, highEnd: 512 }

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()

/**
 * One puff: an icosahedron, barely lumpy, cut flat underneath.
 *
 * The stone's recipe with the noise turned down. A cloud should read as soft
 * from the same facets a boulder reads as hard from, and the flat cut is what
 * makes a heap of them a cumulus and not a rock in the sky.
 */
function createPuffGeometry (seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const noise    = createNoise3D(seed)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const x    = position.getX(index)
    const y    = position.getY(index)
    const z    = position.getZ(index)
    const bump = 1 + noise.sample(x * 1.1, y * 1.1, z * 1.1) * 0.14

    position.setXYZ(index, x * bump, Math.max(y * bump, -PUFF_FLOOR), z * bump)
  }

  geometry.computeVertexNormals()

  return geometry
}

/**
 * The clouds: flat-bottomed heaps of puffs that ride the wind across the sky,
 * and the shadow they lay on the land and the sea.
 *
 * One instanced mesh for every puff of every cloud. They are moved in the
 * vertex shader by the wind's drift, so nothing here runs per frame, and the
 * shadow is the same layout painted once from above into `world.clouds`.
 */
export function createClouds (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null
  let shadow: THREE.DataTexture | null = null

  return {
    name: 'clouds',

    build ({ scene, rng }) {
      const clouds = layOutClouds({ rng: rng.fork('clouds:layout'), count: COUNT, along: world.wind.direction })
      const puffs  = clouds.reduce((sum, cloud) => sum + cloud.puffs.length, 0)

      const geometry = createPuffGeometry(rng.fork('clouds:puff').int(1, 1_000_000))
      const homes    = new Float32Array(puffs * 3)

      // The lit face is the sun's cream, since that is light itself. The far
      // side is the sky's own colours, so a cloud belongs to the sky it is in.
      const material = createCloudMaterial({
        lit:          PALETTE.sun,
        shade:        new THREE.Color(PALETTE.skyFill).lerp(new THREE.Color(PALETTE.horizon), 0.3),
        haze:         PALETTE.horizon,
        sunDirection: SUN,
        wind:         world.wind.uniforms,
      })

      mesh      = new THREE.InstancedMesh(geometry, material, puffs)
      mesh.name = 'clouds'

      // The shader moves every instance, so the box three would cull by is
      // nowhere near them. There is always some cloud in sight anyway.
      mesh.frustumCulled = false

      const blots: Blot[] = []

      let index = 0

      for (const cloud of clouds)
        for (const puff of cloud.puffs) {
          dummy.position.set(...puff.offset)
          dummy.rotation.set(0, puff.turn, 0)
          dummy.scale.set(...puff.scale)
          dummy.updateMatrix()

          mesh.setMatrixAt(index, dummy.matrix)
          homes.set([ cloud.x, cloud.y, cloud.z ], index * 3)
          index += 1

          blots.push({
            x:      cloud.x + puff.offset[0],
            y:      cloud.y + puff.offset[1],
            z:      cloud.z + puff.offset[2],
            radius: (puff.scale[0] + puff.scale[2]) / 2,
          })
        }

      geometry.setAttribute('aCloud', new THREE.InstancedBufferAttribute(homes, 3))
      mesh.instanceMatrix.needsUpdate = true

      shadow = createCloudShadowTexture(blots, SHADOW_SIDE[world.quality.tier])

      world.clouds.uniforms.uCloudShadow.value = shadow

      scene.add(mesh)
    },

    dispose () {
      disposeInstances(mesh)
      shadow?.dispose()

      world.clouds.uniforms.uCloudShadow.value = null

      mesh   = null
      shadow = null
    },
  }
}

// perf: cheap — one draw call and no shadow pass (the shadow is a texture).
// About 150 puffs of 80 triangles, 12k on every tier: the sky is one thing,
// like the cairn. Placed once; the drift is a uniform the environment writes.
