// src/world/features/wood/index.ts
import * as THREE from 'three'
import { cos, dot, positionLocal, sin, smoothstep, step, vec2, vec3 } from 'three/tsl'
import { createNoise3D } from 'threejs-scenes/primitives'

import { createLitMaterial } from '../../shared/lit.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { vec4Attribute } from '../../shared/nodes.ts'
import { birch, inItself } from '../../shared/surface.ts'
import type { Wind } from '../../shared/wind.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { growBirch } from './birch.ts'
import { cutStumps, stackLogs } from './cut.ts'
import { createFall } from './fall.ts'
import type { Fall } from './fall.ts'
import { createTimber } from './timber.ts'

/**
 * How far a tree's top goes downwind, as a part of its height: what a full
 * gust adds to the lean it grew with, and the slow rocking on top of that.
 */
const GIVE = 0.05
const ROCK = 0.012

/** How far a lump of leaves is tossed, in world units, on top of what its tree does. */
const FLUTTER = 0.11

/** How far a trunk's vertex travels with a gust (`sway.z`) below which it is the dark, rough foot of the tree. */
const FOOT = 0.5

/**
 * Let the wood's material give to the wind. The wood is one mesh in world
 * space, so a vertex is pushed straight along the wind; its shadow is drawn
 * from the same place, so it gives with the tree.
 *
 * A tree reads the gust at its own foot (`sway.xy`), so a front is seen to
 * cross the wood from tree to tree, and it gives by the square of the
 * height: `sway.z` already holds that, in world units, and is nothing for
 * cut wood. Each lump of leaves (`sway.w`) is tossed whole, out of step with
 * the next.
 */
function swayInWind (material: LitMaterial, wind: Wind): void {
  const sway = vec4Attribute('sway')
  const air  = wind.nodes.frame(sway.xy)
  const gust = wind.nodes.gust(sway.xy)
  const give = gust.mul(GIVE).add(sin(dot(air, vec2(61, -47)).add(sway.x)).mul(ROCK)
    .mul(gust.mul(0.7).add(0.3)))
  const toss  = step(0.001, sway.w).mul(FLUTTER)
    .mul(gust.mul(0.65).add(0.35))
  const turn  = dot(air, vec2(173, -131)).add(sway.w.mul(43))
  const along = give.mul(sway.z).add(toss.mul(sin(turn)))
  const lift  = toss.mul(0.6).mul(cos(turn.mul(1.3)))
    .sub(give.mul(give).mul(sway.z)
      .mul(0.5))

  material.positionNode = positionLocal.add(vec3(along.mul(wind.direction[0]), lift, along.mul(wind.direction[1])))
}

/**
 * The wood: a stand of downy birch on the low ground east of the shelter,
 * every tree bent the way the wind has always blown, and a few more alone
 * out on the open island, bent harder.
 *
 * The first thing on the island taller than grass that nobody put there,
 * and what the fire in the shelter burns: the trees nearest the door are
 * stumps, and their wood is stacked under the eave. Pale trunks, the
 * meadow's greens in the leaves, most of them gone to gold, and all of it
 * one mesh, which leans and tosses with the same gusts as the grass under
 * it; and the leaves coming down off it on the wind (`fall.ts`).
 */
export function createWoodFeature (world: World): Feature {
  let mesh: THREE.Mesh | null = null
  let fall: Fall | null       = null

  return {
    name: 'wood',

    build ({ scene, rng }) {
      const { wood, wind, ground, shelter, quality } = world

      const timber = createTimber(createNoise3D(rng.fork('wood:leaves').int(1, 1_000_000)))
      const grow   = rng.fork('wood:grow')

      // The ball every lump of leaves is cut from. Unindexed, so each face
      // has corners of its own and is shaded flat. Desktop cuts it from a
      // dodecahedron, 36 facets, and a phone from an icosahedron, 20: the
      // crowns are drawn three times (the picture, the shadow, the sea), and
      // were the island's costliest triangles at 80 facets a lump.
      const sphere = quality.tier === 'mobile' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.DodecahedronGeometry(1, 0)
      const ball   = sphere.getAttribute('position').array

      for (const tree of [ ...wood.trees, ...wood.outliers ])
        growBirch(timber, tree, { tier: quality.tier, lee: wind.direction, rng: grow, ball })

      cutStumps(timber, wood.stumps, rng.fork('wood:stumps'))
      stackLogs(timber, shelter, ground, rng.fork('wood:stack'))
      sphere.dispose()

      const material = createLitMaterial(world, { name: 'wood', vertexColors: true, flatShading: false })

      material.sheds()

      swayInWind(material, wind)

      // Bark and leaves in one material: a vertex that flutters is a leaf,
      // and one that hardly travels with a gust is near the tree's foot.
      // Read where the tree stands at rest, so the pattern sways with it.
      const sway = vec4Attribute('sway')

      material.finish(birch(inItself(quality.tier), step(0.001, sway.w), smoothstep(0, FOOT, sway.z).oneMinus()))

      mesh               = new THREE.Mesh(timber.build(), material)
      mesh.name          = 'wood'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      // Behind the beach from most of the sea, and the island's costliest
      // mesh: a phone leaves it out of the sea's reflection.
      if (world.quality.tier === 'mobile')
        keepOutOfMirror(mesh)

      // The back end of the year: the turned leaves coming down.
      fall = createFall(world, rng.fork('wood:fall'))

      scene.add(mesh, fall.mesh)
    },

    update (_state, frame) {
      fall?.step(frame.frame * STEP)
    },

    dispose () {
      fall?.dispose()
      fall = null

      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      mesh?.removeFromParent()
      mesh = null
    },
  }
}

// perf: medium — the falling leaves' one draw call and a step's matrices
// (`fall.ts`), and one draw call and one shadow pass for all the rest: 72 birches
// (the wood's 52 and the island's 20) and the cut wood, 11k triangles on the
// mobile tier (crowns of twenty-faced balls) and 43k on desktop, drawn twice. The sway is five sines a
// vertex in the shader, from the wind's one uniform; nothing per frame on
// the CPU.
