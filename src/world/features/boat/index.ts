// src/world/features/boat/index.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { MAST, WATERLINE, createHullGeometry } from './hull.ts'
import { berthAt, findMooring } from './mooring.ts'
import type { Berth, Mooring } from './mooring.ts'
import { createPennant } from './pennant.ts'
import type { Pennant } from './pennant.ts'


/** Module-scope scratch, so a step allocates nothing. */
const berth: Berth = { x: 0, z: 0, heave: 0, yaw: 0, pitch: 0, roll: 0 }
const masthead     = new THREE.Vector3()

/** Mean height of the hull's side over the water, for how far along the light its shadow lies; and the furthest it is let lie. */
const SIDE_HEIGHT = 0.5
const SHADE_REACH = 2.5

/**
 * The boat: a small tarred double-ender lying to its anchor just off the
 * landing, with its oars shipped and a pennant at the masthead.
 *
 * How whoever lit the lamp came. Nobody is in it; it rides, and sheers about
 * its anchor as the wind lets it, bow always to the wind, so the grass, the
 * smoke and the boat all say the same thing about the air. Two draw calls
 * and one shadow pass: the boat, and its pennant.
 */
export function createBoat (world: World): Feature {
  let hull: THREE.Mesh | null = null
  let pennant: Pennant | null = null
  let mooring: Mooring | null = null

  /** Put the boat and its pennant where they are at `time` seconds. */
  function lie (time: number): void {
    if (!hull || !pennant || !mooring)
      return

    berthAt(mooring, world.wind, time, berth)

    hull.position.set(berth.x, berth.heave, berth.z)
    hull.rotation.set(berth.roll, berth.yaw, berth.pitch)

    // The masthead, carried round by the same turn the boat was given.
    masthead.set(MAST.along, MAST.top - 0.3, 0).applyEuler(hull.rotation)
      .add(hull.position)
    pennant.fly(masthead.x, masthead.y, masthead.z, time)

    // Tell the sea where it lies: the bow is the boat's own x, turned by its
    // yaw, and its shadow falls away from the light, further the lower that is.
    const { direction } = world.day.light
    const along         = SIDE_HEIGHT / Math.max(direction.y, 0.2)
    const reach         = Math.min(1, SHADE_REACH / (Math.hypot(direction.x, direction.z) * along || 1))

    world.wash.ride(berth.x, berth.z, -berth.yaw, -direction.x * along * reach, -direction.z * along * reach)
  }

  return {
    name: 'boat',

    build ({ scene }) {
      const material = createLitMaterial(world, { name: 'boat', vertexColors: true })

      mooring = findMooring(world.ground, world.path, world.wind)

      hull               = new THREE.Mesh(createHullGeometry(), material)
      hull.name          = 'boat'
      hull.castShadow    = true
      hull.receiveShadow = true

      // Turned to its heading first, then heeled and trimmed about its own axes.
      hull.rotation.order = 'YXZ'

      pennant = createPennant(world)

      world.wash.hull(WATERLINE.half, WATERLINE.beam)

      lie(0)
      scene.add(hull, pennant.mesh)
    },

    update (_state, frame) {
      lie(frame.frame * STEP)
    },

    dispose () {
      hull?.geometry.dispose()

      if (hull?.material instanceof THREE.Material)
        hull.material.dispose()

      hull?.removeFromParent()
      pennant?.dispose()

      hull    = null
      pennant = null
      mooring = null
    },
  }
}

// perf: cheap — two draw calls and one shadow pass, under 500 triangles on
// every tier. A step is a dozen sines for the boat (`mooring.ts`), one turn
// of a vector, and fourteen vertices for the pennant (`pennant.ts`).
