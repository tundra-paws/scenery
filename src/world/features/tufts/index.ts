// src/world/features/tufts/index.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { QualityTier } from 'threejs-scenes'
import { createNoise3D } from 'threejs-scenes/primitives'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import type { Wind } from '../../shared/wind.ts'
import type { Feature, World } from '../../world.ts'


const COUNT: Record<QualityTier, number> = { mobile: 900, desktop: 2600, highEnd: 4200 }

/** How far from the middle of the path the grass is trodden out, from the shelter's walls, and from the way to its door. */
const OFF_PATH    = 1.9
const OFF_SHELTER = 0.9
const OFF_SPUR    = 1.1

/** How far from the middle of a field wall the grass is kept: its foot, and the strip a scythe misses. */
const OFF_DYKE = 0.6

/** Length of a blade before it is leant and scaled. */
const BLADE = 0.8

/**
 * How far a tuft's tip goes downwind, as a fraction of its height: what it
 * keeps even in a lull, what a full gust adds, and the shiver on top of both.
 */
const LEAN   = 0.16
const SWAY   = 0.5
const SHIVER = 0.08

/**
 * The bend, for the vertex shader, in the tuft's own space before the instance
 * matrix places it.
 *
 * The foot stays planted and the tip goes furthest, by the square of the
 * height. Every tuft reads the gust at its own root, so a front crossing the
 * meadow is seen to cross it, and shivers a little out of step with its
 * neighbours. The push is turned out of world space into the tuft's own,
 * because each tuft was spun and stretched when it was placed.
 */
const SWAY_VERTEX = /* glsl */ `
  #ifdef USE_INSTANCING
    mat3 tuft = mat3(instanceMatrix);
    vec2 root = instanceMatrix[3].xz;
    vec3 lee  = (vec3(WIND.x, 0.0, WIND.y) * tuft) / vec3(dot(tuft[0], tuft[0]), dot(tuft[1], tuft[1]), dot(tuft[2], tuft[2]));

    float gust   = windGust(root);
    float shiver = sin(dot(windFrame(root), vec2(149.0, -113.0)));
    float lean   = ${LEAN} + ${SWAY} * gust + ${SHIVER} * shiver * (0.4 + 0.6 * gust);
    float up     = clamp(transformed.y / ${BLADE}, 0.0, 1.0);

    transformed   += lee * (lean * up * up * ${BLADE} * length(tuft[1]));
    transformed.y -= lean * lean * up * up * ${BLADE * 0.35};
  #endif
`

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** One tuft: three open cones leaning apart. Nine triangles. */
function createTuftGeometry (): THREE.BufferGeometry {
  const blades = [ -0.45, 0, 0.45 ].map((lean, index) => {
    const blade = new THREE.ConeGeometry(0.09, BLADE, 3, 1, true)

    blade.translate(0, BLADE / 2, 0)
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

/** Let a tuft material lean and sway with the wind. */
function swayInWind (material: THREE.Material, wind: Wind): void {
  amendShader(material, 'tuft-sway', shader => {
    Object.assign(shader.uniforms, wind.uniforms)

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', WIND_GLSL),
      '#include <begin_vertex>',
      SWAY_VERTEX,
    )
  })
}

/** Grass tufts on the gentle, low ground: one instanced mesh, in patches, leaning with the wind. */
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

          // Above the sand, below the bare tops, only where the patch noise
          // says grass grows (an even carpet reads as texture, clumps read as
          // plants), and off the steep ground. In order of cost: the slope is
          // fourteen times the patch lookup, so it is asked last.
          return above > 1.1 &&
            above < ground.relief * 0.5 &&
            patches.fbm(spot.x * 0.03, 9.1, spot.z * 0.03, 2) > -0.08 &&
            spot.slope < 0.2
        },
      })

      const geometry = createTuftGeometry()

      const material = new THREE.MeshStandardMaterial({
        name:      'tuft',
        roughness: 1,
        metalness: 0,
        side:      THREE.DoubleSide,
      })

      swayInWind(material, world.wind)
      shadeUnderClouds(material, world)

      mesh = new THREE.InstancedMesh(geometry, material, spots.length)
      mesh.name          = 'tufts'
      mesh.receiveShadow = true

      // Thousands of blades, a hand high: the sea gives back the meadow's
      // colour from the ground under them, and the ripples would lose them.
      keepOutOfMirror(mesh)

      let kept = 0

      for (const spot of spots) {
        const size = place.range(0.7, 1.7)

        dummy.position.set(spot.x, spot.height - 0.05, spot.z)
        dummy.rotation.set(0, place.range(0, Math.PI * 2), 0)
        dummy.scale.set(size, size * place.range(0.8, 1.4), size)
        dummy.updateMatrix()
        tint.set(place.next() < 0.3 ? PALETTE.grassDry : PALETTE.grass).offsetHSL(0, 0, place.range(-0.05, 0.08))

        // Nothing grows where feet go, under a wall, or where the ground was
        // dug. Left out after its draws are taken, so every other tuft stays
        // where it was.
        const trodden = world.path.distanceTo(spot.x, spot.z) < OFF_PATH ||
          world.shelter.distanceTo(spot.x, spot.z) < OFF_SHELTER ||
          world.shelter.distanceToSpur(spot.x, spot.z) < OFF_SPUR ||
          world.infield.distanceTo(spot.x, spot.z) < OFF_DYKE ||
          world.infield.inField(spot.x, spot.z)

        if (trodden)
          continue

        mesh.setMatrixAt(kept, dummy.matrix)
        mesh.setColorAt(kept, tint)
        kept += 1
      }

      mesh.count = kept

      commitInstances(mesh)
      scene.add(mesh)
    },

    dispose () {
      disposeInstances(mesh)
      mesh = null
    },
  }
}

// perf: cheap — one draw call, no shadow pass. Nine triangles a tuft: 8k on the
// mobile tier, 23k on desktop. Placed once; the sway is four sines a vertex in
// the shader, from the wind's one uniform, and nothing per frame on the CPU.
