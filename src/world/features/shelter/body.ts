// src/world/features/shelter/body.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'threejs-scenes/primitives'

import { DARK, createTurfSlope, paint } from '../../shared/roof.ts'
import { CHIMNEY, EAVE, EAVES, HALF_DEEP, HALF_LONG, INSET, RIDGE, TURF, VERGE, underRoof } from './plan.ts'


/** The roof, as the shared turf slope reads it. */
const ROOF = { halfDeep: HALF_DEEP, halfLong: HALF_LONG, eave: EAVE, ridge: RIDGE, turf: TURF, eaves: EAVES, verge: VERGE } as const

/**
 * The inside, seen from outside: a house-shaped block just within the walls'
 * line, from under the ground to under the roof. It is what is dark between
 * the stones, and what keeps the hill from showing through them.
 */
function createCore (foot: number): THREE.BufferGeometry {
  const half  = HALF_DEEP - INSET
  const eave  = underRoof(half) - 0.04
  const shape = new THREE.Shape()

  shape.moveTo(-half, foot)
  shape.lineTo(half, foot)
  shape.lineTo(half, eave)
  shape.lineTo(0, RIDGE - 0.04)
  shape.lineTo(-half, eave)
  shape.closePath()

  const core = new THREE.ExtrudeGeometry(shape, { depth: (HALF_LONG - INSET) * 2, bevelEnabled: false })

  core.translate(0, 0, INSET - HALF_LONG)

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
