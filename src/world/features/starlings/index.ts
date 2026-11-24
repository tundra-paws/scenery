// src/world/features/starlings/index.ts
import * as THREE from 'three'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createStarlings } from '../../shared/starlings.ts'
import type { Flight, Hour, Starling, Starlings } from '../../shared/starlings.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'

/**
 * One wing, in the bird's own frame (forward along x, up along y, its left
 * along z): a long narrow triangle from the shoulder back to a pointed tip,
 * swept as a starling's is. Faced both ways, since it is seen from under and
 * over, and drawn for the right wing too, mirrored.
 */
const WING = [
  [ 0.1, 0, 0 ],
  [ -0.13, 0, 0 ],
  [ -0.09, 0, 0.42 ],
] as const

/** How much darker or paler a bird may be than the rest, as lightness. */
const SHEEN = 0.05

/** Module-scope scratch, so a step allocates nothing. */
const hour: Hour     = { time: 0, come: 0, settle: 0, roost: 0, leave: 0, evening: true }
const flight: Flight = { x: 0, y: 0, z: 0, up: false, yaw: 0, pitch: 0, bank: 0, wing: 0 }
const body           = new THREE.Matrix4()
const part           = new THREE.Matrix4()
const out            = new THREE.Matrix4()
const turn           = new THREE.Euler(0, 0, 0, 'YZX')
const spin           = new THREE.Quaternion()
const place          = new THREE.Vector3()
const unit           = new THREE.Vector3(1, 1, 1)
const mirrored       = new THREE.Vector3(1, 1, -1)
const none           = new THREE.Matrix4().makeScale(0, 0, 0)
const tint           = new THREE.Color()

/** The birds and the one mesh of wings they are drawn with: two instances a bird, its left wing and its right. */
interface Cloud {
  starlings: Starlings
  wings:     THREE.InstancedMesh
}

/** The wing as a geometry: the triangle, once each way round. */
function createWingGeometry (): THREE.BufferGeometry {
  const [ a, b, c ] = WING
  const geometry    = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute([ ...a, ...b, ...c, ...a, ...c, ...b ], 3))
  geometry.computeVertexNormals()

  return geometry
}

/** One bird's two wings, as it flies at the hour; folded away to nothing when it is not up. */
function poseBird (wings: THREE.InstancedMesh, starlings: Starlings, bird: Starling, index: number): boolean {
  starlings.fly(bird, hour, flight)

  if (!flight.up) {
    wings.setMatrixAt(index * 2, none)
    wings.setMatrixAt(index * 2 + 1, none)

    return false
  }

  turn.set(flight.bank, -flight.yaw, flight.pitch)
  spin.setFromEuler(turn)
  place.set(flight.x, flight.y, flight.z)
  body.compose(place, spin, unit)

  place.set(0, 0, 0)
  turn.set(-flight.wing, 0, 0)
  spin.setFromEuler(turn)
  wings.setMatrixAt(index * 2, out.multiplyMatrices(body, part.compose(place, spin, unit)))

  turn.set(flight.wing, 0, 0)
  spin.setFromEuler(turn)
  wings.setMatrixAt(index * 2 + 1, out.multiplyMatrices(body, part.compose(place, spin, mirrored)))

  return true
}

/** Every bird where it is at `time`; the mesh is left out of the frame when none of them is up. */
function pose ({ starlings, wings }: Cloud, time: number): void {
  starlings.at(time, hour)

  let up = false

  if (hour.evening ? hour.come > 0 && hour.roost < 1 : hour.leave > 0 && hour.leave < 1)
    starlings.birds.forEach((bird, index) => {
      up = poseBird(wings, starlings, bird, index) || up
    })

  wings.visible = up

  if (up)
    wings.instanceMatrix.needsUpdate = true
}

/**
 * The starlings (`shared/starlings.ts`): one instanced mesh of wings, two to
 * a bird, beating and banking as each flies its part of the cloud.
 *
 * Lit like the sheep and the rocks, in the near black of a sheep's face, so
 * they share a program with them and cost the sea's reflection no new one:
 * against the evening sky they are dark, and where the cloud bunches it is
 * darker still. Left out of a phone's reflection, as the sheep are.
 */
export function createStarlingsFeature (world: World): Feature {
  let cloud: Cloud | null = null

  return {
    name: 'starlings',

    build ({ scene }) {
      const { ground, infield, quality } = world
      const starlings                    = createStarlings({ ground, infield }, world.seed, quality.tier)
      const material                     = new THREE.MeshStandardMaterial({ name: 'starlings', flatShading: true, roughness: 1, metalness: 0 })

      shadeUnderClouds(material, world)

      const wings = new THREE.InstancedMesh(createWingGeometry(), material, starlings.birds.length * 2)

      wings.name          = 'starlings'
      wings.castShadow    = false
      wings.receiveShadow = true
      wings.frustumCulled = false

      if (quality.tier === 'mobile')
        keepOutOfMirror(wings)

      starlings.birds.forEach((bird, index) => {
        tint.set(PALETTE.face).offsetHSL(0, 0, (bird.phase / Math.PI - 1) * SHEEN)
        wings.setColorAt(index * 2, tint)
        wings.setColorAt(index * 2 + 1, tint)
      })

      cloud = { starlings, wings }
      pose(cloud, 0)
      commitInstances(wings)
      scene.add(wings)
    },

    update (_state, frame) {
      if (cloud)
        pose(cloud, frame.frame * STEP)
    },

    dispose () {
      disposeInstances(cloud?.wings ?? null)
      cloud = null
    },
  }
}

// perf: cheap on the GPU — one draw call, and one more in the sea's
// reflection (none there on a phone), none at all while every bird is in the
// walls or away: 2400 birds on desktop and 1200 on a phone, at two triangles a
// wing, 9.6k a pass. A step is the birds' flight (`shared/starlings.ts`) and
// two matrices a bird; nothing while none is up.
