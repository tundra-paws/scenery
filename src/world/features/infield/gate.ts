// src/world/features/infield/gate.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import type { Ground } from '../../shared/ground.ts'
import type { Gate } from '../../shared/infield.ts'
import type { Waypoint } from '../../shared/path.ts'


/** The leaf: as long as the gap, and as high as the dyke, standing a hand off the ground. */
const HEIGHT = 1.4
const FOOT   = 0.14

/** The rails' heights over the leaf's foot. */
const RAILS = [ 0.12, 0.62, 1.22 ] as const

/** How far the gate is swung back from shut, into the field. Left open: someone went through and did not come back yet. */
const OPEN = THREE.MathUtils.degToRad(112)

/** A board as a box, from one end of its middle line to the other, in the leaf's own frame (x along it, y up). */
function board (from: readonly [number, number], to: readonly [number, number], thick: number, deep: number): THREE.BufferGeometry {
  const length   = Math.hypot(to[0] - from[0], to[1] - from[1])
  const geometry = new THREE.BoxGeometry(length, thick, deep)

  geometry.rotateZ(Math.atan2(to[1] - from[1], to[0] - from[0]))
  geometry.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0)

  return geometry
}

/**
 * The field gate: two heads, three rails and a brace, nailed from wood that
 * came in on the tide. One mesh, hung on the post by the corner and left
 * standing open into the field.
 */
export function hangGate (ground: Ground, gate: Gate, house: Waypoint, material: THREE.Material): THREE.Mesh {
  const width = gate.width - 0.08
  const parts = [
    board([ 0.05, 0 ], [ 0.05, HEIGHT ], 0.11, 0.11),
    board([ width - 0.05, 0 ], [ width - 0.05, HEIGHT * 0.94 ], 0.1, 0.1),
    ...RAILS.map(rail => board([ 0, rail ], [ width, rail - 0.04 ], 0.12, 0.07)),
    board([ 0.12, RAILS[0] ], [ width - 0.12, RAILS[2] - 0.04 ], 0.1, 0.06),
  ]

  const geometry = mergeGeometries(parts.map(part => part.deleteAttribute('uv')))

  for (const part of parts)
    part.dispose()

  // Into the field is square to the wall, on the side away from the house.
  const square = [ -gate.along[1], gate.along[0] ] as const
  const inward = (gate.x - house.x) * square[0] + (gate.z - house.z) * square[1] > 0 ? 1 : -1
  const swing  = [ gate.along[0] * Math.cos(OPEN) + square[0] * inward * Math.sin(OPEN), gate.along[1] * Math.cos(OPEN) + square[1] * inward * Math.sin(OPEN) ] as const
  const hinge  = { x: gate.x - gate.along[0] * gate.width / 2, z: gate.z - gate.along[1] * gate.width / 2 }

  const mesh = new THREE.Mesh(geometry, material)

  mesh.name = 'infield-gate'
  mesh.position.set(hinge.x, ground.heightAt(hinge.x, hinge.z) + FOOT, hinge.z)
  mesh.rotation.y    = Math.atan2(-swing[1], swing[0])
  mesh.castShadow    = true
  mesh.receiveShadow = true

  return mesh
}

// perf: trivial — one draw call (two with its shadow pass), six boxes: 72
// triangles. Hung once; nothing per frame.
