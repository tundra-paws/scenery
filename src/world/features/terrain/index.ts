// src/world/features/terrain/index.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import { DEEP_WATER } from '../../shared/ground.ts'
import { traceTrods } from '../../shared/trods.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { describeLand, textureLand } from './land.ts'
import { createPathWear, wearPath } from './wear.ts'
import type { PathWear } from './wear.ts'
import { wetTheShore } from './wet.ts'
import type { WetShore } from './wet.ts'


/**
 * The grid's triangles, without the cells that lie wholly under deep water.
 *
 * The sea hides everything below `DEEP_WATER`, and two fifths of the square is
 * that deep: its corners and the foot of the shelf. A cell is two triangles,
 * six indices in a row, and stays if any corner of it is above `floor`. Whole
 * cells, because the water reads its depth from the cell's four corners.
 */
function cellsAbove (geometry: THREE.BufferGeometry, floor: number): number[] {
  const position       = geometry.getAttribute('position')
  const index          = geometry.getIndex()
  const kept: number[] = []

  for (let cell = 0; index && cell < index.count; cell += 6) {
    const corners = Array.from({ length: 6 }, (_, corner) => index.getX(cell + corner))

    if (corners.some(corner => position.getY(corner) > floor))
      kept.push(...corners)
  }

  return kept
}

/** The land: one heightfield mesh, textured a fragment (`land.ts`), shaded flat under its relief, its crags pushed out of true, the birches' leaves lying under them (`aLitter`), with the path and the ways to the shelter's door and the field gate worn into it, and its foot wet where the sea runs up it. */
export function createTerrain (world: World): Feature {
  let mesh: THREE.Mesh | null = null
  let wear: PathWear | null   = null
  let shore: WetShore | null  = null

  return {
    name: 'terrain',

    build ({ scene }) {
      const { ground, grid } = world
      const geometry         = new THREE.PlaneGeometry(ground.size, ground.size, grid.segments, grid.segments)

      geometry.rotateX(-Math.PI / 2)

      const position = geometry.getAttribute('position')
      const said     = new Float32Array(position.count * 4)
      const fallen   = new Float32Array(position.count)

      // The plane's vertices are the grid's corners, in the grid's order, so
      // each takes its height by index and its slope from its neighbours.
      for (let index = 0; index < position.count; index += 1) {
        const column = index % grid.side
        const height = grid.heights[index]!

        position.setY(index, height)
        describeLand(world, position.getX(index), position.getZ(index), grid.slopeAt(column, (index - column) / grid.side), height, said, index * 4)
        fallen[index] = height > ground.waterLevel ? world.wood.litterAt(position.getX(index), position.getZ(index), world.wind.direction) : 0
      }

      geometry.setAttribute('aLand', new THREE.BufferAttribute(said, 4))
      geometry.setAttribute('aLitter', new THREE.BufferAttribute(fallen, 1))
      geometry.setIndex(cellsAbove(geometry, ground.waterLevel - DEEP_WATER))
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()

      const material = createLitMaterial(world, { name: 'terrain', roughness: 0.96 })
      const land     = textureLand(world)

      material.finish(land.surface)
      material.positionNode = land.position

      wear = createPathWear(world.path, world.quality.tier, [ world.shelter.spur, world.infield.track, world.mill.spur, ...world.yard.ways, world.pier.way ], traceTrods(world, world.seed))

      wearPath(material, wear, land.grit)
      shore = wetTheShore(material, world.wind, ground.waterLevel)

      mesh               = new THREE.Mesh(geometry, material)
      mesh.name          = 'terrain'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      scene.add(mesh)
    },

    update (_state, frame) {
      if (shore)
        shore.time.value = frame.frame * STEP
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      wear?.texture.dispose()
      mesh?.removeFromParent()
      mesh  = null
      wear  = null
      shore = null
    },
  }
}

// perf: medium — one draw call (two with its shadow pass). 11k triangles on the
// mobile tier, 30k on desktop, 58k on highEnd: the grid less the two fifths of
// it under deep water. The path is one small texture and one lookup a fragment
// (`wear.ts`), the wet sand two sines (`wet.ts`). Built once; a step sets the
// wash's clock.
