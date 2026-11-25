// src/world/features/rocks/index.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'

import { createLitMaterial } from '../../shared/lit.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import { SQUAT, createStoneGeometry } from '../../shared/stone.ts'
import { inWorld, stone } from '../../shared/surface.ts'
import { waterline } from '../../shared/wash.ts'
import type { Feature, World } from '../../world.ts'


const COUNT: Record<QualityTier, number> = { mobile: 60, desktop: 140, highEnd: 220 }

/**
 * Clear ground kept round a boulder, on top of its own size: from the middle of
 * the path, far enough that it never leans on a waymark, from the summit,
 * where the cairn and its spill stand, from the shelter's walls and the way
 * to its door, from the foot of a tree, from a wall, and from the middle of
 * the burn, which has stones of its own.
 */
const OFF_PATH    = 3
const OFF_SUMMIT  = 4
const OFF_SHELTER = 2
const OFF_TREE    = 0.8
const OFF_DYKE    = 1
const OFF_BURN    = 1.6

/** A boulder whose foot is lower than this over the water stands in it, and the sea breaks round it. */
const STANDING = 0.25

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** Boulders along the shore and on the slopes: one instanced mesh. */
export function createRocks (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null

  return {
    name: 'rocks',

    build ({ scene, rng }) {
      const { ground, summit, path, shelter, wood, infield, burn, mill } = world

      const place = rng.fork('rocks:place')
      const shape = rng.fork('rocks:shape')

      const spots = scatterOnGround({
        ground,
        rng:    place,
        count:  COUNT[world.quality.tier],
        accept: spot => spot.height > ground.waterLevel - 0.4 && spot.slope < 0.5,
      })

      const geometry = createStoneGeometry(shape.int(1, 1_000_000))
      const material = createLitMaterial(world, { name: 'rock' })

      material.finish(stone(inWorld(world.quality.tier)))

      mesh = new THREE.InstancedMesh(geometry, material, spots.length)
      mesh.name          = 'rocks'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      let kept = 0

      for (const spot of spots) {
        const size = place.range(0.5, 2.6)

        // Sunk a little, so a boulder on a slope does not hover on its high side.
        dummy.position.set(spot.x, spot.height - size * 0.18, spot.z)
        dummy.rotation.set(place.range(-0.3, 0.3), place.range(0, Math.PI * 2), place.range(-0.3, 0.3))

        const tall = place.range(0.7, 1.1)
        const wide = place.range(0.8, 1.2)

        dummy.scale.set(size, size * tall, size * wide)
        dummy.updateMatrix()
        tint.set(PALETTE.rock).offsetHSL(0, 0, place.range(-0.07, 0.07))

        // A boulder lying on the path was rolled off it long ago, one on the
        // summit went into the cairn, and one where the shelter or the mill
        // stands into its walls. No tree took root on one. The field was cleared into its
        // dyke, and a dyke goes round a boulder, not over it. Left out after
        // its draws are taken, so every other boulder stays where it was.
        const taken = path.distanceTo(spot.x, spot.z) < size + OFF_PATH ||
          infield.inField(spot.x, spot.z) ||
          infield.distanceTo(spot.x, spot.z) < size + OFF_DYKE ||
          burn.distanceTo(spot.x, spot.z) < size + OFF_BURN ||
          Math.hypot(spot.x - summit.x, spot.z - summit.z) < size + OFF_SUMMIT ||
          Math.min(shelter.distanceTo(spot.x, spot.z), shelter.distanceToSpur(spot.x, spot.z)) < size + OFF_SHELTER ||
          Math.min(mill.distanceTo(spot.x, spot.z), mill.distanceToSpur(spot.x, spot.z)) < size + OFF_SHELTER ||
          wood.distanceTo(spot.x, spot.z) < size + OFF_TREE

        if (taken)
          continue

        mesh.setMatrixAt(kept, dummy.matrix)
        mesh.setColorAt(kept, tint)
        kept += 1

        // The flock grazes round it.
        world.clutter.lay(spot.x, spot.z, size * (1 + wide) / 2)

        // One that stands in the sea is one the sea breaks round.
        if (spot.height < ground.waterLevel + STANDING)
          world.wash.stand(spot.x, spot.z, waterline(dummy.position.y, size * (1 + wide) / 2, size * tall * SQUAT, ground.waterLevel))
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

// perf: cheap — one draw call (two with its shadow pass), 80 triangles a rock:
// 5k on the mobile tier, 11k on desktop. Placed once; nothing per frame.
