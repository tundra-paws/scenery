// src/world/features/skerry/seal.ts
import * as THREE from 'three'
import { smoothstep } from 'threejs-scenes/primitives'

import type { Haul, Seal, Swim } from '../../shared/skerry.ts'

/** A seal's measures at size 1, in its own frame (x to its nose, y up off the rock): half its length and half its depth. */
const LONG  = 1.5
const GIRTH = 0.43

/** Where its neck and its hips are, and how far past each the head's and the flippers' own middles lie. */
const NECK = { along: LONG * 0.72, up: GIRTH * 0.8, reach: 0.34 } as const
const HIPS = { along: -LONG * 0.78, up: GIRTH * 0.45, reach: 0.42 } as const

/** The head's angle up from level, flat on the rock and lifted; and the flippers'. */
const NOD  = [ -0.25, 0.95 ] as const
const CURL = [ -0.1, 0.9 ] as const

/** How much of the one in the water shows when it is up, and how far its nose is tipped back to breathe. */
const AFLOAT = 0.3
const TIPPED = 0.45

/** Lumps a seal is drawn with: its body, its head, its hind flippers. */
export const LUMPS = 3

/** Each part as the one lump stretched: the body as it is, the other two turned end for end. */
const BODY  = new THREE.Matrix4().makeTranslation(0, GIRTH * 0.5 - 0.06, 0)
  .scale(new THREE.Vector3(LONG, GIRTH, GIRTH * 1.12))

const HEAD  = new THREE.Matrix4().makeRotationY(Math.PI)
  .scale(new THREE.Vector3(0.46, 0.3, 0.31))

const FLIPS = new THREE.Matrix4().makeRotationY(Math.PI)
  .scale(new THREE.Vector3(0.5, 0.09, 0.32))

/** Module-scope scratch, so a step allocates nothing. */
const ahead = new THREE.Vector3()
const up    = new THREE.Vector3()
const aside = new THREE.Vector3()
const stand = new THREE.Matrix4()
const joint = new THREE.Matrix4()
const part  = new THREE.Matrix4()
const out   = new THREE.Matrix4()
const turn  = new THREE.Euler(0, 0, 0, 'YZX')
const size  = new THREE.Vector3()
const none  = new THREE.Matrix4().makeScale(0, 0, 0)

/**
 * The one lump a seal is made of, three times over: an icosahedron drawn out
 * along x, thickest a third of the way forward, tapering to a blunt end ahead
 * and a thin one behind, and flat underneath where it lies on the rock.
 *
 * A faceted lump with a smaller one for a head, as a sheep is a woolsack:
 * never a model of a seal.
 */
export function createLumpGeometry (): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const x     = position.getX(index)
    const girth = x > 0.35 ? THREE.MathUtils.lerp(1, 0.62, (x - 0.35) / 0.65) : THREE.MathUtils.lerp(0.3, 1, smoothstep(-1, 0.35, x))

    position.setXYZ(index, x, Math.max(position.getY(index) * girth, -0.5), position.getZ(index) * girth)
  }

  geometry.deleteAttribute('uv')
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

/**
 * One seal's three lumps, from `index * LUMPS` on: laid along the rock as
 * its face lies, its head up by `lift` and round by `turn`, its flippers up
 * by `tail`.
 */
export function poseSeal (mesh: THREE.InstancedMesh, index: number, seal: Seal, { lift, turn: round, tail }: Haul): void {
  // Its frame: up is the way the rock's face looks, ahead is its heading laid on that face.
  up.set(...seal.lie)
  ahead.set(Math.cos(seal.yaw), 0, Math.sin(seal.yaw)).addScaledVector(up, -up.x * Math.cos(seal.yaw) - up.z * Math.sin(seal.yaw))
    .normalize()
  aside.crossVectors(ahead, up)

  stand.makeBasis(ahead, up, aside).setPosition(seal.x, seal.y, seal.z)
    .scale(size.setScalar(seal.size))

  mesh.setMatrixAt(index * LUMPS, out.multiplyMatrices(stand, BODY))

  turn.set(0, round, THREE.MathUtils.lerp(NOD[0], NOD[1], lift))
  joint.makeRotationFromEuler(turn).setPosition(NECK.along, NECK.up, 0)
  part.makeTranslation(NECK.reach, 0.02, 0).multiply(HEAD)
  mesh.setMatrixAt(index * LUMPS + 1, out.multiplyMatrices(stand, joint).multiply(part))

  turn.set(0, 0, -THREE.MathUtils.lerp(CURL[0], CURL[1], tail))
  joint.makeRotationFromEuler(turn).setPosition(HIPS.along, HIPS.up, 0)
  part.makeTranslation(-HIPS.reach, 0, 0).multiply(FLIPS)
  mesh.setMatrixAt(index * LUMPS + 2, out.multiplyMatrices(stand, joint).multiply(part))
}

/** The one in the water: a head and nothing else, nose tipped back, as far out of the sea at `level` as it is up. */
export function poseSwimmer (mesh: THREE.InstancedMesh, index: number, swim: Swim, level: number): void {
  if (swim.up <= 0.01) {
    mesh.setMatrixAt(index, none)

    return
  }

  turn.set(0, -swim.yaw, TIPPED)
  joint.makeRotationFromEuler(turn).setPosition(swim.x, level + AFLOAT * (swim.up * 2 - 1), swim.z)
  mesh.setMatrixAt(index, out.multiplyMatrices(joint, HEAD))
}

// perf: trivial — eighty triangles a lump; a pose is three small matrix
// products a seal.
