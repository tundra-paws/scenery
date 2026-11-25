// src/world/shared/beyond.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createNoise2D, smoothstep } from 'threejs-scenes/primitives'
import type { Noise2D } from 'threejs-scenes/primitives'

import { PALETTE } from './palette.ts'


/**
 * The land over the water: what lies on the horizon, as bearings from the
 * island and distances from its middle. A bearing is an angle on the ground
 * from -z toward +x, the way `NORTH` in `shared/daylight.ts` is measured.
 *
 * `mainland` is a long mountain coast across the north-west, where the
 * summer sun goes down behind its peaks rather than into the sea. `headland`
 * is a high fell nearer in at its southern end: from `hero` it stands on the
 * left of the frame with the low sun just clear of its shoulder (a test holds
 * that). `holm` is a lower island to the north, for the summit's view, and
 * `stacks` a few rocks off the headland, nearer and so clearer, that say how
 * far away the rest is.
 */
export const REACHES: readonly Reach[] = [
  { name: 'mainland', from: -124, to: -38, near: 540, far: 1000, height: 182, peak: -96, breadth: 0.42, grain: 0.0045, seed: 1 },
  { name: 'headland', from: -120, to: -78, near: 360, far: 620, height: 240, peak: -96, breadth: 1, grain: 0.0042, seed: 4 },
  { name: 'holm', from: -16, to: 22, near: 900, far: 1180, height: 52, peak: 2, breadth: 0.42, grain: 0.009, seed: 2 },
  { name: 'stacks', from: -106, to: -92, near: 300, far: 360, height: 40, peak: -99, breadth: 0.42, grain: 0.05, seed: 3 },
]

/** Grid cells along and across each reach, by tier: about six units a cell along on desktop. */
const ALONG: Record<QualityTier, number>  = { mobile: 0.55, desktop: 1, highEnd: 1.4 }
const CELL                                = 7
const ACROSS: Record<QualityTier, number> = { mobile: 12, desktop: 20, highEnd: 26 }

/** How much of a reach's height lies under the water at its edges, so every coast shelves into the sea. */
const SHELF = 0.22

/** The skyline is measured every this many degrees of bearing, and this many units out along each. */
const SKYLINE_STEP  = 0.5
const SKYLINE_REACH = 4

/** How far an end of a reach runs out into the sea, in multiples of its height. */
const TAPER = 1.4

/** Cells whose every corner is this far under the water are left out: the sea is opaque out there. */
const SUNK = -3

const SAND  = new THREE.Color(PALETTE.sand)
// Green is the first colour distance takes: far off, the grass is half stone.
const GRASS = new THREE.Color(PALETTE.grass).lerp(new THREE.Color(PALETTE.rock), 0.5)
const DRY   = new THREE.Color(PALETTE.grassDry).lerp(new THREE.Color(PALETTE.rock), 0.5)
const ROCK  = new THREE.Color(PALETTE.rock)

/**
 * The year's first snow: the sea's own white, lying on the far tops and
 * nowhere on the island. The heights between which it comes in, and the
 * slopes between which a face is too steep to hold it.
 */
const SNOW      = new THREE.Color(PALETTE.foam)
const SNOWLINE  = [ 68, 96 ] as const
const TOO_STEEP = [ 0.5, 0.78 ] as const

const scratch = new THREE.Color()

/** One stretch of land on the horizon. */
export interface Reach {
  name: string

  /** Bearings it runs between, in degrees. */
  from: number
  to:   number

  /** Distances from the island's middle its seaward and landward edges lie at. */
  near: number
  far:  number

  /** Its tallest ground, above the water. */
  height: number

  /** The bearing its highest ground stands at, and how much of its length that high ground spreads over. */
  peak:    number
  breadth: number

  /** How fine its hills are: noise cycles a world unit. */
  grain: number

  /** Added to the world's seed, so each reach has hills of its own. */
  seed: number
}

/** A reach with its noise: what answers how high it is anywhere. */
export interface Land {
  reach: Reach
  noise: Noise2D
}

/** Toward a bearing, on the ground, as [x, z] per unit. */
export function heading (bearing: number): [number, number] {
  const angle = THREE.MathUtils.degToRad(bearing)

  return [ Math.sin(angle), -Math.cos(angle) ]
}

export function createLands (seed: number): Land[] {
  return REACHES.map(reach => ({ reach, noise: createNoise2D(seed + reach.seed * 7919) }))
}

/**
 * Height of a reach above the water at a bearing and a distance.
 *
 * A ridge along the middle of the reach, highest near `peak`, roughened by
 * ridged noise into peaks and saddles, and shelving under the water at every
 * edge so that each end is a headland and the near side a coast.
 */
