// src/world/shared/runoff.ts
import type { QualityTier, SeededRng } from 'threejs-scenes'

import type { Burn, Reach } from './burn.ts'
import type { Ground } from './ground.ts'
import type { Waypoint } from './path.ts'


/** How many rills the hill runs with after rain, by tier: fewer on a phone, and the longest kept. */
export const RILLS: Record<QualityTier, number> = { mobile: 20, desktop: 40, highEnd: 44 }

/** Draws allowed for each rill before giving up on filling the count. */
const PATIENCE = 80

/**
 * Where a rill may rise: how high on the hill, as a part of the land's
 * relief, and how steep the land must be there (drop a unit). Run-off
 * gathers on the steep faces under the tops, where the peat is thin.
 */
const HIGH  = [ 0.3, 0.92 ] as const
const STEEP = 0.5

/** How far apart two heads keep, and how far from the burn's spring. */
const APART = 7

/**
 * The faces a rill rises on: the land must fall toward this place, the
 * `hero` camera's, by at least `FACING` (a cosine). Run-off is everywhere
 * after rain; these are the threads the island shows the visit.
 */
const TOWARD: Waypoint = { x: 84, z: 104 }
const FACING           = 0.2

/** Step of the walk downhill, and the distance between a finished rill's points. */
const STRIDE  = 0.2
const SPACING = 0.6

/** Sample spacing for the land's fall, each way. */
const REACH = 0.4

/**
 * Where a rill ends: where the land eases under this drop (it soaks into
 * the turf), within this of the burn (it has joined it), at the sea, or
 * within `KEEP` of what was built on the land (it goes round, out of sight).
 */
const EASES = 0.16
const JOINS = 1.4
const KEEP  = 6

/** How short a rill may be and still be drawn, in units, and the most strides any walks. */
const SHORTEST = 12
const LONGEST  = 900

/** Half a rill's width: a thread, wider as it gathers water down the hill. */
const HALF = [ 0.13, 0.3 ] as const

/**
 * How far a rill wanders off the land's fall, as a part of a stride, and
 * the two lengths it wanders over: water finds its way between tussocks
 * and stones, and no thread of it is ruled.
 */
const WANDER = [ 0.75, 0.35 ] as const
const BENDS  = [ 5.5, 1.9 ] as const

/** How fast its water runs, in units a second, on the level and for each unit of fall: faster than the burn, being shallow. */
const PACE  = 0.9
const HASTE = 2.4

/** What a rill keeps out of: the burn it runs into, and what stands on the land. */
export interface RunoffOptions {
  ground: Ground
  burn:   Burn

  /** Places it must not run through (a house, a mill, a kiln), each with the room it keeps from them. */
  built: readonly Waypoint[]
  rng:   SeededRng
  tier:  QualityTier
}

/** One thread of run-off, as cross-sections from its head down: the burn's own shape, so it is drawn as the burn is. */
export interface Rill {
  readonly reaches: readonly Reach[]
}

/** The land's fall at a place: the unit direction downhill, and the drop for each unit that way. */
type FallAtReturnType = { down: [number, number], drop: number }

function fallAt (ground: Ground, x: number, z: number): FallAtReturnType {
  const dx   = (ground.heightAt(x + REACH, z) - ground.heightAt(x - REACH, z)) / (2 * REACH)
  const dz   = (ground.heightAt(x, z + REACH) - ground.heightAt(x, z - REACH)) / (2 * REACH)
  const drop = Math.hypot(dx, dz)

  return { down: drop > 1e-6 ? [ -dx / drop, -dz / drop ] : [ 0, 1 ], drop }
}

/** Whether water at a place has somewhere to stop: the sea, gentle ground, the burn, or something built. */
function ends ({ ground, burn, built }: RunoffOptions, x: number, z: number, drop: number): boolean {
  return ground.heightAt(x, z) <= ground.waterLevel ||
    drop < EASES ||
    built.some(place => Math.hypot(place.x - x, place.z - z) < KEEP) ||
    burn.distanceTo(x, z) < JOINS
}

