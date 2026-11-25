// src/world/features/yard/index.ts
import * as THREE from 'three'

import { disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createSmoke, createSmokeMaterial } from '../../shared/smoke.ts'
import type { Smoke } from '../../shared/smoke.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inItself, inWorld, stone as stonework, timber, turf } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createBodyGeometry } from './body.ts'
import { KILN } from './plan.ts'
import { layStones } from './stones.ts'
import { createTimber } from './timber.ts'

/** How much of the house's fire the kiln's is: a slow one, banked under the grain. */
const FIRE = 0.62

/** A mesh that owns its geometry and its one material, unhooked. */
function free (mesh: THREE.Mesh | null): void {
  mesh?.geometry.dispose()

  if (mesh?.material instanceof THREE.Material)
    mesh.material.dispose()

  mesh?.removeFromParent()
}

/**
 * The harvest home: where the barley goes when it leaves the rigs.
 *
 * Before the house's door stand the stacks, round and thatched and roped
 * down against the wind, each on its ring of stones; one is still building,
 * the sledge beside it with the last sheaves on, and the ladder is left on
 * the one thatched before it. On the shelf by the fold stands the kiln the
 * grain is dried in on its way to the mill: a round tower of the house's
 * stone under a cone of turf, its fire-hole on the low side, and a thin
 * smoke out of its top that leans with the house's. Still nobody. Everything
 * is built in the world's own frame: nothing here moves but the smoke.
 */
export function createYardFeature (world: World): Feature {
  let stones: THREE.InstancedMesh | null = null
  let body: THREE.Mesh | null            = null
  let boards: THREE.Mesh | null          = null
  let smoke: Smoke | null                = null

  return {
    name: 'yard',

    build ({ scene, rng }) {
      const { ground, yard, quality } = world

      // The house's own three materials, made alike, so each is a program
      // the island already has: its stone, its turf (the stacks' straw wears
      // it too), and the gate's boards.
      const stone = createLitMaterial(world, { name: 'yard-stone' })
      const built = createLitMaterial(world, { name: 'yard-body', vertexColors: true })
      const sawn  = createLitMaterial(world, { name: 'yard-timber', color: PALETTE.timber, roughness: 0.95 })

      stone.finish(stonework(inWorld(quality.tier)))
      built.finish(turf(inWorld(quality.tier)))
      sawn.finish(timber(inItself(quality.tier)))

      // Twenty facets a stone on every tier, as the dykes are: the grain carries them.
      // A phone has the stacks without their ropes, and so without the stones on them.
      const ropes = quality.tier !== 'mobile'

      stones = layStones(createStoneGeometry(rng.fork('yard:shape').int(1, 1_000_000), 0), stone, rng.fork('yard:lay'), ground, yard, ropes)

      const wood = createTimber(yard, ground)

      boards               = new THREE.Mesh(wood.geometry, sawn)
      boards.name          = 'yard-timber'
      boards.castShadow    = quality.tier !== 'mobile'
      boards.receiveShadow = true

      body = new THREE.Mesh(createBodyGeometry(yard, ground, rng.fork('yard:body'), ropes, wood.loads), built)
      body.name          = 'yard-body'
      body.castShadow    = true
      body.receiveShadow = true

      // The sea gives back the stacks and the kiln's roof: its stones are
      // small and far from the water, and so are the boards. On a phone the
      // stones throw no shadow of their own either: the dark inside them does.
      keepOutOfMirror(stones)
      keepOutOfMirror(boards)

      if (quality.tier === 'mobile')
        stones.castShadow = false

      smoke = createSmoke({
        tier:     quality.tier,
        seed:     rng.fork('yard:smoke').int(1, 1_000_000),
        wind:     world.wind,
        from:     new THREE.Vector3(yard.kiln.x, yard.kiln.floor + KILN.apex, yard.kiln.z),
        material: createSmokeMaterial(world, world.day.haze),
        name:     'yard-smoke',
        fire:     FIRE,
      })

      smoke.drift(0)

      scene.add(stones, body, boards, smoke.mesh)
    },

    update (_state, frame) {
      smoke?.drift(frame.frame * STEP)
    },

    dispose () {
      disposeInstances(stones)
      disposeInstances(smoke?.mesh ?? null)
      free(body)
      free(boards)

      stones = null
      body   = null
      boards = null
      smoke  = null
    },
  }
}

// perf: cheap — four draw calls and two shadow passes (three on desktop,
// with the boards'), and one more in the sea's mirror, for the body: some
// 250 stones of 20 triangles, under 2k of stacks, thatch, ropes and roof,
// 400 of boards and the smoke's 1.6k. A step moves the smoke's puffs.
