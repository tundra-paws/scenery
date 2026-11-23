// src/world/features/terrain/index.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { smoothstep } from 'threejs-scenes/primitives'

import { PALETTE } from '../../shared/palette.ts'
import type { Feature, World } from '../../world.ts'


/** Grid cells per side. Triangles are twice the square of this. */
const SEGMENTS: Record<QualityTier, number> = { mobile: 96, desktop: 160, highEnd: 224 }

const SAND  = new THREE.Color(PALETTE.sand)
const GRASS = new THREE.Color(PALETTE.grass)
const DRY   = new THREE.Color(PALETTE.grassDry)
const ROCK  = new THREE.Color(PALETTE.rock)
const SNOW  = new THREE.Color(PALETTE.snow)

const scratch = new THREE.Color()

/**
 * What the ground is made of at a point, as a colour.
 *
 * Height picks the band (sand at the water, grass above it, snow on the tops)
 * and steepness overrides it with rock, because nothing grows on a cliff.
 */
function colourAt (world: World, x: number, z: number, height: number, out: THREE.Color): THREE.Color {
  const { ground } = world
  const above      = height - ground.waterLevel
  const slope      = ground.slopeAt(x, z)

  out.copy(SAND)
  out.lerp(GRASS, smoothstep(0.7, 2.4, above))
  out.lerp(DRY, smoothstep(0.35, 0.6, above / ground.relief))
  out.lerp(SNOW, smoothstep(0.72, 0.86, above / ground.relief))
  out.lerp(ROCK, smoothstep(0.16, 0.34, slope))

  return out
}

/** The land: one heightfield mesh, coloured per vertex, shaded flat. */
export function createTerrain (world: World): Feature {
  let mesh: THREE.Mesh | null = null

  return {
    name: 'terrain',

    build ({ scene }) {
      const { ground } = world
      const segments   = SEGMENTS[world.quality.tier]
      const geometry   = new THREE.PlaneGeometry(ground.size, ground.size, segments, segments)

      geometry.rotateX(-Math.PI / 2)

      const position = geometry.getAttribute('position')
      const colours  = new Float32Array(position.count * 3)

      for (let index = 0; index < position.count; index += 1) {
        const x      = position.getX(index)
        const z      = position.getZ(index)
        const height = ground.heightAt(x, z)

        position.setY(index, height)
        colourAt(world, x, z, height, scratch).toArray(colours, index * 3)
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()

      mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        name:         'terrain',
        vertexColors: true,
        flatShading:  true,
        roughness:    0.96,
        metalness:    0,
      }))
      mesh.name          = 'terrain'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      scene.add(mesh)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      mesh?.removeFromParent()
      mesh = null
    },
  }
}

// perf: medium — one draw call (two with its shadow pass). 18k triangles on the
// mobile tier, 51k on desktop, 100k on highEnd. Built once; nothing per frame.
