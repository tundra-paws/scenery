// src/world/features/hearth/index.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import { createFirelitMaterial, fireLevel } from '../../shared/hearth.ts'
import type { Burning } from '../../shared/hearth.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createRoom } from './house.ts'
import { createKilnFire } from './kiln.ts'

/**
 * The fires, and what they light: the room inside the house, with its
 * hearth and what somebody lives among, and the fire in the kiln's mouth.
 *
 * The house was a shell and its door a dark sheet. Now the door stands
 * open, the window is a hole in the wall, and through both is a room: the
 * fire is in, a pot over it, and nobody is home. A visitor who takes the
 * camera can go in. Everything here is unlit and carries its own light
 * (`shared/hearth.ts`): the fire's, which wavers, and the day's at the door.
 * One mesh for every inside, in the world's frame.
 */
export function createHearthFeature (world: World): Feature {
  const burning: Burning = { level: { value: 1 }, time: { value: 0 }}

  let mesh: THREE.Mesh | null = null

  return {
    name: 'hearth',

    build ({ scene }) {
      const { ground, shelter, yard, quality } = world

      /** Height of the land over the house's floor, at a place in the shelter's own frame. */
      const land = (across: number, along: number): number => {
        const { x, z } = shelter.place(across, along)

        return ground.heightAt(x, z) - shelter.floor
      }

      const room = createRoom(land, quality.tier === 'mobile')
      const kiln = createKilnFire(yard.kiln)

      room.applyMatrix4(new THREE.Matrix4().makeRotationY(shelter.yaw)
        .setPosition(shelter.x, shelter.floor, shelter.z))

      const insides = mergeGeometries([ room, kiln ])

      room.dispose()
      kiln.dispose()
      insides.computeBoundingBox()
      insides.computeBoundingSphere()

      mesh      = new THREE.Mesh(insides, createFirelitMaterial(world.day, burning))
      mesh.name = 'hearth'

      // Under a roof: the sea does not give it back.
      keepOutOfMirror(mesh)

      burning.level.value = fireLevel(0, world.day.night)
      scene.add(mesh)
    },

    update (_state, frame) {
      const time = frame.frame * STEP

      burning.time.value  = time
      burning.level.value = fireLevel(time, world.day.night)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      mesh?.removeFromParent()
      mesh = null
    },
  }
}

// perf: cheap — one unlit draw call, no shadow pass, not in the sea's
// mirror: 1.4k triangles on desktop, 700 on a phone. A step sets two numbers.
