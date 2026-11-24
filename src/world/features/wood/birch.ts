// src/world/features/wood/birch.ts
import * as THREE from 'three'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { PALETTE } from '../../shared/palette.ts'
import type { Tree } from '../../shared/wood.ts'
import type { Ring, Timber } from './timber.ts'

/** Spans the trunk is drawn in, how many sides it has, and the lumps of leaves in a crown. */
const SPANS: Record<QualityTier, number> = { mobile: 6, desktop: 9, highEnd: 10 }
const SIDES: Record<QualityTier, number> = { mobile: 4, desktop: 5, highEnd: 6 }
const LUMPS: Record<QualityTier, number> = { mobile: 4, desktop: 6, highEnd: 7 }

/** A birch is slender: the radius of its trunk at the foot, as a part of its height, and how much wider the root's flare is. */
export const GIRTH = 0.024

const FLARE        = 1.5

/** How far up the tree its trunk runs before it is lost in the leaves, and how far under the ground it starts. */
const TRUNK = 0.86
const SUNK  = 0.5

/** How far a trunk wanders off its line, as a part of its height: no birch in the wind grows straight. */
const CROOK = 0.045

/** How much of the trunk's bark is scar, at the foot and at the top. */
const SCARRED = [ 0.24, 0.05 ] as const

/** Where up the trunk the limbs leave it, from the lowest to the highest. */
const LIMBS = [ 0.5, 0.9 ] as const

/** How far a crown streams downwind of the limbs that carry it, and how far each lump of it does. */
const STREAM  = 0.55
const STRETCH = 0.3

/** A lump of leaves is flatter than it is wide. */
const SQUASH = 0.92

/** The angle between one limb and the next round the trunk: the golden one, so no two stand over each other. */
const ROUND = 2.4

const BARK = new THREE.Color(PALETTE.bark)
const LEAF = new THREE.Color(PALETTE.grass)
const DRY  = new THREE.Color(PALETTE.grassDry)

/** The near black of a birch's scars and of the rough bark at its foot, and the brown of its thin wood, half way to that. */
export const SCAR = new THREE.Color(PALETTE.rock).multiplyScalar(0.36)

const TWIG        = new THREE.Color(PALETTE.bark).lerp(SCAR, 0.72)

/** Module-scope scratch. */
const lean  = new THREE.Vector3()
const aside = new THREE.Vector3()
const reach = new THREE.Vector3()
const tint  = new THREE.Color()

/** What growing a tree needs beside the tree itself. */
export interface Growth {
  tier: QualityTier

  /** Where the wind goes, as a unit `[x, z]`: the way every tree leans. */
  lee: readonly [number, number]
  rng: SeededRng

  /** The ball a lump of leaves is cut from: unit positions, three a vertex. */
  ball: ArrayLike<number>
}

/** The middle of the trunk, `part` (0 to 1) of the way from under the ground to where the leaves take it. */
function spine (tree: Tree, crook: number, phase: number, part: number, out: THREE.Vector3): THREE.Vector3 {
  const up = part * TRUNK

  // Straight at the foot and bending further the higher it goes, the way a
  // tree grows that the wind has leant on every day of its life.
  return out.set(tree.x, tree.foot - SUNK + part * (tree.height * TRUNK + SUNK), tree.z)
    .addScaledVector(lean, tree.lean * tree.height * up ** 1.7)
    .addScaledVector(aside, crook * tree.height * Math.sin(part * 4.4 + phase) * part)
}

/** A leaf green: the meadow's own two, a little deeper, no two lumps quite alike. */
function leafGreen (rng: SeededRng): THREE.Color {
  return tint.copy(LEAF).lerp(DRY, rng.range(0, 0.6))
    .offsetHSL(0, 0.05, rng.range(-0.02, 0.06))
}

/**
 * One downy birch, written into the timber: a pale, scarred trunk that leans
 * with the wind, a few thin limbs, and a crown of lumps streaming to leeward.
 *
 * Every draw of the stream is taken in the same order whatever the tier, as
 * far as the tier's counts allow, so a tree is the same tree on a phone with
 * fewer sides to it.
 */
export function growBirch (timber: Timber, tree: Tree, { tier, lee, rng, ball }: Growth): void {
  const turn   = rng.range(-0.4, 0.4)
  const crook  = rng.range(0.4, 1) * CROOK * (rng.next() < 0.5 ? -1 : 1)
  const phase  = rng.range(0, Math.PI * 2)
  const girth  = tree.height * GIRTH * rng.range(0.85, 1.2)
  const spans  = SPANS[tier]
  const lumps  = LUMPS[tier]
  const radius = (part: number): number => girth * (1 - 0.8 * part)

  // Each tree leans its own way a little, round the one way they all lean.
  lean.set(lee[0] * Math.cos(turn) - lee[1] * Math.sin(turn), 0, lee[0] * Math.sin(turn) + lee[1] * Math.cos(turn))
  aside.set(-lean.z, 0, lean.x)

  timber.root(tree)

  const trunk: Ring[] = Array.from({ length: spans + 1 }, (_, ring) => {
    const part = ring / spans

    return { at: spine(tree, crook, phase, part, new THREE.Vector3()), radius: radius(part) * (ring === 0 ? FLARE : 1) }
  })

  timber.limb(trunk, SIDES[tier], ring => {
    const scarred = SCARRED[0] + (SCARRED[1] - SCARRED[0]) * ring / spans

    // The foot of a birch is all rough, dark bark.
    return rng.next() < scarred || ring === 0 ? tint.copy(SCAR).offsetHSL(0, 0, rng.range(0, 0.05)) : tint.copy(BARK).offsetHSL(0, 0, rng.range(-0.07, 0.03))
  })

  const top  = trunk.at(-1)!.at
  const from = new THREE.Vector3()
  const to   = new THREE.Vector3()

  for (let limb = 0; limb < lumps; limb += 1) {
    const last = limb === lumps - 1
    const part = LIMBS[0] + (LIMBS[1] - LIMBS[0]) * (limb + rng.next()) / lumps
    const bear = limb * ROUND + rng.range(-0.5, 0.5)
    const long = tree.height * rng.range(0.14, 0.22) * (1.5 - part)
    const size = tree.height * rng.range(0.1, 0.135) * (1.35 - part * 0.5)

    // The last lump is the tree's top and sits on the trunk; the others
    // stand off it on a limb, out and up and away from the wind.
    if (last)
      to.copy(top).addScaledVector(lean, size * 0.3)
    else {
      spine(tree, crook, phase, part, from)
      reach.set(Math.cos(bear), 0, Math.sin(bear)).addScaledVector(lean, STREAM)
        .normalize()
      to.copy(from).addScaledVector(reach, long)
      to.y += long * rng.range(0.3, 0.7)

      timber.limb([{ at: from, radius: radius(part) * 0.55 }, { at: to, radius: 0 }], 3, () => TWIG)
    }

    timber.lump(ball, { at: to, radius: size, lee: lean, stretch: STRETCH, squash: SQUASH, cut: rng.range(0, 90) }, leafGreen(rng), rng.range(0.05, 1))
  }
}

// perf: cheap — a tree is its trunk (two triangles a side a span), and for
// each lump of its crown a limb of three triangles and the ball's eighty:
// 380 triangles on the mobile tier, 590 on desktop. Built once.
