// src/world/shared/boards.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Module-scope scratch. */
const along = new THREE.Vector3(1, 0, 0)
const way   = new THREE.Vector3()
const lie   = new THREE.Quaternion()

/** A board as a box, from one end of its middle line to the other. */
export function board (from: THREE.Vector3, to: THREE.Vector3, thick: number, deep: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(from.distanceTo(to), thick, deep)

  geometry.applyQuaternion(lie.setFromUnitVectors(along, way.copy(to).sub(from)
    .normalize()))
  geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)

  return geometry
}

/** Several boards as one geometry, with nothing the material does not read. */
export function join (parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts.map(part => part.deleteAttribute('uv')))

  for (const part of parts)
    part.dispose()

  geometry.computeBoundingSphere()

  return geometry
}

// perf: trivial — twelve triangles a board, built once.
