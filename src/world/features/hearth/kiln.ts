// src/world/features/hearth/kiln.ts
import * as THREE from 'three'

import { Interior } from '../../shared/hearth.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Kiln } from '../../shared/yard.ts'
import { INSET, KILN } from '../yard/plan.ts'

/** How far out from the kiln's middle the fire lies: in the fire-hole, through the wall, just clear of the dark behind the stones. */
const LAID = KILN.radius - INSET + 0.16

/** The back of the fire-hole: stone, black with it. */
const SOOT = new THREE.Color(PALETTE.rock).lerp(new THREE.Color(PALETTE.cairn), 0.3)
  .multiplyScalar(0.6)

/**
 * The fire in the kiln's mouth, in the world's frame: a glowing heap of
 * peat on the floor of the fire-hole, a few flames over it, and the back of
 * the hole lit by them. It is what dries the grain over it, and it has been
 * burning since the kiln first smoked.
 */
export function createKilnFire (kiln: Kiln): THREE.BufferGeometry {
  const [ mx, mz ] = kiln.mouth
  const at         = (out: number, aside: number, up: number): [number, number, number] => [ kiln.x + mx * out - mz * aside, kiln.floor + up, kiln.z + mz * out + mx * aside ]
  const back       = KILN.radius - INSET + 0.02
  const fire       = new Interior([{ at: at(LAID + 0.1, 0, 0.45), gain: 3.2, reach: 0.75 }], [{ at: at(KILN.radius + 0.7, 0, 0.7), gain: 0.3, reach: 1 }])

  // The back of the hole, a little wider and higher than the mouth, and its floor.
  fire.sheet([ -KILN.mouthHalf - 0.3, 0, KILN.mouthHalf + 0.3, KILN.mouthTop + 0.2 ], (aside, up) => at(back, -aside, up), SOOT, 0.6)
  fire.embers(at(LAID, 0, 0.1), 0.66, 0.26)

  for (const [ aside, out, tall, turn ] of [[ 0, 0, 0.6, 0.3 ], [ -0.17, 0.03, 0.38, 1.4 ], [ 0.16, -0.02, 0.45, 2.3 ]] as const)
    fire.tongue(at(LAID + out, aside, 0.2), 0.22, tall, turn)

  return fire.build()
}

// perf: built once: some thirty triangles.
