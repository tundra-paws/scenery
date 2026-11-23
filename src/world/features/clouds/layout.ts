// src/world/features/clouds/layout.ts
import type { SeededRng } from 'threejs-scenes'

import { CLOUD_BASE } from '../../shared/cloud-shadow.ts'
import { WEATHER_SPAN } from '../../shared/wind.ts'


/** How far under its centre a puff is cut flat, as a fraction of its height. */
export const PUFF_FLOOR = 0.35

/** Closest two clouds may start out, centre to centre, measured round the weather's seam. */
const APART = 170

/** Redraws allowed per cloud before giving up on filling the count. */
const PATIENCE = 40

/** One rounded lump of a cloud, relative to the cloud's own centre. */
export interface Puff {
  offset: [number, number, number]
  scale:  [number, number, number]

  /** Rotation about the vertical, so no two puffs show the same facets. */
  turn: number
}

/** A cloud: where its flat underside is before the wind has moved it, and the puffs heaped on it. */
export interface Cloud {
  x:     number
  y:     number
  z:     number
  puffs: Puff[]
}

interface LayoutOptions {
  rng:   SeededRng
  count: number

  /** The wind's direction, as a unit `[x, z]`. A cloud is drawn out along it. */
  along: readonly [number, number]
}

/** Distance between two points on a square that wraps round. */
function apart (ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx)
  const dz = Math.abs(az - bz)

  return Math.hypot(Math.min(dx, WEATHER_SPAN - dx), Math.min(dz, WEATHER_SPAN - dz))
}

/**
 * A fair-weather cumulus: a row of puffs along the wind, the big ones in the
 * middle, all cut flat at one height so the cloud has a base.
 */
function heap (rng: SeededRng, along: readonly [number, number]): Puff[] {
  const count  = rng.int(4, 6)
  const length = rng.range(50, 150)
  const girth  = length * rng.range(0.2, 0.28)
  const skew   = rng.range(-0.3, 0.3)

  // The row, turned a little off the wind so the sky is not combed.
  const rowX = along[0] * Math.cos(skew) - along[1] * Math.sin(skew)
  const rowZ = along[0] * Math.sin(skew) + along[1] * Math.cos(skew)

  return Array.from({ length: count }, (_, index): Puff => {
    const place  = index / (count - 1) - 0.5 + rng.range(-0.06, 0.06)
    const radius = girth * (0.55 + 0.45 * Math.cos(place * Math.PI)) * rng.range(0.85, 1.15)
    const height = radius * rng.range(0.56, 0.8)
    const aside  = radius * rng.range(-0.35, 0.35)

    return {
      // Lifted by its own floor, so every puff's underside is at the cloud's base.
      offset: [ rowX * place * length - rowZ * aside, height * PUFF_FLOOR, rowZ * place * length + rowX * aside ],
      scale:  [ radius, height, radius * rng.range(0.86, 1) ],
      turn:   rng.range(0, Math.PI * 2),
    }
  })
}

/**
 * Where the clouds are, over the whole of the weather's square.
 *
 * Spread by rejection so no two start out on top of each other. Like the
 * ground scatter it returns fewer rather than loop forever. Positions are
 * drawn from one stream and shapes from another, so asking for fewer clouds
 * gives the first of the same sky rather than a different one.
 */
export function layOutClouds ({ rng, count, along }: LayoutOptions): Cloud[] {
  const place           = rng.fork('place')
  const shape           = rng.fork('shape')
  const half            = WEATHER_SPAN / 2
  const clouds: Cloud[] = []

  for (let tries = 0; clouds.length < count && tries < count * PATIENCE; tries += 1) {
    const x = place.range(-half, half)
    const z = place.range(-half, half)

    if (clouds.every(cloud => apart(cloud.x, cloud.z, x, z) > APART))
      clouds.push({ x, y: CLOUD_BASE + shape.range(-12, 14), z, puffs: heap(shape, along) })
  }

  return clouds
}

// perf: trivial — a few thousand draws from the stream, once, at build.
