// src/world/features/shelter/body.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'threejs-scenes/primitives'

import { DARK, createTurfSlope, paint } from '../../shared/roof.ts'
import { CHIMNEY, DOOR_EASE, DOOR_HALF, DOOR_TOP, EAVE, EAVES, HALF_DEEP, HALF_LONG, INSET, RIDGE, TURF, VERGE, WINDOW, underRoof } from './plan.ts'


/** The roof, as the shared turf slope reads it. */
const ROOF = { halfDeep: HALF_DEEP, halfLong: HALF_LONG, eave: EAVE, ridge: RIDGE, turf: TURF, eaves: EAVES, verge: VERGE } as const

/** A spot on a wall's own sheet, to where it is in the house. */
type Place = (across: number, up: number) => readonly [number, number, number]

/** A wall or an opening on a wall's own sheet: its left, its foot, its right and its head. */
type Sheet = readonly [number, number, number, number]

/**
 * One flat wall of the core as triangles, less a hole where the house has an
 * opening. It faces the side from which `across` runs to the right.
 */
function wall (corners: number[], [ left, foot, right, head ]: Sheet, hole: Sheet | null, place: Place): void {
  const pieces: Sheet[] = hole
    ? [[ left, foot, hole[0], head ], [ hole[2], foot, right, head ], [ hole[0], foot, hole[2], hole[1] ], [ hole[0], hole[3], hole[2], head ]]
    : [[ left, foot, right, head ]]

  for (const [ from, low, to, high ] of pieces)
    if (to - from > 0.01 && high - low > 0.01)
      corners.push(...place(from, low), ...place(to, low), ...place(to, high), ...place(from, low), ...place(to, high), ...place(from, high))
}

/**
 * The inside, seen from outside: a house-shaped shell just within the walls'
 * line, from under the ground to under the roof. It is what is dark between
 * the stones, and what throws the house's shadow. The doorway and the window
 * are left out of it: through them the room itself is seen (`features/hearth`).
 */
function createCore (foot: number): THREE.BufferGeometry {
  const half    = HALF_DEEP - INSET
  const long    = HALF_LONG - INSET
  const eave    = underRoof(half) - 0.04
  const ridge   = RIDGE - 0.04
  const corners = [] as number[]
  const door    = [ -DOOR_HALF - DOOR_EASE, 0, DOOR_HALF + DOOR_EASE, DOOR_TOP + 0.05 ] as const
  const light   = [ -WINDOW.to, WINDOW.sill, -WINDOW.from, WINDOW.head ] as const

  wall(corners, [ -long, foot, long, eave ], null, (across, up) => [ -half, up, across ])
  wall(corners, [ -long, foot, long, eave ], light, (across, up) => [ half, up, -across ])
  wall(corners, [ -half, foot, half, eave ], null, (across, up) => [ -across, up, -long ])
  wall(corners, [ -half, foot, half, eave ], door, (across, up) => [ across, up, long ])

  // The gables' points, and the two slopes under the turf.
  corners.push(half, eave, -long, -half, eave, -long, 0, ridge, -long, -half, eave, long, half, eave, long, 0, ridge, long)
  corners.push(-half, eave, long, 0, ridge, long, 0, ridge, -long, -half, eave, long, 0, ridge, -long, -half, eave, -long)
  corners.push(half, eave, -long, 0, ridge, -long, 0, ridge, long, half, eave, -long, 0, ridge, long, half, eave, long)

  const core = new THREE.BufferGeometry()

  core.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  core.computeVertexNormals()

  return paint(core, () => DARK)
}

/** The flue: a dark post up the middle of the chimney's stones, to just under their top. */
function createFlue (): THREE.BufferGeometry {
  const half = CHIMNEY.half - 0.2
  const flue = new THREE.BoxGeometry(half * 2, CHIMNEY.over + 0.5, half * 2)

  flue.translate(0, RIDGE + CHIMNEY.over / 2 - 0.35, CHIMNEY.along)

  return paint(flue, () => DARK)
}

/**
 * Everything of the shelter that is not a stone, as one geometry in the
 * shelter's own frame: the dark inside, the flue, and the turf roof. Coloured
 * per vertex. `foot` is how far under the floor the lowest ground is.
 */
export function createBodyGeometry (seed: number, foot: number): THREE.BufferGeometry {
  const noise = createNoise3D(seed)
  const parts = [ createCore(foot), createFlue(), createTurfSlope(ROOF, -1, noise), createTurfSlope(ROOF, 1, noise) ]
  const body  = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

  body.computeBoundingBox()
  body.computeBoundingSphere()

  return body
}

// perf: cheap — 300 triangles, built once.
