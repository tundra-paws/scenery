// src/world/features/tufts/index.ts
import * as THREE from 'three'
import { clamp, dot, positionGeometry, sin, vec2, vec3 } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { QualityTier } from 'threejs-scenes'
import { createNoise3D } from 'threejs-scenes/primitives'

import { commitInstances, disposeInstances, tellReach } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { displaceInstances, floatAttribute } from '../../shared/nodes.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import type { Wind } from '../../shared/wind.ts'
import type { Feature, World } from '../../world.ts'
import { plantBracken } from './bracken.ts'
import { plantHeather } from './heather.ts'


const COUNT: Record<QualityTier, number> = { mobile: 800, desktop: 2600, highEnd: 4200 }

/** How far from the middle of the path the grass is trodden out, from the shelter's walls, and from the way to its door. */
const OFF_PATH    = 1.9
const OFF_SHELTER = 0.9
const OFF_SPUR    = 1.1

/** How much of the ground may be heather before the grass gives it up. */
const IN_HEATHER = 0.4

/** How far from the middle of a field wall the grass is kept: its foot, and the strip a scythe misses. */
const OFF_DYKE = 0.6

/** How far past the burn's own water its stones and its wet reach: no grass in either. */
const OFF_BURN = 0.55

/** Length of a blade before it is leant and scaled. */
const BLADE = 0.8

/**
 * How far a tuft's tip goes downwind, as a fraction of its height: what it
 * keeps even in a lull, what a full gust adds, and the shiver on top of both.
 */
const LEAN   = 0.16
const SWAY   = 0.5
const SHIVER = 0.08

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

/** Whether feet go here, a wall stands here or the ground was dug: off every way, house, wall and bank, and out of the field. */
function trodden (world: World, x: number, z: number): boolean {
  const built = [ world.shelter, world.mill, world.yard, world.pier ]

  return world.path.distanceTo(x, z) < OFF_PATH ||
    built.some(place => place.distanceTo(x, z) < OFF_SHELTER || place.distanceToSpur(x, z) < OFF_SPUR) ||
    world.infield.distanceTo(x, z) < OFF_DYKE ||
    world.burn.distanceTo(x, z) < world.burn.pool.half + OFF_BURN ||
    world.infield.inField(x, z)
}

/**
 * Let a tuft material lean and sway with the wind: the bend, as where each
 * vertex goes once its instance has been placed.
 *
 * The foot stays planted and the tip goes furthest, by the square of the
 * height. Every tuft reads the gust where it stands, so a front crossing the
 * meadow is seen to cross it, and shivers a little out of step with its
 * neighbours. `aReach` is how tall the instance was stretched (`tellReach`).
 */
function swayInWind (material: LitMaterial, wind: Wind): void {
  displaceInstances(material, placed => {
    const gust   = wind.nodes.gust(placed.xz)
    const shiver = sin(dot(wind.nodes.frame(placed.xz), vec2(149, -113)))
    const lean   = gust.mul(SWAY).add(LEAN)
      .add(shiver.mul(SHIVER).mul(gust.mul(0.6).add(0.4)))
    const up    = clamp(positionGeometry.y.div(BLADE), 0, 1)
    const reach = up.mul(up).mul(floatAttribute('aReach'))
      .mul(BLADE)

    return placed
      .add(vec3(wind.direction[0], 0, wind.direction[1]).mul(lean)
        .mul(reach))
      .sub(vec3(0, lean.mul(lean).mul(reach)
        .mul(0.35), 0))
  })
}

/** Grass tufts on the gentle, low ground, in patches, the heather on the hill above it (`heather.ts`) and the bracken between (`bracken.ts`): three instanced meshes in one material, leaning with the wind. */
export function createTufts (world: World): Feature {
  let mesh: THREE.InstancedMesh | null    = null
  let heather: THREE.InstancedMesh | null = null
  let bracken: THREE.InstancedMesh | null = null

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
            spot.slope < 0.2 &&
            world.moor.heatherAt(spot.x, spot.z, spot.height, spot.slope) < IN_HEATHER
        },
      })

      const geometry = createTuftGeometry()

      const material = createLitMaterial(world, { name: 'tuft', flatShading: false, side: THREE.DoubleSide })

      material.sheds()

      swayInWind(material, world.wind)

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
        if (trodden(world, spot.x, spot.z))
          continue

        mesh.setMatrixAt(kept, dummy.matrix)
        mesh.setColorAt(kept, tint)
        kept += 1
      }

      mesh.count = kept

      tellReach(mesh)
      commitInstances(mesh)

      // The hill's heather and the bracken under it share the grass's
      // material, and so its program.
      heather = plantHeather(world, rng, material)
      bracken = plantBracken(world, rng, material)
      scene.add(mesh, heather, bracken)
    },

    dispose () {
      heather?.geometry.dispose()
      heather?.removeFromParent()
      heather?.dispose()
      bracken?.geometry.dispose()
      bracken?.removeFromParent()
      bracken?.dispose()
      disposeInstances(mesh)
      mesh    = null
      heather = null
      bracken = null
    },
  }
}

// perf: cheap — three draw calls, no shadow pass. Nine triangles a tuft: 7k on
// the mobile tier, 20k on desktop, and the heather's bushes and the bracken's
// clumps (`heather.ts`, `bracken.ts`). Placed once; the sway is four sines a vertex in
// the shader, from the wind's one uniform, and nothing per frame on the CPU.
