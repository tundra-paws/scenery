// src/world/shared/instances.ts
import * as THREE from 'three'

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
