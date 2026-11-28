// src/world/shared/shore.ts
import * as THREE from 'three'
import { mx_noise_float, smoothstep, uniform } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { PALETTE } from './palette.ts'
import { RANGE } from './tide.ts'

/**
 * What the sea grows and leaves, and the ebb shows: one weed, in the one
 * colour that is the sea's own (`wrack`).
 *
 * Three places wear it, each from the same few numbers, so the line it
 * draws round the island is one line: every stone that stands in the tide
 * (`surface.ts`), the land between the tide's marks (`terrain/land.ts`),
 * and the beds of tangle under low water that the sea shows through its
 * shallows when it has gone down to them (`water/shader.ts`).
 */

/** How far under high water the weed's top edge is, and the height over which that edge is ragged. */
const WRACK_TOP = 0.12
const FRINGE    = 0.32

/** Tangle: how far over low water its beds begin, how far under it they are thickest, and how far under it they end. */
const TANGLE = { from: 0.12, thick: 0.25, to: 2.6 } as const

/** The pitch of the noise the beds lie in (a boat's length across), and how much of the bottom they take. */
const BEDS  = 0.21
const COVER = [ -0.22, 0.12 ] as const

/** How much of the wrack's colour tangle has: it is the same weed's darker kin, and seen through water. */
export const TANGLE_SHADE = 0.34

/** The weed's colour, as a node. */
export function wrack (): Node<'vec3'> {
  return uniform(new THREE.Color(PALETTE.wrack)) as unknown as Node<'vec3'>
}

/**
 * How much weed is on a face, 0 to 1: all of it from a little under high
 * water down, none over that. `over` is the face's height over high water,
 * `ragged` a noise between about -1 and 1 that breaks the line up.
 */
export function wrackOn (over: Node<'float'>, ragged: Node<'float'>): Node<'float'> {
  return smoothstep(-WRACK_TOP - FRINGE, -WRACK_TOP, over.add(ragged.mul(FRINGE * 0.6))).oneMinus()
}

/**
 * How much tangle grows on the bottom at a place, 0 to 1: in beds, from
 * just over low water down to where the light gives out. `sunk` is how far
 * under high water the bottom is there.
 */
export function tangleOn (place: Node<'vec2'>, sunk: Node<'float'>): Node<'float'> {
  const bed = smoothstep(COVER[0], COVER[1], mx_noise_float(place.mul(BEDS)))

  return bed.mul(smoothstep(RANGE - TANGLE.from, RANGE + TANGLE.thick, sunk)).mul(smoothstep(RANGE + TANGLE.to, RANGE + TANGLE.to * 0.5, sunk))
}

// perf: `wrackOn` is one smoothstep of numbers its caller has already;
// `tangleOn` is one gradient noise of two dimensions.
