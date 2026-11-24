// src/world/features/wood/cut.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import type { Ground } from '../../shared/ground.ts'
import { PALETTE } from '../../shared/palette.ts'
import { SHELTER_DEEP } from '../../shared/shelter.ts'
import type { Shelter } from '../../shared/shelter.ts'
import type { Tree } from '../../shared/wood.ts'
import { GIRTH, SCAR } from './birch.ts'
import type { Timber } from './timber.ts'

/** Sides of a log and of a stump. */
const SIDES = 6

/** How high a stump was left, from and to. */
const STUMP = [ 0.4, 0.75 ] as const

/**
 * The stack, in the shelter's own frame: against the downhill wall, under the
 * eave, from this far along it to this far, between the window and the door's
 * corner. The logs lie square to the wall with their cut ends out.
 */
const STACK = { from: 0.1, to: 3.3, off: 0.12 } as const

/** A log's radius and its length, each from and to, and the rows of them in the stack. */
const THICK = [ 0.17, 0.23 ] as const
const LONG  = [ 1.05, 1.3 ] as const
const ROWS  = 5

const BARK = new THREE.Color(PALETTE.bark)

/** Fresh-cut birch: the pale inside of the wood, between the bark's colour and the lamp's. */
const CUT = new THREE.Color(PALETTE.bark).lerp(new THREE.Color(PALETTE.lamp), 0.3)

/** Module-scope scratch. */
const UP    = new THREE.Vector3(0, 1, 0)
const axis  = new THREE.Vector3()
const inner = new THREE.Vector3()
const outer = new THREE.Vector3()
const tint  = new THREE.Color()

/** What is left of the trees that went on the fire: a low post of the rough dark bark a birch has at its foot, with a pale top. */
export function cutStumps (timber: Timber, stumps: readonly Tree[], rng: SeededRng): void {
  timber.root(null)

  for (const stump of stumps) {
    const radius = stump.height * GIRTH * 1.5
    const top    = stump.foot + rng.range(STUMP[0], STUMP[1])

    inner.set(stump.x, stump.foot - 0.5, stump.z)
    outer.set(stump.x, top, stump.z)

    timber.limb([{ at: inner, radius: radius * 1.4 }, { at: outer, radius }], SIDES, () => tint.copy(SCAR).offsetHSL(0, 0, rng.range(0.02, 0.12)))
    timber.disc(outer, UP, radius, SIDES, CUT)
  }
}

/**
 * The winter's wood: split birch stacked against the shelter's downhill wall,
 * cut ends out, each row sitting in the gaps of the one under it and one log
 * shorter.
 */
export function stackLogs (timber: Timber, shelter: Shelter, ground: Ground, rng: SeededRng): void {
  const wall  = SHELTER_DEEP / 2 + STACK.off
  const pitch = THICK[1] * 2
  const first = Math.floor((STACK.to - STACK.from) / pitch)

  // The stack stands level on the ground under its outer edge, which is the
  // lower: the land falls away from the wall.
  const foot = shelter.place(wall + LONG[0], (STACK.from + STACK.to) / 2)
  const base = ground.heightAt(foot.x, foot.z) - 0.1

  /** A place in the shelter's own frame, `over` the ground the stack stands on, in the world's. */
  const put = (across: number, along: number, over: number, out: THREE.Vector3): THREE.Vector3 => {
    const { x, z } = shelter.place(across, along)

    return out.set(x, base + over, z)
  }

  timber.root(null)
  axis.set(shelter.fall[0], 0, shelter.fall[1])

  for (let row = 0; row < ROWS; row += 1)
    for (let log = 0; log < first - row; log += 1) {
      const radius = rng.range(THICK[0], THICK[1])
      const along  = STACK.from + pitch * (log + 0.5 + row * 0.5) + rng.range(-0.03, 0.03)
      const over   = THICK[1] + row * pitch * 0.87

      put(wall, along, over, inner)
      put(wall + rng.range(LONG[0], LONG[1]), along, over, outer)

      timber.limb([{ at: inner, radius }, { at: outer, radius }], SIDES, () => tint.copy(BARK).offsetHSL(0, 0, rng.range(-0.1, 0)))
      timber.disc(outer, axis, radius, SIDES, tint.copy(CUT).offsetHSL(0, 0, rng.range(-0.06, 0.04)))
    }
}

// perf: trivial — a log is eighteen triangles, a stump the same: the stack
// and the stumps together are under 700. Built once.
