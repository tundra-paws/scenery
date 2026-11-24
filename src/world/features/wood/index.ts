// src/world/features/wood/index.ts
import * as THREE from 'three'
import { createNoise3D } from 'threejs-scenes/primitives'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import type { Wind } from '../../shared/wind.ts'
import type { Feature, World } from '../../world.ts'
import { growBirch } from './birch.ts'
import { cutStumps, stackLogs } from './cut.ts'
import { createTimber } from './timber.ts'

/**
 * How far a tree's top goes downwind, as a part of its height: what a full
 * gust adds to the lean it grew with, and the slow rocking on top of that.
 */
const GIVE = 0.05
const ROCK = 0.012

/** How far a lump of leaves is tossed, in world units, on top of what its tree does. */
const FLUTTER = 0.11

/**
 * The sway, for a vertex shader. The wood is one mesh in world space, so a
 * vertex is pushed straight along the wind.
 *
 * A tree reads the gust at its own foot, so a front is seen to cross the
 * wood from tree to tree, and it gives by the square of the height: `sway.z`
 * already holds that, in world units, and is nothing for cut wood. Each lump
 * of leaves is tossed whole, out of step with the next.
 */
const SWAY_VERTEX = /* glsl */ `
  vec2  treeAir  = windFrame(sway.xy);
  float treeGust = windGust(sway.xy);
  float treeGive = ${GIVE} * treeGust + ${ROCK} * sin(dot(treeAir, vec2(61.0, -47.0)) + sway.x) * (0.3 + 0.7 * treeGust);
  float leafToss = ${FLUTTER} * step(0.001, sway.w) * (0.35 + 0.65 * treeGust);
  float leafTurn = dot(treeAir, vec2(173.0, -131.0)) + sway.w * 43.0;

  transformed.xz += WIND * (treeGive * sway.z + leafToss * sin(leafTurn));
  transformed.y  += leafToss * 0.6 * cos(leafTurn * 1.3) - treeGive * treeGive * sway.z * 0.5;
`

/** Let a material of the wood give to the wind. The same for what is seen and for the shadow it throws. */
function swayInWind (material: THREE.Material, wind: Wind): void {
  amendShader(material, 'wood-sway', shader => {
    Object.assign(shader.uniforms, wind.uniforms)

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', `${WIND_GLSL}attribute vec4 sway;`),
      '#include <begin_vertex>',
      SWAY_VERTEX,
    )
  })
}

/**
 * The wood: a stand of downy birch on the low ground east of the shelter,
 * every tree bent the way the wind has always blown, and a few more alone
 * out on the open island, bent harder.
 *
 * The first thing on the island taller than grass that nobody put there,
 * and what the fire in the shelter burns: the trees nearest the door are
 * stumps, and their wood is stacked under the eave. Pale trunks, the
 * meadow's greens in the leaves, and all of it one mesh, which leans and
 * tosses with the same gusts as the grass under it.
 */
export function createWoodFeature (world: World): Feature {
  let mesh: THREE.Mesh | null               = null
  let depth: THREE.MeshDepthMaterial | null = null

  return {
    name: 'wood',

    build ({ scene, rng }) {
      const { wood, wind, ground, shelter, quality } = world

      const timber = createTimber(createNoise3D(rng.fork('wood:leaves').int(1, 1_000_000)))
      const grow   = rng.fork('wood:grow')

      // The ball every lump of leaves is cut from. Unindexed, so each face
      // has corners of its own and is shaded flat.
      const sphere = new THREE.IcosahedronGeometry(1, 1)
      const ball   = sphere.getAttribute('position').array

      for (const tree of [ ...wood.trees, ...wood.outliers ])
        growBirch(timber, tree, { tier: quality.tier, lee: wind.direction, rng: grow, ball })

      cutStumps(timber, wood.stumps, rng.fork('wood:stumps'))
      stackLogs(timber, shelter, ground, rng.fork('wood:stack'))
      sphere.dispose()

      const material = new THREE.MeshStandardMaterial({ name: 'wood', vertexColors: true, roughness: 1, metalness: 0 })

      swayInWind(material, wind)
      shadeUnderClouds(material, world)

      // The shadow gives with the tree: the same push in the depth pass.
      depth = new THREE.MeshDepthMaterial({ name: 'wood-shadow', depthPacking: THREE.RGBADepthPacking })
      swayInWind(depth, wind)

      mesh                     = new THREE.Mesh(timber.build(), material)
      mesh.name                = 'wood'
      mesh.castShadow          = true
      mesh.receiveShadow       = true
      mesh.customDepthMaterial = depth

      // Behind the beach from most of the sea, and the island's costliest
      // mesh: a phone leaves it out of the sea's reflection.
      if (world.quality.tier === 'mobile')
        keepOutOfMirror(mesh)

      scene.add(mesh)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      depth?.dispose()
      mesh?.removeFromParent()
      mesh  = null
      depth = null
    },
  }
}

// perf: medium — one draw call and one shadow pass for all of it: 72 birches
// (the wood's 52 and the island's 20) and the cut wood, 28k triangles on the
// mobile tier and 43k on desktop, drawn twice. The sway is five sines a
// vertex in the shader, from the wind's one uniform; nothing per frame on
// the CPU.
