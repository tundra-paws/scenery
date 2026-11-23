// src/world/features/cairn/index.ts
import * as THREE from 'three'

import { PALETTE } from '../../shared/palette.ts'
import type { Ground } from '../../shared/ground.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import type { Feature, World } from '../../world.ts'


/** Stones in the stack, base to cap. The same on every tier: it is one landmark. */
const COURSES = 9

/** Loose stones lying around the foot. */
const SPILL = 6

/** Radius of the base course and of the last one under the cap. */
const BASE_RADIUS = 2.9
const TOP_RADIUS  = 1

/** Grid step of the search for the summit. */
const SEARCH_STEP = 2

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** The highest point of the land, so the cairn follows the summit if the land is reshaped. */
type FindSummitReturnType = { x: number, z: number }

function findSummit (ground: Ground): FindSummitReturnType {
  const half = ground.size / 2
  const best = { x: 0, z: 0, height: -Infinity }

  for (let x = -half; x <= half; x += SEARCH_STEP)
    for (let z = -half; z <= half; z += SEARCH_STEP) {
      const height = ground.heightAt(x, z)

      if (height > best.height)
        Object.assign(best, { x, z, height })
    }

  return best
}

/**
 * The cairn: flat stones stacked on the island's highest point, a tall one on top.
 *
 * The first sign that someone has been here, and the thing the `hero` view is
 * looking at. One instanced mesh of the same stone the boulders are.
 */
export function createCairn (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null

  return {
    name: 'cairn',

    build ({ scene, rng }) {
      const { ground } = world
      const lay        = rng.fork('cairn:lay')
      const summit     = findSummit(ground)

      const geometry = createStoneGeometry(rng.fork('cairn:shape').int(1, 1_000_000))
      const material = new THREE.MeshStandardMaterial({ name: 'cairn', flatShading: true, roughness: 1, metalness: 0 })

      mesh = new THREE.InstancedMesh(geometry, material, COURSES + 1 + SPILL)
      mesh.name          = 'cairn'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      let index = 0

      const set = (lightness: number): void => {
        dummy.updateMatrix()
        mesh!.setMatrixAt(index, dummy.matrix)
        mesh!.setColorAt(index, tint.set(PALETTE.cairn).offsetHSL(0, 0, lightness))
        index += 1
      }

      // Sunk into the top, so the base course meets the faceted ground all round.
      let top = ground.heightAt(summit.x, summit.z) - 0.5

      for (let course = 0; course < COURSES; course += 1) {
        const radius = THREE.MathUtils.lerp(BASE_RADIUS, TOP_RADIUS, course / (COURSES - 1))
        const thick  = radius * lay.range(0.4, 0.52)
        const wander = radius * 0.12

        dummy.position.set(summit.x + lay.range(-wander, wander), top + thick * 0.6, summit.z + lay.range(-wander, wander))
        dummy.rotation.set(lay.range(-0.06, 0.06), lay.range(0, Math.PI * 2), lay.range(-0.06, 0.06))
        dummy.scale.set(radius, thick, radius * lay.range(0.85, 1.05))
        set(lay.range(-0.05, 0.05))

        top += thick * 1.05
      }

      // The cap: one stone stood on end, which is what makes it a marker and not a pile.
      dummy.position.set(summit.x, top + 1.1, summit.z)
      dummy.rotation.set(0.05, lay.range(0, Math.PI * 2), -0.04)
      dummy.scale.set(0.7, 2.4, 0.52)
      set(0.04)

      for (let stone = 0; stone < SPILL; stone += 1) {
        const angle = (stone + lay.range(-0.3, 0.3)) / SPILL * Math.PI * 2
        const reach = BASE_RADIUS * lay.range(1.25, 1.9)
        const x     = summit.x + Math.cos(angle) * reach
        const z     = summit.z + Math.sin(angle) * reach
        const size  = lay.range(0.35, 0.75)

        dummy.position.set(x, ground.heightAt(x, z) + size * 0.1, z)
        dummy.rotation.set(lay.range(-0.3, 0.3), lay.range(0, Math.PI * 2), lay.range(-0.3, 0.3))
        dummy.scale.set(size, size * 0.6, size * lay.range(0.8, 1.2))
        set(lay.range(-0.08, 0.02))
      }

      commitInstances(mesh)
      scene.add(mesh)
    },

    dispose () {
      disposeInstances(mesh)
      mesh = null
    },
  }
}

// perf: cheap — one draw call (two with its shadow pass), 16 stones of 80
// triangles: 1.3k on every tier. Built once, after a 17k-sample search for the
// summit; nothing per frame.
