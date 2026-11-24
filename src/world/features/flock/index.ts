// src/world/features/flock/index.ts
import * as THREE from 'three'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { createFlock } from '../../shared/flock.ts'
import type { Coat, Flock, Hold, Moment, Sheep } from '../../shared/flock.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { BODY, LEG, NECK, SINK, createFleeceGeometry, createHeadGeometry, createLegGeometry } from './sheep.ts'


/** How far ahead of and behind her middle the ground is read, for how she stands on a slope. */
const REACH = BODY.long * 0.4

/** How far a grazing sheep's head goes down, and a walking one's is held up; how high a lying one holds it. In radians about the neck. */
const DOWN = 1.32
const UP   = -0.22
const REST = -0.12

/** How far she leans forward to graze, how far she sweeps her head across the grass, and how fast. */
const DIP   = 0.07
const SWEEP = 0.32
const CROP  = 0.6

/** Steps a second, in radians, and how far a leg swings at full stride. */
const CADENCE = Math.PI * 2 * 1.6
const SWING   = 0.42

/** Legs: forward or back, left or right, and which pair of diagonals they step with. */
const LEGS = [[ 1, 1, 0 ], [ -1, -1, 0 ], [ 1, -1, Math.PI ], [ -1, 1, Math.PI ]] as const

/** The fleece's colours: what a sheep's wool is, and what her face and legs are. */
const COATS: Record<Coat, { fleece: string, face: string, shade: number }> = {
  fleece: { fleece: PALETTE.fleece, face: PALETTE.face, shade: 0 },
  moorit: { fleece: PALETTE.moorit, face: PALETTE.moorit, shade: -0.12 },
  black:  { fleece: PALETTE.face, face: PALETTE.face, shade: -0.03 },
}

/** Module-scope scratch, so a step allocates nothing. */
const moment: Moment = { tau: 0, elevation: 0 }
const hold: Hold     = { x: 0, z: 0, yaw: 0, stride: 0, graze: 0, lie: 0 }
const stand          = new THREE.Matrix4()
const part           = new THREE.Matrix4()
const out            = new THREE.Matrix4()
const turn           = new THREE.Euler(0, 0, 0, 'YZX')
const spin           = new THREE.Quaternion()
const place          = new THREE.Vector3()
const scale          = new THREE.Vector3()
const tint           = new THREE.Color()

/** The three meshes every sheep is drawn with, and the sheep. */
interface Herd {
  flock:  Flock
  fleece: THREE.InstancedMesh
  heads:  THREE.InstancedMesh
  legs:   THREE.InstancedMesh
}

/** The island's sheep, standing, walking or lying as they are at `time`. */
function pose (herd: Herd, world: World, time: number): void {
  const { flock, fleece, heads, legs } = herd

  flock.at(time, moment)

  flock.sheep.forEach((sheep, index) => {
    poseOne(herd, world, sheep, index)
  })

  fleece.instanceMatrix.needsUpdate = true
  heads.instanceMatrix.needsUpdate  = true
  legs.instanceMatrix.needsUpdate   = true
}

/** One sheep: where she stands and how, then her fleece, her head and her four legs from that. */
function poseOne ({ flock, fleece, heads, legs }: Herd, { grid }: World, sheep: Sheep, index: number): void {
  const { x, z, yaw, stride, graze, lie } = flock.hold(sheep, moment, hold)

  const ahead = Math.cos(yaw) * REACH * sheep.size
  const aside = Math.sin(yaw) * REACH * sheep.size
  const front = grid.heightAt(x + ahead, z + aside)
  const back  = grid.heightAt(x - ahead, z - aside)
  const pitch = Math.atan2(front - back, REACH * 2 * sheep.size) - DIP * graze * (1 - lie)

  // Her frame: on the ground under her middle, turned to her heading, along
  // the slope, at her size, and sunk by as much leg as she has folded.
  turn.set(0, -yaw, pitch)
  spin.setFromEuler(turn)
  place.set(x, grid.heightAt(x, z), z)
  scale.setScalar(sheep.size)
  stand.compose(place, spin, scale)
  stand.multiply(part.makeTranslation(0, -SINK * lie, 0))

  fleece.setMatrixAt(index, stand)

  // The head about the neck: down to the grass, swept across it.
  const tau  = moment.tau
  const nod  = (UP + (DOWN - UP) * graze) * (1 - lie) + REST * lie
  const crop = SWEEP * graze * Math.sin(tau * CROP + sheep.whim)

  turn.set(0, crop, -nod)
  spin.setFromEuler(turn)
  place.set(NECK.along, NECK.up, 0)
  scale.setScalar(1)
  out.multiplyMatrices(stand, part.compose(place, spin, scale))
  heads.setMatrixAt(index, out)

  // The legs swing in diagonal pairs as she walks, and fold away as she lies.
  const step = tau * CADENCE + sheep.whim

  LEGS.forEach(([ along, side, pair ], leg) => {
    turn.set(0, 0, SWING * stride * Math.sin(step + pair))
    spin.setFromEuler(turn)
    place.set(LEG.along * along, LEG.hip, LEG.aside * side)
    scale.set(1, Math.max(1 - lie, 0.05), 1)
    out.multiplyMatrices(stand, part.compose(place, spin, scale))
    legs.setMatrixAt(index * 4 + leg, out)
  })
}

