// src/world/shared/lump.ts
import * as THREE from 'three'

/** Where along a lump its widest part is, from -1 at its blunt end to 1 at its point: a breast, or a wing's root. */
const WAIST = -0.45

/**
 * The one shape every lump of a bird is: a spindle along z, blunt at one end
 * and drawn out to a point at the other, widest near the blunt end. Stretched
 * one way it is a body with its breast forward, another a wing tapering to
 * its tip, another a neck held out. Eight triangles.
 *
 * The gulls and the geese are both made of it: a bird here is a few faceted
 * lumps, never a model of one.
 */
export function createLumpGeometry (): THREE.BufferGeometry {
  const ends     = [[ 0, 0, 1 ], [ 0, 0, -1 ]] as const
  const waist    = [[ 1, 0, WAIST ], [ 0, 1, WAIST ], [ -1, 0, WAIST ], [ 0, -1, WAIST ]] as const
  const corners  = [] as number[]
  const geometry = new THREE.BufferGeometry()

  for (let side = 0; side < 4; side += 1) {
    const from = waist[side]!
    const to   = waist[(side + 1) % 4]!

    corners.push(...from, ...to, ...ends[0], ...to, ...from, ...ends[1])
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  geometry.computeVertexNormals()

  return geometry
}

// perf: trivial — eight triangles, built once for each kind of bird.
