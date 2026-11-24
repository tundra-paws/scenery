// src/world/features/boat/pennant.ts
import * as THREE from 'three'

import { shadeUnderClouds } from '../../shared/cloud-shadow.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Wind } from '../../shared/wind.ts'
import type { World } from '../../world.ts'


/** How long the pennant is, how deep where it is made fast, and the spans it is drawn in. */
const LENGTH = 2.1
const HOIST  = 0.56
const SPANS  = 6

/** How far below level it hangs, in radians: in a lull, when it droops, and in a gust, when it stands out. */
const DROOP = [ 1.1, 0.1 ] as const

/** How far its tail is thrown from side to side and up and down: what it keeps in a lull, and what a full gust adds. */
const THROW = [ 0.06, 0.14 ] as const

/** Scratch, so a step allocates nothing. */
const where = { x: 0, y: 0, z: 0 }

/** A place relative to the masthead. */
interface Offset {
  x: number
  y: number
  z: number
}

/** The pennant, and the one thing it does. */
export interface Pennant {
  mesh: THREE.Mesh

  /** Fly from `x, y, z`, the masthead, at `time` seconds. */
  fly (x: number, y: number, z: number, time: number): void
  dispose (): void
}

function smoothstep (from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))

  return t * t * (3 - 2 * t)
}

/**
 * Where the middle of the pennant is, `part` (0 to 1) of the way from the
 * mast to its tip, in a wind blowing `gust` hard (0 to 1) at `time` seconds:
 * relative to the masthead, written into `out`.
 *
 * A pure function of those three. It streams straight downwind; the harder
 * it blows the nearer level it stands, and the further a wave running down
 * it throws the tail. The wave's speed never changes, only its size, so a
 * gust coming on cannot make the cloth jump.
 */
export function streamAt (wind: Wind, gust: number, time: number, part: number, out: Offset): void {
  const droop = DROOP[0] + (DROOP[1] - DROOP[0]) * smoothstep(0.15, 0.75, gust)
  const reach = (THROW[0] + THROW[1] * gust) * part
  const out2d = Math.cos(droop) * part * LENGTH
  const aside = Math.sin(part * 7.5 - time * 9.5) * reach

  out.x = wind.direction[0] * out2d - wind.direction[1] * aside
  out.y = -Math.sin(droop) * part * LENGTH + Math.sin(part * 5.1 - time * 7.3 + 1.3) * reach * 0.6
  out.z = wind.direction[1] * out2d + wind.direction[0] * aside
}

/**
 * A pennant at the masthead: a long scrap of dyed cloth, the one thing here
 * made only to be seen, and to say which way the wind is.
 *
 * It reads the wind on the CPU (`wind.gustAt`) at the place it flies, so it
 * stands out and snaps as the same gust flattens the grass ashore, and hangs
 * when the smoke stands up. Thirteen vertices moved a step.
 */
export function createPennant (world: World): Pennant {
  const geometry        = new THREE.BufferGeometry()
  const position        = new THREE.BufferAttribute(new Float32Array((SPANS + 1) * 2 * 3), 3)
  const index: number[] = []

  for (let span = 0; span < SPANS; span += 1)
    index.push(span * 2, span * 2 + 1, span * 2 + 3, span * 2, span * 2 + 3, span * 2 + 2)

  position.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setIndex(index)

  // It moves every step, so the sphere three culls by is set once, round
  // everywhere it can reach.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), LENGTH + HOIST)

  const material = new THREE.MeshStandardMaterial({ name: 'pennant', color: PALETTE.pennant, flatShading: true, roughness: 1, metalness: 0, side: THREE.DoubleSide })

  shadeUnderClouds(material, world)

  const mesh = new THREE.Mesh(geometry, material)

  mesh.name = 'pennant'

  return {
    mesh,

    fly (x, y, z, time) {
      const gust = world.wind.gustAt(x, z, time)

      mesh.position.set(x, y, z)

      for (let span = 0; span <= SPANS; span += 1) {
        const part = span / SPANS
        const half = HOIST / 2 * (1 - part)

        streamAt(world.wind, gust, time, part, where)
        position.setXYZ(span * 2, where.x, where.y + half, where.z)
        position.setXYZ(span * 2 + 1, where.x, where.y - half, where.z)
      }

      position.needsUpdate = true
    },

    dispose () {
      geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}

// perf: trivial — one draw call of twelve triangles, no shadow pass. A step
// asks the wind once and writes fourteen vertices.
