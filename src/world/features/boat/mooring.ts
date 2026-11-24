// src/world/features/boat/mooring.ts
import type { Ground } from '../../shared/ground.ts'
import type { Path } from '../../shared/path.ts'
import type { Wind } from '../../shared/wind.ts'

/** Where the boat lies when the wind holds it straight: this far out from the waterline, and this far along the shore from the landing. */
const OUT   = 13.5
const ASIDE = 13

/** How far upwind of the boat's middle its anchor went down. */
export const SCOPE = 13

/** The least water the boat is content to lie in, from end to end and wherever it swings. */
export const AFLOAT = 1

/**
 * How far the boat swings about its anchor, in radians either way: in a lull,
 * when nothing holds it, and in a gust, when the wind has it by the bow.
 */
const SWING = [ 0.15, 0.05 ] as const

/** Where the boat lies, and what it lies to. */
export interface Mooring {

  /** The anchor, on the bottom upwind of the boat. Everything swings about this. */
  anchor: { x: number, z: number }

  /** Where the middle of the boat is when it lies straight downwind of its anchor. */
  rest: { x: number, z: number }

  /** Height of the water it floats on. */
  level: number
}

/** How the boat lies at one moment. */
export interface Berth {

  /** The middle of the boat, on the water. */
  x: number
  z: number

  /** How far its waterline is over the water's level: it rides. */
  heave: number

  /** Its turn about the upright, as three takes it: the bow is toward the anchor. */
  yaw: number

  /** Bow up, in radians, and over to starboard. */
  pitch: number
  roll:  number
}

/**
 * Pick the boat's place: off the landing and to one side of it, clear of the
 * way the tour comes in between the two rows of stones, and lying to an
 * anchor laid out upwind, the way a boat is left off a beach the wind blows on.
 */
export function findMooring (ground: Ground, path: Path, wind: Wind): Mooring {
  const { x, z, seaward: [ sx, sz ] } = path.landing

  // To the side of the landing the wind does not blow the boat back across.
  const side = sz * wind.direction[0] - sx * wind.direction[1] >= 0 ? 1 : -1
  const rest = { x: x + sx * OUT + sz * side * ASIDE, z: z + sz * OUT - sx * side * ASIDE }

  return {
    rest,
    anchor: { x: rest.x - wind.direction[0] * SCOPE, z: rest.z - wind.direction[1] * SCOPE },
    level:  ground.waterLevel,
  }
}

/**
 * How the boat lies at `time` seconds, written into `out`.
 *
 * A pure function of the time, like everything that moves here. The boat
 * hangs downwind of its anchor and sheers slowly from side to side about it,
 * wide when the wind drops and narrow when a gust takes it by the bow, which
 * is the wind read on the CPU (`wind.gustAt`) as the shelter's smoke reads
 * it. On top of that it rides: a little heave, a little pitch, more roll.
 */
export function berthAt ({ anchor, rest, level }: Mooring, wind: Wind, time: number, out: Berth): Berth {
  const gust  = wind.gustAt(rest.x, rest.z, time)
  const reach = SWING[0] + (SWING[1] - SWING[0]) * gust
  const sheer = reach * Math.sin(time * 0.21 + 0.6) + 0.035 * Math.sin(time * 0.37 + 2.1)

  // Downwind of the anchor, turned by the sheer.
  const dx = wind.direction[0] * Math.cos(sheer) - wind.direction[1] * Math.sin(sheer)
  const dz = wind.direction[0] * Math.sin(sheer) + wind.direction[1] * Math.cos(sheer)

  out.x     = anchor.x + dx * SCOPE
  out.z     = anchor.z + dz * SCOPE
  out.heave = level + 0.045 * Math.sin(time * 0.9) + 0.025 * Math.sin(time * 1.37 + 1.1)
  out.yaw   = Math.atan2(dz, -dx)
  out.pitch = 0.022 * Math.sin(time * 0.8 + 0.4) + 0.01 * Math.sin(time * 1.9)
  out.roll  = 0.05 * Math.sin(time * 0.62 + 2) + 0.02 * Math.sin(time * 1.41)

  return out
}

// perf: trivial — the place is found once; a step is a dozen sines and one
// question to the wind.
