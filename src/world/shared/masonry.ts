// src/world/shared/masonry.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { PALETTE } from './palette.ts'

/** Length of wall a stone takes up, more or less. */
const STONE = 0.95

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** A place in a building's own frame: across its ridge, and along it. */
export type Spot = readonly [number, number]

/**
 * What laying a stone needs: the mesh it goes into, how many it holds so
 * far, the hand that sets them out of true, the height of a course, and the
 * land under the building.
 */
export interface Mason {
  mesh: THREE.InstancedMesh
  laid: number
  lay:  SeededRng

  /** Height of a course of stones. */
  course: number

  /** Height of the ground over the floor, at a place in the building's own frame. */
  ground: (across: number, along: number) => number
}

/** One stone, by where its foot is and how big it is. */
export interface Stone {
  at:   Spot
  base: number

  /** Half its length, its height in the wall, and half its depth through the wall. */
  half:   number
  thick?: number
  depth?: number

  /** The turn that lays its length along the wall. */
  turn: number
}

/** Lay one stone, a little out of true, the way a hand leaves it. */
export function setStone (mason: Mason, { at, base, half, turn, thick = mason.course, depth = 0.4 }: Stone): void {
  const { lay } = mason

  // On other land the hill may stand lower against the walls and ask for more
  // courses than there is room for: the last stones are then left off.
  if (mason.laid >= mason.mesh.instanceMatrix.count)
    return

  dummy.position.set(at[0] + lay.range(-0.05, 0.05), base + thick * 0.55, at[1] + lay.range(-0.05, 0.05))
  dummy.rotation.set(lay.range(-0.07, 0.07), turn + lay.range(-0.1, 0.1), lay.range(-0.07, 0.07))
  dummy.scale.set(half, thick / 1.05, depth * lay.range(0.9, 1.12))
  dummy.updateMatrix()

  mason.mesh.setMatrixAt(mason.laid, dummy.matrix)
  mason.mesh.setColorAt(mason.laid, tint.set(PALETTE.cairn).offsetHSL(0, 0, lay.range(-0.06, 0.05)))
  mason.laid += 1
}

/**
 * One course of one stretch of wall: stones end to end from `from` to `to`,
 * one more of them on every other course so no joint stands over another.
 * A stone that would lie wholly under the ground is not laid.
 */
export function runCourse (mason: Mason, from: Spot, to: Spot, base: number): void {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])

  if (length < 0.3)
    return

  const count = Math.max(1, Math.round(length / STONE) + (Math.round(base / mason.course) & 1))
  const turn  = Math.atan2(from[1] - to[1], to[0] - from[0])

  for (let stone = 0; stone < count; stone += 1) {
    const along  = (stone + 0.5 + mason.lay.range(-0.1, 0.1)) / count
    const at     = [ from[0] + (to[0] - from[0]) * along, from[1] + (to[1] - from[1]) * along ] as const
    const half   = length / count * mason.lay.range(0.56, 0.66)
    const buried = base + mason.course < mason.ground(at[0], at[1]) - 0.1

    if (!buried)
      setStone(mason, { at, base, half, turn })
  }
}

/** The stretches of one wall line on one course, less an opening where the course crosses one. */
export function runAround (mason: Mason, from: Spot, to: Spot, base: number, opening: readonly [Spot, Spot] | null): void {
  if (opening) {
    runCourse(mason, from, opening[0], base)
    runCourse(mason, opening[1], to, base)
  }
  else
    runCourse(mason, from, to, base)
}

// perf: trivial — a matrix and a colour a stone, once, at build.
