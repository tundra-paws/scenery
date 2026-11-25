// src/world/features/wood/fall.ts
import * as THREE from 'three'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { createLitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Tree } from '../../shared/wood.ts'
import type { World } from '../../world.ts'


/** Leaves in the air at once, by tier. */
const COUNT: Record<QualityTier, number> = { mobile: 260, desktop: 720, highEnd: 1000 }

/** A leaf's length, and the seconds one takes to come down, from and to. Twice a birch leaf's, or none would show past a few paces. */
const SIZE = [ 0.3, 0.42 ] as const
const FALL = [ 6, 11 ] as const

/** Where up its tree a leaf leaves from, as a part of its height, and how far out from the trunk. */
const FROM  = [ 0.55, 0.95 ] as const
const CROWN = 0.16

/** How far downwind a leaf is carried while it comes down, from and to, in world units; and how far a gust adds to that. */
const CARRY = [ 2.5, 7 ] as const
const GUSTY = 4

/** How far a leaf swings from side to side as it falls, how fast, and how fast it turns over. */
const SWING = 0.55
const BEAT  = [ 1.3, 2.4 ] as const
const SPIN  = [ 2, 5 ] as const

/** The part of its fall at the start and the end over which a leaf grows from nothing and shrinks to it: torn off, and lost in the grass. */
const SHOWN = 0.06

/** The turned crowns' gold, and the rust a leaf goes as it dries. */
const GOLD = new THREE.Color(PALETTE.leaf)
const RUST = new THREE.Color(PALETTE.bracken)

/** Module-scope scratch, so a step allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** One leaf's fall, drawn once: everything a step needs besides the time. */
interface Leaf {
  x:     number
  y:     number
  z:     number
  floor: number
  carry: number
  fall:  number
  phase: number
  beat:  number
  spin:  number
  size:  number
  axis:  THREE.Vector3
}

/**
 * The leaves coming down: torn off the turned crowns, carried downwind, swung
 * from side to side and turned over as they fall, and lost in the grass where
 * they land, where the rest already lie (`aLitter` on the land). Each leaf
 * falls on its own clock, round and round, so the wood is never without one
 * in the air; a gust where it is carries it further.
 */
export interface Fall {
  mesh: THREE.InstancedMesh
  step (time: number): void
  dispose (): void
}

/** One leaf: a diamond, both faces, so it shows whichever way it turns. Four triangles. */
function createLeafGeometry (): THREE.BufferGeometry {
  const tip  = [ 0.5, 0, 0 ]
  const stem = [ -0.5, 0, 0 ]
  const left = [ 0, 0, 0.3 ]
  const rite = [ 0.05, 0.04, -0.28 ]

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    ...stem, ...tip, ...left,
    ...stem, ...rite, ...tip,
    ...stem, ...left, ...tip,
    ...stem, ...tip, ...rite,
  ], 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

/** Draw one leaf's fall from a tree: where it leaves the crown, how far it is carried and how long it takes. */
function tear (world: World, tree: Tree, rng: SeededRng): Leaf {
  const lee   = world.wind.direction
  const round = rng.range(0, Math.PI * 2)
  const out   = Math.sqrt(rng.next()) * tree.height * CROWN
  const up    = rng.range(FROM[0], FROM[1])
  const x     = tree.x + lee[0] * tree.lean * tree.height * up + Math.cos(round) * out
  const z     = tree.z + lee[1] * tree.lean * tree.height * up + Math.sin(round) * out
  const carry = rng.range(CARRY[0], CARRY[1])

  return {
    x,
    z,
    y:     tree.foot + tree.height * up,
    floor: world.ground.heightAt(x + lee[0] * carry, z + lee[1] * carry),
    carry,
    fall:  rng.range(FALL[0], FALL[1]),
    phase: rng.next(),
    beat:  rng.range(BEAT[0], BEAT[1]),
    spin:  rng.range(SPIN[0], SPIN[1]) * (rng.next() < 0.5 ? -1 : 1),
    size:  rng.range(SIZE[0], SIZE[1]),
    axis:  new THREE.Vector3(rng.range(-1, 1), rng.range(-0.3, 0.3), rng.range(-1, 1)).normalize(),
  }
}

export function createFall (world: World, rng: SeededRng): Fall {
  const { wind, wood } = world
  const trees          = [ ...wood.trees, ...wood.outliers ]
  const count          = COUNT[world.quality.tier]
  const leaves: Leaf[] = []
  const material       = createLitMaterial(world, { name: 'leaves' })
  const mesh           = new THREE.InstancedMesh(createLeafGeometry(), material, count)
  const aside          = [ -wind.direction[1], wind.direction[0] ] as const

  for (let index = 0; index < count; index += 1) {
    const tree = trees[Math.floor(rng.next() * trees.length)]!

    leaves.push(tear(world, tree, rng))
    mesh.setColorAt(index, tint.copy(GOLD).lerp(RUST, rng.range(0, 0.5))
      .offsetHSL(0, 0, rng.range(-0.04, 0.06)))
  }

  mesh.name = 'falling-leaves'

  // They are everywhere downwind of a tree, and move every step: a sphere
  // round them would be fitted afresh each step to save nothing.
  mesh.frustumCulled = false

  // A leaf is a few pixels at most: the sea has no use for them.
  keepOutOfMirror(mesh)

  const step = (time: number): void => {
    leaves.forEach((leaf, index) => {
      const age   = (time / leaf.fall + leaf.phase) % 1
      const gust  = wind.gustAt(leaf.x, leaf.z, time)
      const along = (leaf.carry + gust * GUSTY) * age
      const swing = Math.sin(time * leaf.beat + leaf.phase * 40) * SWING * Math.min(1, age * 4)
      const shown = Math.min(1, age / SHOWN, (1 - age) / SHOWN)

      dummy.position.set(
        leaf.x + wind.direction[0] * along + aside[0] * swing,
        leaf.y + (leaf.floor - leaf.y) * age + Math.abs(swing) * 0.15,
        leaf.z + wind.direction[1] * along + aside[1] * swing,
      )
      dummy.quaternion.setFromAxisAngle(leaf.axis, time * leaf.spin + leaf.phase * 9)
      dummy.scale.setScalar(leaf.size * shown)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }

  step(0)

  if (mesh.instanceColor)
    mesh.instanceColor.needsUpdate = true

  return {
    mesh,
    step,

    dispose () {
      mesh.geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
      mesh.dispose()
    },
  }
}

// perf: cheap — one draw call and one program of its own, no shadow pass. Four triangles a leaf: 3k on desktop, 1k on a phone.
// A step sets each leaf's matrix (720 on desktop) and uploads them: a few
// dozen kilobytes, nothing allocated.
