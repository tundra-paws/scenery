// src/world/features/terrain/index.ts
import * as THREE from 'three'
import { smoothstep } from 'threejs-scenes/primitives'

import { createLitMaterial } from '../../shared/lit.ts'
import { DEEP_WATER } from '../../shared/ground.ts'
import { PALETTE } from '../../shared/palette.ts'
import { traceTrods } from '../../shared/trods.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createPathWear, wearPath } from './wear.ts'
import type { PathWear } from './wear.ts'
import { wetTheShore } from './wet.ts'
import type { WetShore } from './wet.ts'


const SAND  = new THREE.Color(PALETTE.sand)
const GRASS = new THREE.Color(PALETTE.grass)
const DRY   = new THREE.Color(PALETTE.grassDry)
const ROCK  = new THREE.Color(PALETTE.rock)
const LING  = new THREE.Color(PALETTE.heather)

/** How far the land under the heather goes to its bloom: the bushes on it carry the rest. */
const BLOOM = 0.75

const scratch = new THREE.Color()

/**
 * What the ground is made of at a point, as a colour.
 *
 * Height picks the band (sand at the water, grass above it, straw toward the
 * tops) and steepness overrides it with rock, because nothing grows on a cliff.
 */
function colourAt (world: World, x: number, z: number, slope: number, height: number, out: THREE.Color): THREE.Color {
  const { ground } = world
  const above      = height - ground.waterLevel

  out.copy(SAND)
  out.lerp(GRASS, smoothstep(0.7, 2.4, above))
  out.lerp(DRY, smoothstep(0.35, 0.6, above / ground.relief))
  out.lerp(LING, world.moor.heatherAt(x, z, height, slope) * BLOOM)
  out.lerp(ROCK, smoothstep(0.16, 0.34, slope))

  return out
}

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

/** The land: one heightfield mesh, coloured per vertex, shaded flat, with the path and the ways to the shelter's door and the field gate worn into it, and its foot wet where the sea runs up it. */
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
      const colours  = new Float32Array(position.count * 3)

      // The plane's vertices are the grid's corners, in the grid's order, so
      // each takes its height by index and its slope from its neighbours.
      for (let index = 0; index < position.count; index += 1) {
        const column = index % grid.side
        const height = grid.heights[index]!

        position.setY(index, height)
        colourAt(world, position.getX(index), position.getZ(index), grid.slopeAt(column, (index - column) / grid.side), height, scratch).toArray(colours, index * 3)
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
      geometry.setIndex(cellsAbove(geometry, ground.waterLevel - DEEP_WATER))
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()

      const material = createLitMaterial(world, { name: 'terrain', vertexColors: true, roughness: 0.96 })

      wear = createPathWear(world.path, world.quality.tier, [ world.shelter.spur, world.infield.track ], traceTrods(world, world.seed))

      wearPath(material, wear)
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