/** Walk downhill from a head until the water stops, wandering either side of the fall as it goes (`phase` says how). */
function descend (options: RunoffOptions, head: Waypoint, phase: number): Waypoint[] {
  const line: Waypoint[] = [{ ...head }]

  let { x, z } = head

  for (let stride = 0; stride < LONGEST; stride += 1) {
    const { down, drop } = fallAt(options.ground, x, z)

    if (stride > 0 && ends(options, x, z, drop))
      break

    const gone    = stride * STRIDE
    const aside   = WANDER[0] * Math.sin(gone * Math.PI * 2 / BENDS[0] + phase) + WANDER[1] * Math.sin(gone * Math.PI * 2 / BENDS[1] + phase * 2.3)
    const hx      = down[0] - down[1] * aside
    const hz      = down[1] + down[0] * aside
    const heading = Math.hypot(hx, hz) || 1

    x += hx / heading * STRIDE
    z += hz / heading * STRIDE
    line.push({ x, z })
  }

  return line
}

/** A walked line, as the burn's cross-sections: evenly spaced, its corners eased, each knowing its fall, its width and its water's time. */
function shape (ground: Ground, walked: readonly Waypoint[]): Reach[] {
  const every  = Math.round(SPACING / STRIDE)
  const spaced = walked.filter((_, index) => index % every === 0)
  const line   = spaced.map((point, index) => {
    const before = spaced[Math.max(index - 1, 0)]!
    const after  = spaced[Math.min(index + 1, spaced.length - 1)]!

    return { x: (before.x + point.x * 2 + after.x) / 4, z: (before.z + point.z * 2 + after.z) / 4 }
  })

  let along = 0
  let since = 0

  return line.map((point, index) => {
    const next = line[Math.min(index + 1, line.length - 1)]!
    const last = line[Math.max(index - 1, 0)]!
    const span = Math.hypot(next.x - last.x, next.z - last.z) || 1
    const fall = Math.max(0, (ground.heightAt(last.x, last.z) - ground.heightAt(next.x, next.z)) / span)

    if (index > 0) {
      const step = Math.hypot(point.x - last.x, point.z - last.z)

      along += step
      since += step / (PACE + HASTE * fall)
    }

    return { ...point, along, since, ahead: [ (next.x - last.x) / span, (next.z - last.z) / span ], fall, half: HALF[0] + (HALF[1] - HALF[0]) * index / Math.max(line.length - 1, 1) }
  })
}

/**
 * The hill running with water after rain: threads of run-off that rise on
 * the steep faces under the tops and come down the way the land falls,
 * gathering into its hollows, until the ground eases, or they reach the
 * burn, the sea, or the walls of something built.
 *
 * Found, not drawn, like the burn: a head is put down at random on a steep
 * high face that looks toward the visit, and walked downhill. Two heads that
 * find the same hollow make two threads in it, which is what a gully in
 * spate looks like. DOM-free and GPU-free: the feature draws them, and
 * draws them only while the island is wet.
 */
export function createRunoff (options: RunoffOptions): Rill[] {
  const { ground, burn, rng, tier } = options
  const heads: Waypoint[]           = []
  const rills: Rill[]               = []
  const span                        = ground.size / 2

  for (let tries = 0; rills.length < RILLS[tier] && tries < RILLS[tier] * PATIENCE; tries += 1) {
    const x              = rng.range(-span, span)
    const z              = rng.range(-span, span)
    const height         = (ground.heightAt(x, z) - ground.waterLevel) / ground.relief
    const { down, drop } = fallAt(ground, x, z)
    const toward         = [ TOWARD.x - x, TOWARD.z - z ]
    const facing         = (down[0] * toward[0]! + down[1] * toward[1]!) / (Math.hypot(toward[0]!, toward[1]!) || 1)

    if (height < HIGH[0] || height > HIGH[1] || drop < STEEP || facing < FACING)
      continue

    if (Math.hypot(x - burn.spring.x, z - burn.spring.z) < APART || heads.some(head => Math.hypot(head.x - x, head.z - z) < APART))
      continue

    const reaches = shape(ground, descend(options, { x, z }, rng.range(0, Math.PI * 2)))

    if ((reaches.at(-1)?.along ?? 0) < SHORTEST)
      continue

    heads.push({ x, z })
    rills.push({ reaches })
  }

  return rills
}

// perf: once, at build — a few hundred heads tried, each kept one walked a
// few hundred strides of four ground samples and a look at the burn's sixty
// spans. Nothing per frame.
