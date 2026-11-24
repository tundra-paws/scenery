// src/world/features/flock/sheep.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'threejs-scenes/primitives'

/**
 * A grown ewe, in world units, standing with her feet at y 0 and facing +x:
 * her fleece's length, depth and breadth, and the height of its middle.
 */
export const BODY = { long: 1.2, deep: 0.62, broad: 0.66, middle: 0.66 } as const

/** Where the legs are let into the fleece (forward and to the side of its middle), how long they are and how thick. */
export const LEG = { along: 0.33, aside: 0.16, hip: 0.44, long: 0.44, thick: 0.09 } as const

/** Where the neck leaves the fleece, and how long the head is on it, from the neck to the nose. */
export const NECK = { along: 0.46, up: 0.74 } as const

const HEAD_LONG   = 0.56

/** How far a sheep lying down has sunk: the length of leg that is folded under her. */
export const SINK = 0.38

/**
 * The fleece: a stone's icosahedron, stretched long and pushed into lumps,
 * so the faceting reads as wool. Eighty triangles; twenty at `detail` 0.
 */
export function createFleeceGeometry (seed: number, detail: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.5, detail)
  const noise    = createNoise3D(seed)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)

    // Keyed on position, so the corners that faces share stay together. The
    // rump is a little fuller than the shoulder, and the back flatter than the belly.
    const lump = 1 + noise.sample(x * 3.1, y * 3.1, z * 3.1) * 0.1
    const rump = 1 + Math.max(0, -x) * 0.16

    position.setXYZ(
      index,
      x * BODY.long * lump,
      Math.min(y, 0.36) * BODY.deep * lump * rump + BODY.middle,
      z * BODY.broad * lump * rump,
    )
  }

  geometry.computeVertexNormals()

  return geometry
}

/**
 * The head and neck as one: a wedge from the neck at the origin to the nose
 * along +x, narrowing to a muzzle, with an ear out to each side. The sheep
 * dips it about the neck to graze.
 */
export function createHeadGeometry (): THREE.BufferGeometry {
  const head     = new THREE.BoxGeometry(HEAD_LONG, 0.21, 0.18, 2, 1, 1)
  const position = head.getAttribute('position')

  head.translate(HEAD_LONG / 2, 0, 0)

  // Narrow and shallow at the nose, and the neck's end a little lower than
  // its top, so it hangs from the fleece.
  for (let index = 0; index < position.count; index += 1) {
    const along = position.getX(index) / HEAD_LONG
    const taper = 1 - along * 0.32

    position.setY(index, position.getY(index) * taper - along * 0.02)
    position.setZ(index, position.getZ(index) * taper)
  }

  const ears = [ -1, 1 ].map(side => {
    const ear = new THREE.BoxGeometry(0.05, 0.035, 0.15)

    ear.rotateX(side * 0.35)
    ear.translate(HEAD_LONG * 0.42, 0.07, side * 0.13)

    return ear.toNonIndexed()
  })

  const merged = mergeGeometries([ head.toNonIndexed(), ...ears ])

  merged.computeVertexNormals()
  head.dispose()

  for (const ear of ears)
    ear.dispose()

  return merged
}

/** A leg: a thin post hung from the origin, its foot at -`LEG.long`. Eight triangles: nobody sees its ends. */
export function createLegGeometry (): THREE.BufferGeometry {
  const leg = new THREE.CylinderGeometry(LEG.thick / 2, LEG.thick * 0.4, LEG.long, 4, 1, true)

  leg.rotateY(Math.PI / 4)
  leg.translate(0, -LEG.long / 2, 0)

  return leg
}

// perf: cheap, once — three small geometries, shared by every sheep:
// a fleece of 80 triangles (20 on a phone), a head of 44, a leg of 8.
