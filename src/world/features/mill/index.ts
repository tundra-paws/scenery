// src/world/features/mill/index.ts
import * as THREE from 'three'

import { disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inItself, inWorld, stone as stonework, timber, turf } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createBodyGeometry } from './body.ts'
import { HALF_DEEP, HALF_LONG, RACE, TIRL, TURN } from './plan.ts'
import { createTimberGeometry, createTirlGeometry } from './timber.ts'
import { layWalls } from './walls.ts'

/** How far over the water the bridge's slabs lie, at least. */
const OVER_WATER = 0.34

/** A mesh that owns its geometry: the material may be shared with another. */
function unhook (mesh: THREE.Mesh | null): void {
  mesh?.geometry.dispose()
  mesh?.removeFromParent()
}

/**
 * The mill: one small room of placed stone under a turf roof, astride the
 * burn just above its pool, with the wheel turning under the floor.
 *
 * A click mill, the kind a few crofts shared: the burn comes in under one
 * wall, is thrown down a trough at the blades of a wheel that lies flat,
 * and goes out under the other into the pool; the wheel's shaft turns the
 * stone in the room above. The barley on the rigs is why it is here. It is
 * running, and still nobody: the door is shut, the old stone leans by it,
 * and the way to it crosses the burn on two slabs. Further down, where the
 * burn goes under the head-dyke, the wall now leaves it a gap, hung with
 * poles. Everything is built in the mill's own frame inside one group that
 * `world.mill` places and turns.
 */
export function createMillFeature (world: World): Feature {
  let house: THREE.Group | null         = null
  let walls: THREE.InstancedMesh | null = null
  let body: THREE.Mesh | null           = null
  let boards: THREE.Mesh | null         = null
  let tirl: THREE.Mesh | null           = null
  let wood: THREE.Material | null       = null

  return {
    name: 'mill',

    build ({ scene, rng }) {
      const { ground, mill, quality } = world

      /** Height of the land over the floor, at a place in the mill's own frame. */
      const land = (across: number, along: number): number => {
        const { x, z } = mill.place(across, along)

        return ground.heightAt(x, z) - mill.floor
      }

      // The house's own three materials, made alike, so each is a program the
      // island already has: its stone, its turf, and the gate's boards.
      const stone = createLitMaterial(world, { name: 'mill-stone' })
      const built = createLitMaterial(world, { name: 'mill-body', vertexColors: true })

      const sawn  = createLitMaterial(world, { name: 'mill-timber', color: PALETTE.timber, roughness: 0.95 })

      stone.finish(stonework(inWorld(quality.tier)))
      built.finish(turf(inWorld(quality.tier)))
      sawn.finish(timber(inItself(quality.tier)))
      wood = sawn

      house      = new THREE.Group()
      house.name = 'mill'
      house.position.set(mill.x, mill.floor, mill.z)
      house.rotation.y = mill.yaw
      house.updateMatrix()

      // The bridge, in the mill's own frame: level, on the higher of its two
      // banks, and clear of the water in between.
      const out    = (mill.bridge.x - mill.x) * mill.fall[0] + (mill.bridge.z - mill.z) * mill.fall[1]
      const banks  = [ -1, 0, 1 ].map(side => land(out, RACE + side * mill.bridge.half))
      const bridge = { at: [ out, RACE ] as const, base: Math.max(banks[0]!, banks[1]! + OVER_WATER, banks[2]!) - 0.1, half: mill.bridge.half, turn: Math.PI / 2 }

      // Twenty facets a stone on every tier, as the dykes are: the grain carries them.
      walls = layWalls(createStoneGeometry(rng.fork('mill:shape').int(1, 1_000_000), 0), stone, rng.fork('mill:lay'), land, [ bridge ])

      // The dark inside goes down as far as the lowest ground at any corner.
      const foot = Math.min(land(-HALF_DEEP, -HALF_LONG), land(HALF_DEEP, -HALF_LONG), land(-HALF_DEEP, HALF_LONG), land(HALF_DEEP, HALF_LONG)) - 1

      body = new THREE.Mesh(createBodyGeometry(rng.fork('mill:turf').int(1, 1_000_000), foot), built)
      body.name          = 'mill-body'
      body.castShadow    = true
      body.receiveShadow = true

      // How far under the floor the burn's bed is where the wheel stands.
      const depth = -land(TIRL.across, RACE)

      boards               = new THREE.Mesh(createTimberGeometry(depth, mill.gate, (x, z) => ground.heightAt(x, z), house.matrix.clone().invert()), wood)
      boards.name          = 'mill-timber'
      boards.receiveShadow = true

      tirl      = new THREE.Mesh(createTirlGeometry(depth), wood)
      tirl.name = 'mill-tirl'
      tirl.position.set(TIRL.across, 0, RACE)
      tirl.receiveShadow = true

      // Small things, and under a roof: the sea does not give them back, and
      // on a phone not the walls' stones either, as it does not the dykes'.
      keepOutOfMirror(boards)
      keepOutOfMirror(tirl)

      // Nor, on a phone, do the stones throw a shadow of their own: the dark
      // block just inside them throws the mill's.
      if (quality.tier === 'mobile') {
        keepOutOfMirror(walls)
        walls.castShadow = false
      }

      house.add(walls, body, boards, tirl)
      scene.add(house)
    },

    update (_state, frame) {
      if (tirl)
        tirl.rotation.y = -(frame.frame * STEP * TURN) % (Math.PI * 2)
    },

    dispose () {
      disposeInstances(walls)
      unhook(boards)
      unhook(tirl)
      wood?.dispose()
      body?.geometry.dispose()

      if (body?.material instanceof THREE.Material)
        body.material.dispose()

      house?.removeFromParent()

      house  = null
      walls  = null
      body   = null
      boards = null
      tirl   = null
      wood   = null
    },
  }
}

// perf: cheap — four draw calls, six with the sun's shadow pass (the stones
// and the body) and eight with the sea's mirror on desktop; on a phone the
// stones are drawn once, so five. Some 200 stones of 20 triangles, and under
// 1,500 triangles of body, boards and wheel. A step sets one angle.
