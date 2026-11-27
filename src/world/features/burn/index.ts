// src/world/features/burn/index.ts
import * as THREE from 'three'
import { smoothstep as stepNode } from 'three/tsl'
import type { Node } from 'three/webgpu'
import { smoothstep } from 'threejs-scenes/primitives'

import { disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { createRunoff } from '../../shared/runoff.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inWorld, stone } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { countStones, layStones } from './stones.ts'
import { createStreamGeometry, createStreamMaterial } from './water.ts'

/** How near the mill's walls the burn's own stones are left out: its footings stand there. */
const UNDER_WALL = 0.9

/** What the mill's wheel adds to the water's fall where it leaves it, and how far down the burn that is spent. */
const CHURN = { fall: 0.62, spent: 3.4 } as const

/** What the island's full wet adds to the burn's fall, and to a rill's: in spate, it breaks white where it ran clear. */
const SPATE      = 0.16
const RILL_SPATE = 0.3

/**
 * How a rill dries: from its head down, as the island's wet falls between
 * these, each unit of the way down it holding on as if the land were that
 * much wetter. The last of it is where it meets the burn or the sea.
 */
const DRYING = [ 0.22, 0.42 ] as const
const HOLDS  = 0.006

/** Several strips of water as one geometry, so every rill is one draw call. */
function mergeStreams (parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const position: number[] = []
  const said: number[]     = []
  const index: number[]    = []

  for (const part of parts) {
    const first = position.length / 3

    position.push(...part.getAttribute('position').array)
    said.push(...part.getAttribute('aBurn').array)
    index.push(...Array.from(part.getIndex()?.array ?? [], at => at + first))
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('aBurn', new THREE.Float32BufferAttribute(said, 4))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

/**
 * The burn: the island's fresh water.
 *
 * It rises at a spring under the cairn, in a basin someone kerbed with
 * stones and marked with one stood on end; comes down the gully on the brae
 * white where the land is steep; slows into a pool beside the fold, where
 * stepping stones cross its tail; goes under the head-dyke, falls again past
 * the lone birch, and spreads over the sand into the sea a few strides from
 * the landing. It is why the house, the fold and the landing are where they
 * are. Its course is the land's (`shared/burn.ts`); here are its water and
 * its stones. After rain it runs full and whiter, and the steep faces above
 * it run with threads of water of their own (`shared/runoff.ts`).
 */
export function createBurnFeature (world: World): Feature {
  const time = { value: 0 }

  let water: THREE.Mesh | null           = null
  let runoff: THREE.Mesh | null          = null
  let stones: THREE.InstancedMesh | null = null

  return {
    name: 'burn',

    build ({ scene, rng }) {
      const { burn, ground, grid, quality } = world

      // White from under the mill's floor, and settling as it crosses the pool.
      const [ into, out ] = world.mill.under
      const churned       = (along: number): number => along < into + 1 ? 0 : CHURN.fall * (1 - smoothstep(out - 1, out + CHURN.spent, along))

      const wet = world.weather.nodes.wet

      water      = new THREE.Mesh(createStreamGeometry(burn, grid, churned), createStreamMaterial({ clouds: world.clouds, day: world.day, level: ground.waterLevel, time, spate: wet.mul(SPATE) }))
      water.name = 'burn'

      // After rain the hill runs with threads of white water that come down
      // its steep faces into the burn and the sea, and dry from their heads.
      const rills  = createRunoff({ ground, burn, built: [ world.shelter, world.mill, world.yard.kiln ], rng: rng.fork('burn:runoff'), tier: quality.tier })
      const shown  = (said: Node<'vec4'>): Node<'float'> => stepNode(DRYING[0], DRYING[1], wet.add(said.w.mul(HOLDS)))
      const merged = rills.map(rill => createStreamGeometry(rill, grid, undefined, 0))

      runoff      = new THREE.Mesh(mergeStreams(merged), createStreamMaterial({ clouds: world.clouds, day: world.day, level: ground.waterLevel, time, shown, spate: wet.mul(RILL_SPATE) }))
      runoff.name = 'runoff'

      merged.forEach(geometry => geometry.dispose())

      // Threads a pixel or two wide: the sea gives back the burn and not them.
      keepOutOfMirror(runoff)

      // The island's stone, in the boulders' own material and grain, so the
      // two are one program: cut with few facets, for the grain carries them.
      const rock = createLitMaterial(world, { name: 'burn-stones' })

      rock.finish(stone(inWorld(quality.tier)))

      stones               = new THREE.InstancedMesh(createStoneGeometry(rng.fork('burn:shape').int(1, 1_000_000), 0), rock, countStones(burn, quality.tier))
      stones.name          = 'burn-stones'
      stones.receiveShadow = true

      layStones(stones, burn, ground, quality.tier, rng.fork('burn:lay'), (x, z) => world.mill.distanceTo(x, z) < UNDER_WALL)

      // Small and many: a phone leaves them out of the sea's reflection.
      if (quality.tier === 'mobile')
        keepOutOfMirror(stones)

      scene.add(water, runoff, stones)
    },

    update (_state, frame) {
      time.value = frame.frame * STEP
    },

    dispose () {
      water?.geometry.dispose()

      if (water?.material instanceof THREE.Material)
        water.material.dispose()

      water?.removeFromParent()
      runoff?.geometry.dispose()

      if (runoff?.material instanceof THREE.Material)
        runoff.material.dispose()

      runoff?.removeFromParent()
      disposeInstances(stones)
      water  = null
      runoff = null
      stones = null
    },
  }
}

// perf: cheap — three draw calls (five with the sea's mirror), no shadow
// pass: the water's 500 triangles, the rills' 4k to 8k (out of the mirror),
// and under 2k of stones. A step sets one number.
