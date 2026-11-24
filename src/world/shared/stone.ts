// src/world/shared/stone.ts
import * as THREE from 'three'
import { createNoise3D } from 'threejs-scenes/primitives'

/**
 * One stone: an icosahedron pushed around by noise, squashed a little so it sits.
 *
 * Every stone in the world is this shape at some scale, loose on a slope or
 * stacked by hand, which is what makes a cairn read as built from the island.
 * Eighty triangles; at `detail` 0 a rougher twenty, for walls of hundreds.
 */
export function createStoneGeometry (seed: number, detail = 1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const noise    = createNoise3D(seed)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)

    // Keyed on position, so the duplicated corners of neighbouring faces move
    // together and the surface stays closed.
    const bump = 1 + noise.sample(x * 1.3, y * 1.3, z * 1.3) * 0.3

    position.setXYZ(index, x * bump, y * bump * 0.72, z * bump)
  }

  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}
