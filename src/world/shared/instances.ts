// src/world/shared/instances.ts
import * as THREE from 'three'

/**
 * Tell a mesh's shader how tall each of its instances was stretched, as the
 * instanced attribute `aReach`: the sway is so much of a blade's height.
 */
export function tellReach (mesh: THREE.InstancedMesh): void {
  const reach = new Float32Array(mesh.instanceMatrix.count)

  for (let index = 0; index < mesh.count; index += 1)
    reach[index] = Math.hypot(...mesh.instanceMatrix.array.subarray(index * 16 + 4, index * 16 + 7))

  mesh.geometry.setAttribute('aReach', new THREE.InstancedBufferAttribute(reach, 1))
}

/** Call once every matrix and colour is set: uploads them and fits the culling sphere. */
export function commitInstances (mesh: THREE.InstancedMesh): void {
  mesh.instanceMatrix.needsUpdate = true

  if (mesh.instanceColor)
    mesh.instanceColor.needsUpdate = true

  mesh.computeBoundingSphere()
}

/** Frees an instanced mesh that owns its geometry and its material, and unhooks it. */
export function disposeInstances (mesh: THREE.InstancedMesh | null): void {
  if (!mesh)
    return

  mesh.geometry.dispose()

  if (mesh.material instanceof THREE.Material)
    mesh.material.dispose()

  mesh.removeFromParent()
  mesh.dispose()
}
