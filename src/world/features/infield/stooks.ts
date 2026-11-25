// src/world/features/infield/stooks.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { SeededRng } from 'threejs-scenes'

import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { createSheafGeometry } from '../../shared/sheaf.ts'
import type { Stook } from './rigs.ts'

/** Pairs of sheaves in a stook, how far apart the pairs stand along it, how far each foot is from its middle line, and how far a sheaf leans in. */
const PAIRS = 3
const APART = 0.34
const FOOT  = 0.3
const LEAN  = 0.3

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** One stook, about the middle of its foot: pairs of sheaves along x, each pair leaning head to head across it. */
function createStookGeometry (): THREE.BufferGeometry {
  const sheaves = Array.from({ length: PAIRS * 2 }, (_, index) => {
    const side  = index & 1 ? 1 : -1
    const pair  = (index >> 1) - (PAIRS - 1) / 2
    const sheaf = createSheafGeometry()

    sheaf.rotateX(-side * LEAN)
    sheaf.rotateY(index * 1.3)
    sheaf.translate(pair * APART, 0, side * FOOT)

    return sheaf
  })

  const stook = mergeGeometries(sheaves)

  for (const sheaf of sheaves)
    sheaf.dispose()

  stook.computeVertexNormals()
  stook.computeBoundingSphere()

  return stook
}

/**
 * The stooks on the cut rigs, as one instanced mesh: the barley's own
 * colour, bleached a little by a few days of standing out.
 *
 * Sheaves bound and stood head to head in a short row, the way a field is
 * left to dry before it is carried: the first of it has gone to the mill.
 * Each a little out of line and none quite the size of the next.
 */
export function standStooks (stooks: readonly Stook[], material: THREE.Material, lay: SeededRng): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(createStookGeometry(), material, Math.max(1, stooks.length))

  stooks.forEach(({ x, y, z, turn }, index) => {
    const size = lay.range(0.86, 1.08)

    dummy.position.set(x + lay.range(-0.12, 0.12), y - 0.04, z + lay.range(-0.12, 0.12))
    dummy.rotation.set(lay.range(-0.05, 0.05), turn + lay.range(-0.35, 0.35), lay.range(-0.05, 0.05))
    dummy.scale.set(size, size * lay.range(0.92, 1.08), size)
    dummy.updateMatrix()

    mesh.setMatrixAt(index, dummy.matrix)
    mesh.setColorAt(index, tint.set(PALETTE.barley).offsetHSL(0, -0.06, lay.range(0, 0.07)))
  })

  mesh.name          = 'infield-stooks'
  mesh.count         = stooks.length
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass). A stook is six
// sheaves of 30 triangles; a dozen or so stooks: some 2.5k. Stood once;
// nothing per frame.
