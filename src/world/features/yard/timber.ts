// src/world/features/yard/timber.ts
import * as THREE from 'three'

import { board, join } from '../../shared/boards.ts'
import type { Ground } from '../../shared/ground.ts'
import { WORK } from '../../shared/yard.ts'
import type { Stack, Yard } from '../../shared/yard.ts'
import { STACK } from './plan.ts'

/**
 * The ladder: left against the last stack that was thatched, on the side
 * the house looks at. Which way it stands from the stack's middle, as an
 * angle from +x toward +z; how far out its feet are from the eaves; where on
 * the thatch its head rests, as a radius and a height; the width between
 * its rails; and how far apart its rungs are.
 */
const LADDER = { bearing: 0.5, out: 1.15, head: [ 1.32, 2.72 ], wide: 0.46, rung: 0.36 } as const

/**
 * The sledge: what the sheaves come up from the field on, where no wheel
 * would be any use. Which way it lies from the middle of the stack that is
 * building, and how far; its length, half its width, and the height of its bed.
 */
const SLEDGE = { bearing: WORK - 0.45, away: 2.6, long: 2.1, half: 0.44, bed: 0.24 } as const

/** What the yard's boards are, and where the sheaves on the sledge lie. */
export interface Timber {
  geometry: THREE.BufferGeometry

  /** A matrix for each sheaf of the sledge's load: it takes a sheaf standing at the origin to where it lies. */
  loads: THREE.Matrix4[]
}

/** A ladder against a stack: two rails and their rungs, in the world's frame. */
function leanLadder (stack: Stack, ground: Ground): THREE.BufferGeometry[] {
  const { bearing, out, head, wide, rung } = LADDER
  const away                               = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing))
  const side                               = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar(wide / 2)
  const reach                              = (STACK.eave + out) * stack.size
  const foot                               = new THREE.Vector3(stack.x + away.x * reach, 0, stack.z + away.z * reach)
  const top                                = new THREE.Vector3(stack.x + away.x * head[0] * stack.size, stack.base + head[1] * stack.size, stack.z + away.z * head[0] * stack.size)

  foot.y = ground.heightAt(foot.x, foot.z)

  // A little over the thatch, so the rails lie on it, not in it.
  top.addScaledVector(away, 0.12)

  const rails = [ -1, 1 ].map(hand => board(foot.clone().addScaledVector(side, hand), top.clone().addScaledVector(side, hand), 0.07, 0.07))
  const rungs = Array.from({ length: Math.floor(foot.distanceTo(top) / rung) - 1 }, (_, index) => {
    const at = foot.clone().lerp(top, (index + 1) * rung / foot.distanceTo(top))

    return board(at.clone().sub(side), at.clone().add(side), 0.045, 0.045)
  })

  return [ ...rails, ...rungs ]
}

/** The sledge, about the middle of its bed: two runners turned up at the nose, slats across them, a stake at each corner. */
function createSledge (): THREE.BufferGeometry[] {
  const { long, half, bed } = SLEDGE
  const nose                = long / 2
  const parts               = [] as THREE.BufferGeometry[]

  for (const hand of [ -1, 1 ]) {
    parts.push(
      board(new THREE.Vector3(-nose, 0.08, hand * half), new THREE.Vector3(nose - 0.3, 0.08, hand * half), 0.16, 0.09),
      board(new THREE.Vector3(nose - 0.34, 0.07, hand * half), new THREE.Vector3(nose + 0.12, 0.36, hand * half), 0.14, 0.09),
    )

    for (const end of [ -nose + 0.12, nose - 0.5 ])
      parts.push(board(new THREE.Vector3(end, 0.1, hand * (half + 0.02)), new THREE.Vector3(end, 0.86, hand * (half + 0.06)), 0.07, 0.07))
  }

  for (let across = -nose + 0.2; across < nose - 0.35; across += 0.36)
    parts.push(board(new THREE.Vector3(across, bed - 0.03, -half - 0.08), new THREE.Vector3(across, bed - 0.03, half + 0.08), 0.05, 0.17))

  return parts
}

/**
 * Everything of the yard that is a board, as one geometry in the world's
 * frame: the ladder on the last stack thatched, and the sledge standing by
 * the one that is building, a few sheaves still on it.
 */
export function createTimber (yard: Yard, ground: Ground): Timber {
  const building = yard.stacks.find(stack => stack.raised < 1) ?? yard.stacks[0]!
  const thatched = yard.stacks.find(stack => stack.raised === 1) ?? yard.stacks[0]!
  const x        = building.x + Math.cos(SLEDGE.bearing) * SLEDGE.away
  const z        = building.z + Math.sin(SLEDGE.bearing) * SLEDGE.away

  // It lies along the way it was dragged: from the path toward the stack.
  const placed = new THREE.Matrix4().compose(
    new THREE.Vector3(x, ground.heightAt(x, z), z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -SLEDGE.bearing - 0.9),
    new THREE.Vector3(1, 1, 1),
  )

  const sledge = createSledge()

  for (const part of sledge)
    part.applyMatrix4(placed)

  // A sheaf lies along the bed, its butt to the tail: two side by side and one on top.
  const laid  = new THREE.Matrix4().makeRotationZ(-Math.PI / 2)
  const loads = [[ -0.75, 0.2, -0.2 ], [ -0.68, 0.2, 0.21 ], [ -0.6, 0.5, 0.02 ]].map(([ along, up, across ]) => placed.clone()
    .multiply(new THREE.Matrix4().makeTranslation(along!, SLEDGE.bed + up!, across!))
    .multiply(laid))

  return { geometry: join([ ...leanLadder(thatched, ground), ...sledge ]), loads }
}

// perf: trivial — some thirty boards, under 400 triangles, built once.
