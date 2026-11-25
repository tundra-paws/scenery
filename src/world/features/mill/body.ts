// src/world/features/mill/body.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'threejs-scenes/primitives'

import { DARK, createTurfSlope, paint } from '../../shared/roof.ts'
import { EAVE, HALF_DEEP, HALF_LONG, INSET, OUTLET_HALF, RACE, RIDGE, ROOF, ROOM_BACK, UNDER } from './plan.ts'

/** How much wider than the hole in the wall the wheel's room is, each side. */
const CHEEK = 0.22

/** A dark block, from one corner to the other. */
function block (from: readonly [number, number, number], to: readonly [number, number, number]): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(to[0] - from[0], to[1] - from[1], to[2] - from[2])

  box.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2)

  return paint(box, () => DARK)
}

/**
 * The room, seen from outside: a house-shaped block just within the walls'
 * line, from the underside of the floor to under the roof. It is what is
 * dark between the stones.
 */
function createRoom (): THREE.BufferGeometry {
  const half  = HALF_DEEP - INSET
  const eave  = RIDGE - (RIDGE - EAVE) * half / HALF_DEEP - 0.04
  const shape = new THREE.Shape()

  shape.moveTo(-half, -UNDER)
  shape.lineTo(half, -UNDER)
  shape.lineTo(half, eave)
  shape.lineTo(0, RIDGE - 0.04)
  shape.lineTo(-half, eave)
  shape.closePath()

  const room = new THREE.ExtrudeGeometry(shape, { depth: (HALF_LONG - INSET) * 2, bevelEnabled: false })

  room.translate(0, 0, INSET - HALF_LONG)

  return paint(room, () => DARK)
}

/**
 * What is under the floor: the footings, solid and dark down to `foot`, but
 * for the wheel's own room, open to the wall the water leaves by. The burn
 * comes into the dark under the upstream wall and out of it under the wheel.
 */
function createFootings (foot: number): THREE.BufferGeometry[] {
  const deep = HALF_DEEP - INSET
  const long = HALF_LONG - INSET
  const near = RACE - OUTLET_HALF - CHEEK
  const far  = RACE + OUTLET_HALF + CHEEK

  return [
    block([ -deep, foot, far ], [ deep, -UNDER, long ]),
    block([ -deep, foot, -long ], [ deep, -UNDER, Math.max(near, -long + 0.02) ]),
    block([ -deep, foot, near ], [ ROOM_BACK, -UNDER, far ]),
  ]
}

/**
 * Everything of the mill that is not a stone or a board, as one geometry in
 * its own frame: the dark inside, the footings round the wheel's room, and
 * the turf roof. Coloured per vertex. `foot` is how far under the floor the
 * lowest ground is.
 */
export function createBodyGeometry (seed: number, foot: number): THREE.BufferGeometry {
  const noise = createNoise3D(seed)
  const parts = [ createRoom(), ...createFootings(foot), createTurfSlope(ROOF, -1, noise), createTurfSlope(ROOF, 1, noise) ]
  const body  = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

  body.computeBoundingBox()
  body.computeBoundingSphere()

  return body
}

// perf: cheap — some 350 triangles, built once.
