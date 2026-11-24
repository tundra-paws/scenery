// src/world/features/skerry/index.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { elevationAt } from '../../shared/daylight.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createReefStone } from '../../shared/skerry.ts'
import type { Haul, Skerry, Swim } from '../../shared/skerry.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { LUMPS, createLumpGeometry, poseSeal, poseSwimmer } from './seal.ts'


/** The mark: stones under its cap, and the radius of the lowest and the highest. A waymark in small. */
const COURSES     = 4
const BASE_RADIUS = 0.62
const TOP_RADIUS  = 0.3

/** How much darker than its body a seal's head and flippers are, as lightness. */
const DARKER = 0.035

/** Module-scope scratch, so a step allocates nothing. */
const dummy      = new THREE.Object3D()
const tint       = new THREE.Color()
const pale       = new THREE.Color(PALETTE.cairn).offsetHSL(0, 0, 0.1)
const dark       = new THREE.Color(PALETTE.face)
const haul: Haul = { lift: 0, turn: 0, tail: 0 }
const swim: Swim = { x: 0, z: 0, up: 0, yaw: 0 }

/** The reef and what is on it, as it is drawn: the stones, and the seals' lumps. */
interface Drawn {
  stones: THREE.InstancedMesh
  seals:  THREE.InstancedMesh
}

/** A mesh lit like the boulders, so it shares their program, and shaded by the clouds. */
function lit (world: World, name: string, geometry: THREE.BufferGeometry, count: number): THREE.InstancedMesh {
  const material = new THREE.MeshStandardMaterial({ name, flatShading: true, roughness: 1, metalness: 0 })

  shadeUnderClouds(material, world)

  const mesh = new THREE.InstancedMesh(geometry, material, count)

  mesh.name          = name
  mesh.castShadow    = true
  mesh.receiveShadow = true

  return mesh
}

/**
 * The sea-mark on the reef's highest rock: four flat stones and one stood on
 * end, in the cairn's paler grey, so a boat coming in after dark knows where
 * the rock is. Laid from `from` on; returns how many stones it took.
 */
function stackMark (stones: THREE.InstancedMesh, from: number, { mark }: Skerry, lay: SeededRng): number {
  let laid = from
  let top  = mark.y - 0.12

  const set = (lightness: number): void => {
    dummy.updateMatrix()
    stones.setMatrixAt(laid, dummy.matrix)
    stones.setColorAt(laid, tint.set(PALETTE.cairn).offsetHSL(0, 0, lightness))
    laid += 1
  }

  for (let course = 0; course < COURSES; course += 1) {
    const radius = THREE.MathUtils.lerp(BASE_RADIUS, TOP_RADIUS, course / (COURSES - 1))
    const thick  = radius * lay.range(0.42, 0.55)

    dummy.position.set(mark.x + lay.range(-0.06, 0.06), top + thick * 0.6, mark.z + lay.range(-0.06, 0.06))
    dummy.rotation.set(lay.range(-0.08, 0.08), lay.range(0, Math.PI * 2), lay.range(-0.08, 0.08))
    dummy.scale.set(radius, thick, radius * lay.range(0.85, 1.05))
    set(lay.range(-0.05, 0.05))

    top += thick * 1.05
  }

  dummy.position.set(mark.x, top + 0.3, mark.z)
  dummy.rotation.set(0.06, lay.range(0, Math.PI * 2), -0.05)
  dummy.scale.set(0.2, 0.66, 0.16)
  set(0.04)

  return laid - from
}

/** Every seal as it holds itself at `time`, and the one in the water. */
function pose ({ seals }: Drawn, { skerry, ground }: World, time: number): void {
  const elevation = elevationAt(time)

  skerry.seals.forEach((seal, index) => {
    poseSeal(seals, index, seal, skerry.haul(seal, time, elevation, haul))
  })

  poseSwimmer(seals, skerry.seals.length * LUMPS, skerry.swim(time, elevation, swim), ground.waterLevel)

  seals.instanceMatrix.needsUpdate = true
}

/**
 * The skerry (`shared/skerry.ts`): a reef of the island's own rock off its
 * east shore, a small mark stacked on its highest point, and seals hauled
 * out on its slabs.
 *
 * The seals are the flock's opposite number on the sea: nobody's, never
 * near, and they keep their own hours. One lies flat and breathes; now and
 * then it lifts its head and looks round, or holds itself up at both ends as
 * a seal does; at night they sleep. One more is in the water and shows its
 * head between the reef and the shore for a while, then is gone. Two
 * instanced meshes: the stones, and the lumps the seals are made of.
 */
export function createSkerryFeature (world: World): Feature {
  let drawn: Drawn | null = null

  return {
    name: 'skerry',

    build ({ scene, rng }) {
      const { skerry, quality } = world
      const stones              = lit(world, 'skerry', createReefStone(skerry.shape), skerry.rocks.length + COURSES + 1)
      const seals               = lit(world, 'seals', createLumpGeometry(), skerry.seals.length * LUMPS + 1)

      skerry.rocks.forEach((rock, index) => {
        stones.setMatrixAt(index, rock.matrix)
        stones.setColorAt(index, tint.set(PALETTE.rock).offsetHSL(0, 0, rock.shade))

        // The sea breaks round every one that stands in it.
        world.wash.stand(rock.x, rock.z, rock.footing)
      })

      stones.count = skerry.rocks.length + stackMark(stones, skerry.rocks.length, skerry, rng.fork('skerry:mark'))

      skerry.seals.forEach((seal, index) => {
        for (let lump = 0; lump < LUMPS; lump += 1)
          seals.setColorAt(index * LUMPS + lump, tint.copy(pale).lerp(dark, seal.coat)
            .offsetHSL(0, 0, lump === 0 ? 0 : -DARKER))
      })

      // Wet, the one in the water is as dark as any of them.
      seals.setColorAt(skerry.seals.length * LUMPS, tint.copy(pale).lerp(dark, 0.8))

      // They move over a few units, and the head in the water further: never culled.
      seals.frustumCulled = false

      if (quality.tier === 'mobile')
        keepOutOfMirror(seals)

      drawn = { stones, seals }
      pose(drawn, world, 0)

      commitInstances(stones)
      commitInstances(seals)
      scene.add(stones, seals)
    },

    update (_state, frame) {
      if (drawn)
        pose(drawn, world, frame.frame * STEP)
    },

    dispose () {
      disposeInstances(drawn?.stones ?? null)
      disposeInstances(drawn?.seals ?? null)
      drawn = null
    },
  }
}

// perf: cheap — two draw calls, two shadow passes and two more in the sea's
// reflection (one there on a phone). Eighteen rocks and a mark of five stones
// at 80 triangles, 1.8k; six seals of three lumps at 80, 1.5k (four seals on
// a phone): 3.3k a pass, 10k all told. A step is the sun's height once and
// three small matrices a seal.
