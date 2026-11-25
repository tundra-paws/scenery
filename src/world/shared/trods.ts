// src/world/shared/trods.ts
import { createSeededRng } from 'threejs-scenes/primitives'

import { HEFTS } from './flock.ts'
import type { Ground } from './ground.ts'
import type { Infield } from './infield.ts'
import type { Mill } from './mill.ts'
import type { Path, Waypoint } from './path.ts'
import type { Shelter } from './shelter.ts'


/** Trods looked for on each heft, and the tries for where one starts. */
const COUNT = 8
const TRIES = 30

/** The least reach of a heft that has trods: a hill, not a yard. */
const HILL = 6

/** How far a trod runs each way from where it starts, at most, and the shortest worth keeping. */
const HALF_LONG = 26
const SHORTEST  = 7

/** Units between the points of a trod, and how far it is let wander off the level, in radians. */
const PACE   = 0.8
const WANDER = 0.22

/**
 * Where a trod may run: on the grass over the beach, not up a crag, not
 * through a wall, the field, the house or the fold, and it stops where it
 * meets the path, short of the bare ground. Closer to things than a sheep
 * stands, because a sheep's shoulder is wider than its feet.
 */
const SHORE = 1.4
const CRAG  = 0.55
const OFF   = { path: 1.8, wall: 1, shelter: 3, spur: 1.4, summit: 5, fold: 0.8 } as const

/** What the rule for a trod reads. */
interface Site {
  ground:  Ground
  summit:  Waypoint
  path:    Path
  shelter: Shelter
  infield: Infield

  /** The mill, where there is one: no trod runs through it, or along the way to its door. */
  mill?: Mill
}

/** Whether a trod may run through a place. */
function open ({ ground, summit, path, shelter, infield, mill }: Site, x: number, z: number): boolean {
  const { fold } = infield

  return ground.heightAt(x, z) > ground.waterLevel + SHORE &&
    ground.slopeAt(x, z) < CRAG &&
    !infield.inField(x, z) &&
    infield.distanceTo(x, z) > OFF.wall &&
    path.distanceTo(x, z) > OFF.path &&
    shelter.distanceTo(x, z) > OFF.shelter &&
    shelter.distanceToSpur(x, z) > OFF.spur &&
    (mill === undefined || mill.distanceTo(x, z) > OFF.shelter && mill.distanceToSpur(x, z) > OFF.spur) &&
    Math.hypot(x - summit.x, z - summit.z) > OFF.summit &&
    Math.hypot(x - fold.x, z - fold.z) > fold.radius + OFF.fold
}

/** One way along the level from `start`: `sign` picks which. Wavering, and stopping where the rule does. */
function follow (site: Site, start: Waypoint, sign: number, swing: number): Waypoint[] {
  const { ground } = site
  const line       = [] as Waypoint[]
  let { x, z }   = start
  let [ dx, dz ] = [ 0, 0 ]

  for (let along = PACE; along <= HALF_LONG; along += PACE) {
    // Square to the fall of the land, kept turning the way it was going.
    const fallX = ground.heightAt(x + 0.5, z) - ground.heightAt(x - 0.5, z)
    const fallZ = ground.heightAt(x, z + 0.5) - ground.heightAt(x, z - 0.5)
    const fall  = Math.hypot(fallX, fallZ)

    if (fall < 0.02)
      break

    let [ ax, az ] = [ -fallZ / fall * sign, fallX / fall * sign ]

    if (line.length > 0 && ax * dx + az * dz < 0)
      [ ax, az ] = [ -ax, -az ]

    // A slow waver up and down the slope, so no trod is ruled.
    const turn = WANDER * Math.sin(along * 0.19 + swing)
    const nx   = x + (ax * Math.cos(turn) - az * Math.sin(turn)) * PACE
    const nz   = z + (ax * Math.sin(turn) + az * Math.cos(turn)) * PACE

    if (!open(site, nx, nz))
      break;
    [ dx, dz ] = [ nx - x, nz - z ]
    x           = nx
    z           = nz
    line.push({ x, z })
  }

  return line
}

/**
 * The sheep's trods: the narrow ways their feet have worn across the hefts,
 * along the level of the slope, the way a sheep goes round a hill rather
 * than up it. Each is a line of points; the terrain wears them into the
 * grass, fainter and narrower than the path.
 */
export function traceTrods (site: Site, seed: number): Waypoint[][] {
  const trods = [] as Waypoint[][]

  for (const heft of HEFTS) {
    // The fold and the dooryard are too small to go round: only a hill has trods.
    if (heft.penned || heft.reach < HILL)
      continue

    const rng = createSeededRng(seed).fork(`trods:${heft.name}`)

    for (let trod = 0; trod < COUNT; trod += 1)
      for (let tries = 0; tries < TRIES; tries += 1) {
        const away  = Math.sqrt(rng.next()) * heft.reach
        const angle = rng.range(0, Math.PI * 2)
        const start = { x: heft.x + Math.cos(angle) * away, z: heft.z + Math.sin(angle) * away }
        const swing = rng.range(0, Math.PI * 2)

        if (!open(site, start.x, start.z))
          continue

        const line = [ ...follow(site, start, -1, swing).reverse(), start, ...follow(site, start, 1, swing + 1.3) ]

        if ((line.length - 1) * PACE >= SHORTEST)
          trods.push(line)

        break
      }
  }

  return trods
}

// perf: cheap, once — some two dozen trods of up to sixty-odd points, five
// ground samples a point and the rule's. Nothing per frame.
