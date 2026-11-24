// src/world/shared/scatter.ts
import type { SeededRng } from 'threejs-scenes'
import type { Ground } from './ground.ts'

/** Redraws allowed per wanted spot before giving up on filling the count. */
const PATIENCE = 30

/** A place something may stand: where, how high the ground is there, how steep. */
export interface Spot {
  x:      number
  z:      number
  height: number

  /**
   * Worked out when it is first read, and kept. It is four more samples of the
   * ground, and most candidates are turned away on their height before anyone
   * asks how steep they are: put the cheap tests first in `accept`.
   */
  readonly slope: number
}

interface ScatterOptions {
  ground: Ground
  rng:    SeededRng
  count:  number

  /** How far from the centre to look, as a fraction of half the ground's size. */
  reach?: number

  /** Whether a candidate spot is acceptable. Rejected spots are redrawn. */
  accept: (spot: Spot) => boolean
}

/**
 * Pick spots on the ground by rejection.
 *
 * Draws uniformly over a disc and keeps what `accept` allows. It returns fewer
 * than `count` rather than loop forever when the rule is hard to satisfy, so a
 * feature that tightens its rule gets a sparser field, not a hung build.
 */
export function scatterOnGround ({ ground, rng, count, reach = 0.9, accept }: ScatterOptions): Spot[] {
  const radius        = ground.size / 2 * reach
  const spots: Spot[] = []

  for (let tries = 0; spots.length < count && tries < count * PATIENCE; tries += 1) {
    // Square root of a uniform draw spreads points evenly over the disc's area.
    const distance = Math.sqrt(rng.next()) * radius
    const angle    = rng.range(0, Math.PI * 2)
    const x        = Math.cos(angle) * distance
    const z        = Math.sin(angle) * distance
    const spot     = spotAt(ground, x, z)

    if (accept(spot))
      spots.push(spot)
  }

  return spots
}

function spotAt (ground: Ground, x: number, z: number): Spot {
  let slope: number | null = null

  return {
    x,
    z,
    height: ground.heightAt(x, z),

    get slope () {
      slope ??= ground.slopeAt(x, z)

      return slope
    },
  }
}

// perf: one ground sample a candidate, and four more only for those whose
// slope is read. No draw of the stream depends on either, so what is placed
// does not depend on what was asked.
