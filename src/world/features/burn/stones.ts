// src/world/features/burn/stones.ts
import * as THREE from 'three'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import type { Burn, Reach } from '../../shared/burn.ts'
import type { Ground } from '../../shared/ground.ts'
import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'

/** How far apart the stones along a bank lie, on each tier. */
const EVERY: Record<QualityTier, number> = { mobile: 1.5, desktop: 0.95, highEnd: 0.8 }

/** A bank stone's size, from and to, and how much bigger the ones at a fall are. */
const SIZE  = [ 0.2, 0.46 ] as const
const BLOCK = 1.7

/** The fall from which the water has cut down to bigger stones. */
const STEEP = 0.6

/** Stones round the spring's basin, their size, and the one stood on end over it: its half-width, and how tall. */
const KERB      = 8
const KERB_SIZE = 0.34
const MARK      = { wide: 0.3, tall: 1.5 } as const
const BASIN     = 1.2

/** Stepping stones across the pool's tail: how many, and how big. */
const STEPS     = 4
const STEP_SIZE = 0.42

/** Module-scope scratch, so laying a stone allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** What laying a stone needs: the mesh, how many it holds so far, the hand that sets them, and the land. */
interface Mason {
  mesh:   THREE.InstancedMesh
  laid:   number
  lay:    SeededRng
  ground: Ground
}

/** How many stones the burn takes at most, so the mesh can be made before they are laid. */
export function countStones (burn: Burn, tier: QualityTier): number {
  return Math.ceil(burn.length / EVERY[tier]) * 3 + KERB + 1 + STEPS + 8
}

/** Set one stone on the land at a place: `placed` by a hand in the cairn's grey, or lying where the water left it in the rock's. */
function set (mason: Mason, x: number, z: number, size: number, placed: boolean, tall = 0): void {
  const { lay, ground, mesh } = mason

  if (mason.laid >= mesh.instanceMatrix.count)
    return

  dummy.position.set(x, ground.heightAt(x, z) + (tall ? tall * 0.42 : size * 0.16), z)
  dummy.rotation.set(lay.range(-0.25, 0.25) * (tall ? 0.3 : 1), lay.range(0, Math.PI * 2), lay.range(-0.25, 0.25) * (tall ? 0.3 : 1))
  dummy.scale.set(size, tall || size * lay.range(0.6, 0.9), size * lay.range(0.8, 1.25))
  dummy.updateMatrix()
  tint.set(placed ? PALETTE.cairn : PALETTE.rock).offsetHSL(0, 0, lay.range(-0.07, 0.05))

  mesh.setMatrixAt(mason.laid, dummy.matrix)
  mesh.setColorAt(mason.laid, tint)
  mason.laid += 1
}

/** A place beside the water: `out` from its edge on `side`, a little up or down the burn. */
function beside (reach: Reach, side: number, out: number, drift: number): [number, number] {
  return [
    reach.x - reach.ahead[1] * side * (reach.half + out) + reach.ahead[0] * drift,
    reach.z + reach.ahead[0] * side * (reach.half + out) + reach.ahead[1] * drift,
  ]
}

/** The reach nearest a distance down the burn. */
function reachAt (burn: Burn, along: number): Reach {
  return burn.reaches.reduce((best, reach) => Math.abs(reach.along - along) < Math.abs(best.along - along) ? reach : best)
}

/**
 * The stones of the burn, into `mesh`: returns how many it laid.
 *
 * Along both banks the stones the water has washed bare, bigger where it
 * falls and it has cut down to them, with one in the stream there now and
 * then. Three things a hand did: a kerb of pale stones round the spring's
 * basin and one stood on end over it, so the well can be found from the
 * path; and stepping stones over the tail of the pool, where the sheep's
 * side of the burn is crossed to the fold.
 */
export function layStones (mesh: THREE.InstancedMesh, burn: Burn, ground: Ground, tier: QualityTier, lay: SeededRng): number {
  const mason: Mason = { mesh, laid: 0, lay, ground }
  const dry          = burn.reaches.filter(reach => ground.heightAt(reach.x, reach.z) > ground.waterLevel + 0.5)
  const foot         = dry.at(-1)?.along ?? burn.length

  // The well: a kerb round the basin, open where the water leaves it, and its mark.
  const head = burn.reaches[0]!
  const out  = Math.atan2(head.ahead[1], head.ahead[0])

  for (let stone = 0; stone < KERB; stone += 1) {
    const turn = out + Math.PI * 2 * (stone + 1) / (KERB + 1)

    set(mason, head.x + Math.cos(turn) * BASIN, head.z + Math.sin(turn) * BASIN, KERB_SIZE * lay.range(0.85, 1.2), true)
  }

  set(mason, head.x - head.ahead[0] * (BASIN + 0.35), head.z - head.ahead[1] * (BASIN + 0.35), MARK.wide, true, MARK.tall)

  // The banks.
  for (let along = BASIN + 0.6; along < foot; along += EVERY[tier] * lay.range(0.75, 1.3)) {
    const reach = reachAt(burn, along)
    const hard  = reach.fall > STEEP ? BLOCK : 1

    for (const side of [ -1, 1 ]) {
      if (lay.next() < 0.18)
        continue

      const [ x, z ] = beside(reach, side, lay.range(-0.05, 0.3), lay.range(-0.3, 0.3))

      set(mason, x, z, lay.range(SIZE[0], SIZE[1]) * hard, false)
    }

    // In the stream, where it falls: what the water breaks on.
    if (reach.fall > STEEP && lay.next() < 0.5) {
      const [ x, z ] = beside(reach, lay.next() < 0.5 ? -1 : 1, -reach.half * lay.range(0.5, 1), 0)

      set(mason, x, z, lay.range(0.3, 0.5), false)
    }
  }

  // The stepping stones, a stride below the pool's middle, from bank to bank.
  const ford = reachAt(burn, burn.pool.along + 1.4)

  for (let step = 0; step < STEPS; step += 1) {
    const across = (step + 0.5) / STEPS * 2 - 1

    set(mason, ford.x - ford.ahead[1] * across * (ford.half + 0.2), ford.z + ford.ahead[0] * across * (ford.half + 0.2), STEP_SIZE * lay.range(0.9, 1.15), true)
  }

  mesh.count = mason.laid

  commitInstances(mesh)

  return mason.laid
}

// perf: cheap — some ninety stones on desktop, sixty on a phone, of twenty
// triangles each: under 2k. Laid once; nothing per frame.
