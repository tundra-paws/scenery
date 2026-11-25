// src/world/shared/sheaf.ts
import * as THREE from 'three'

/**
 * A sheaf, foot to ears, as a radius at each height: spread where it
 * stands, drawn in where it is bound, and its ears hanging out over the band.
 */
const SHEAF = [[ 0.19, 0 ], [ 0.085, 0.66 ], [ 0.2, 1.02 ], [ 0.02, 1.1 ]] as const

/** How tall a sheaf stands. */
export const SHEAF_TALL = SHEAF.at(-1)![1]

/**
 * One sheaf of barley, bound, standing on its butt at the origin: thirty
 * triangles. What a stook is six of, and what is carried to the stacks.
 */
export function createSheafGeometry (): THREE.BufferGeometry {
  return new THREE.LatheGeometry(SHEAF.map(([ radius, height ]) => new THREE.Vector2(radius, height)), 5).deleteAttribute('uv')
}