/** A mesh of the flock: lit like the rocks (so it shares their program), shaded by the clouds, left out of a phone's reflection. */
function herdMesh (world: World, name: string, geometry: THREE.BufferGeometry, count: number, shadow: boolean): THREE.InstancedMesh {
  const material = new THREE.MeshStandardMaterial({ name, flatShading: true, roughness: 1, metalness: 0 })

  shadeUnderClouds(material, world)

  const mesh = new THREE.InstancedMesh(geometry, material, count)

  mesh.name          = name
  mesh.castShadow    = shadow
  mesh.receiveShadow = true
  mesh.frustumCulled = false

  if (world.quality.tier === 'mobile')
    keepOutOfMirror(mesh)

  return mesh
}

/** Colour each sheep's fleece, face and legs by her coat, no two quite alike. */
function colour ({ flock, fleece, heads, legs }: Herd): void {
  flock.sheep.forEach((sheep, index) => {
    const coat = COATS[sheep.coat]
    const wear = sheep.whim % 1 * 0.06 - 0.03

    fleece.setColorAt(index, tint.set(coat.fleece).offsetHSL(0, 0, wear))
    tint.set(coat.face).offsetHSL(0, 0, coat.shade + wear / 2)
    heads.setColorAt(index, tint)

    for (let leg = 0; leg < 4; leg += 1)
      legs.setColorAt(index * 4 + leg, tint)
  })
}

/**
 * The flock: sheep on the island's grass, each on its own heft. Still
 * nobody: they are someone's, and the fold and the head-dyke were built for
 * them, but they keep themselves.
 *
 * A sheep grazes in one place a while, head down, now and then lifting it to
 * look round, then turns and walks a few strides to the next, round and
 * round. As the sun goes down they stop and lie down one by one, and they are
 * up again at first light. Three instanced meshes: fleeces, heads, legs.
 */
export function createFlockFeature (world: World): Feature {
  let herd: Herd | null = null

  return {
    name: 'flock',

    build ({ scene, rng }) {
      const { ground, summit, path, shelter, infield, wood, clutter, quality } = world
      const flock                                                              = createFlock({ ground, summit, path, shelter, infield, wood }, world.seed, quality.tier, clutter.distanceTo)
      const count                                                              = flock.sheep.length
      const seed                                                               = rng.fork('flock:fleece').int(1, 1_000_000)

      herd = {
        flock,
        fleece: herdMesh(world, 'fleece', createFleeceGeometry(seed, quality.tier === 'mobile' ? 1 : 0), count, true),
        heads:  herdMesh(world, 'sheep-heads', createHeadGeometry(), count, true),
        legs:   herdMesh(world, 'sheep-legs', createLegGeometry(), count * 4, false),
      }

      colour(herd)
      pose(herd, world, 0)

      for (const mesh of [ herd.fleece, herd.heads, herd.legs ]) {
        commitInstances(mesh)
        scene.add(mesh)
      }
    },

    update (_state, frame) {
      if (herd)
        pose(herd, world, frame.frame * STEP)
    },

    dispose () {
      disposeInstances(herd?.fleece ?? null)
      disposeInstances(herd?.heads ?? null)
      disposeInstances(herd?.legs ?? null)
      herd = null
    },
  }
}

// perf: cheap — three draw calls, two shadow passes and three more in the
// sea's reflection (none there on a phone): some 70 sheep on desktop and 40
// on a phone, at 36 + 44 + 4 × 8 triangles (20 for a phone's fleece): 8k a
// pass, 22k all told on desktop. A step is the sun's height once, and for
// each sheep a short walk round her places, three ground samples and six
// matrices.