export function landHeight ({ reach, noise }: Land, bearing: number, distance: number): number {
  const along  = (bearing - reach.from) / (reach.to - reach.from)
  const across = (distance - reach.near) / (reach.far - reach.near)

  if (along <= 0 || along >= 1 || across <= 0 || across >= 1)
    return -reach.height * SHELF

  // World units along the arc and across it, so the noise is round.
  // The ends go down into the sea over a reach that grows with the height,
  // so that a tall headland ends in a shoulder and not a wall.
  const middle = (reach.near + reach.far) / 2
  const arc    = THREE.MathUtils.degToRad(bearing) * middle
  const taper  = Math.min(0.45, reach.height * TAPER / (THREE.MathUtils.degToRad(reach.to - reach.from) * middle))
  const ends   = smoothstep(0, taper, along) * (1 - smoothstep(1 - taper, 1, along))
  const side   = Math.pow(Math.sin(Math.PI * across), 0.7) * (1 - 0.35 * across)
  const peak   = Math.exp(-(((bearing - reach.peak) / ((reach.to - reach.from) * reach.breadth)) ** 2))

  const crest = noise.ridged(arc * reach.grain, distance * reach.grain, 3, 2, 0.4)
  const hills = noise.fbm(arc * reach.grain * 2.3 + 11, distance * reach.grain * 2.3, 3)
  const rise  = (0.3 + 0.7 * peak) * (0.4 + 0.6 * crest) + 0.1 * hills

  return reach.height * ((1 + SHELF) * ends * side * rise - SHELF)
}

/**
 * How high the land on the horizon stands toward each bearing, seen from the
 * island's middle at the water, in degrees: what the sun goes down behind.
 * Under the horizon (-90) where there is only sea. Measured once, on a table.
 */
export function createSkyline (lands: readonly Land[]): (bearing: number) => number {
  const table = new Map<number, number>()

  for (const land of lands) {
    const { from, to, near, far } = land.reach

    for (let bearing = Math.ceil(from / SKYLINE_STEP) * SKYLINE_STEP; bearing <= to; bearing += SKYLINE_STEP)
      for (let distance = near; distance <= far; distance += SKYLINE_REACH) {
        const height = landHeight(land, bearing, distance)
        const key    = Math.round(bearing / SKYLINE_STEP)

        if (height > 0)
          table.set(key, Math.max(table.get(key) ?? -90, THREE.MathUtils.radToDeg(Math.atan2(height, distance))))
      }
  }

  return bearing => {
    const at   = bearing / SKYLINE_STEP
    const low  = table.get(Math.floor(at)) ?? -90
    const high = table.get(Math.ceil(at)) ?? -90

    return Math.min(low, high) === -90 ? Math.max(low, high) : THREE.MathUtils.lerp(low, high, at - Math.floor(at))
  }
}

/** What the far ground is made of, as a colour: the island's own bands, coarser, and snow on the highest of it. */
function colourAt (height: number, slope: number, reach: Reach, out: THREE.Color): THREE.Color {
  out.copy(SAND)
  out.lerp(GRASS, smoothstep(0.5, 3, height))
  out.lerp(DRY, smoothstep(0.3, 0.6, height / reach.height))

  out.lerp(ROCK, smoothstep(0.35, 0.7, slope))

  // A dusting on the tops, off the steepest faces: only the mountain coast is high enough.
  return out.lerp(SNOW, smoothstep(SNOWLINE[0], SNOWLINE[1], height) * (1 - smoothstep(TOO_STEEP[0], TOO_STEEP[1], slope)))
}

/** One reach as a grid of positions and colours, appended to the arrays, and the indices of its cells that show. */
function appendReach (land: Land, tier: QualityTier, positions: number[], colours: number[], indices: number[]): void {
  const { reach }         = land
  const span              = THREE.MathUtils.degToRad(reach.to - reach.from) * (reach.near + reach.far) / 2
  const columns           = Math.max(8, Math.round(span / CELL * ALONG[tier]))
  const rows              = ACROSS[tier]
  const first             = positions.length / 3
  const heights: number[] = []

  for (let row = 0; row <= rows; row += 1)
    for (let column = 0; column <= columns; column += 1) {
      const bearing  = THREE.MathUtils.lerp(reach.from, reach.to, column / columns)
      const distance = THREE.MathUtils.lerp(reach.near, reach.far, row / rows)
      const [ x, z ] = heading(bearing)
      const height   = landHeight(land, bearing, distance)

      heights.push(height)
      positions.push(x * distance, height, z * distance)
    }

  const side = columns + 1

  for (let row = 0; row <= rows; row += 1)
    for (let column = 0; column <= columns; column += 1) {
      const here   = row * side + column
      const across = (heights[Math.min(row + 1, rows) * side + column]! - heights[Math.max(row - 1, 0) * side + column]!) / ((reach.far - reach.near) / rows * 2)
      const along  = (heights[row * side + Math.min(column + 1, columns)]! - heights[row * side + Math.max(column - 1, 0)]!) / (span / columns * 2)
      const slope  = 1 - 1 / Math.hypot(along, across, 1)

      colourAt(heights[here]!, slope, reach, scratch).toArray(colours, (first + here) * 3)
    }

  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns; column += 1) {
      const a = row * side + column
      const b = a + 1
      const c = a + side
      const d = c + 1

      if (Math.max(heights[a]!, heights[b]!, heights[c]!, heights[d]!) < SUNK)
        continue

      indices.push(first + a, first + b, first + c, first + b, first + d, first + c)
    }
}

/** Every reach in one geometry: one draw call for all the land on the horizon. */
export function createBeyondGeometry (lands: readonly Land[], tier: QualityTier): THREE.BufferGeometry {
  const positions: number[] = []
  const colours: number[]   = []
  const indices: number[]   = []

  for (const land of lands)
    appendReach(land, tier, positions, colours, indices)

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

// perf: built once, at boot. 3k triangles on mobile, 9k on desktop, 16k on
// highEnd for all four reaches; the cells under the sea are left out. The
// skyline is a table of a few hundred bearings, marched once; asking it is a
// lookup and a lerp, once a step.
