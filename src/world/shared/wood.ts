// src/world/shared/wood.ts
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from './ground.ts'
import type { Path, Waypoint } from './path.ts'
import { SHELTER_LONG } from './shelter.ts'
import type { Shelter } from './shelter.ts'

/**
 * The middle of the wood: the low shoulder east of the shelter, between the
 * house and the shore.
 *
 * Typed in, like the shelter's site, because it was chosen by looking: from
 * `hero` the wood fills the right of the frame, beside and behind the house,
 * and leaves the cairn its hill and its sky. Which trees stand round it, how
 * tall and how bent, is read from the land.
 */
const HEART: Waypoint = { x: 67, z: 43 }

/** How far from the heart a tree may stand, and the part of that inside which the wood is as thick as it gets. */
const REACH = 31
const THICK = 0.34

/** Spots tried, and the most trees kept. The wood is the same on every tier: what a tier scales is how a tree is drawn. */
const TRIES = 2000
const MOST  = 78

/** The least ground between two trunks, in the thick of the wood and at its edge. */
const APART = [ 2.7, 5 ] as const

/** Height over the water of the lowest ground a birch will root in (above the sand), and of the highest. */
const SHORE    = 1.9
const TREELINE = 20

/** The steepest ground a tree stands on (`ground.slopeAt`). */
const STEEP = 0.2

/** Clear ground kept from the middle of the path, from the shelter's walls and from the way to its door. */
const OFF_PATH    = 5
const OFF_SHELTER = 5
const OFF_SPUR    = 4

/** How tall a birch grows on the low ground in the thick of the wood, and at the treeline or the wood's edge. */
const TALL  = 10.5
const SCRUB = 4.6

/** How far a tree's top stands downwind of its foot, as a part of its height: in shelter, and what exposure adds. */
const LEAN    = 0.1
const FLAGGED = 0.2

/** Trees nearest the door that were cut for the fire, and how near the door one has to be for that. */
const FELLED  = 3
const CARRIED = 22

/** A birch, as a place on the ground and a size. */
export interface Tree extends Waypoint {

  /** World height of the ground at its foot. */
  readonly foot: number

  /** From its foot to its topmost leaf. */
  readonly height: number

  /** How far its top stands downwind of its foot, as a part of its height. */
  readonly lean: number
}

/**
 * The wood, as places on the ground.
 *
 * DOM-free and GPU-free, like the ground, the path and the shelter: the
 * feature grows a birch at each place, the boulders keep off them, and a test
 * can ask where they are.
 */
export interface Wood extends Waypoint {

  /** How far from the heart the wood reaches. */
  readonly reach: number

  /** The standing trees, thickest of the wood first. */
  readonly trees: readonly Tree[]

  /** What is left of the ones nearest the door, which went on the fire. */
  readonly stumps: readonly Tree[]

  /** How far a place is from the nearest trunk or stump. */
  distanceTo (x: number, z: number): number
}

/** What the rule for a spot reads. */
interface Site {
  ground:  Ground
  path:    Path
  shelter: Shelter
}

/** Whether a birch could root at a place: dry, not too high, not too steep, and out from under feet and walls. */
function roots ({ ground, path, shelter }: Site, x: number, z: number): boolean {
  const above = ground.heightAt(x, z) - ground.waterLevel

  if (above < SHORE || above > TREELINE)
    return false

  // Nothing is let grow before the door: the house looks down to the landing.
  const along = (x - shelter.x) * shelter.door[0] + (z - shelter.z) * shelter.door[1]

  return along < SHELTER_LONG / 2 - 1 &&
    shelter.distanceTo(x, z) > OFF_SHELTER &&
    path.distanceTo(x, z) > OFF_PATH &&
    shelter.distanceToSpur(x, z) > OFF_SPUR &&
    ground.slopeAt(x, z) < STEEP
}

export function createWood (site: Site, seed: number): Wood {
  const { ground, shelter } = site
  const rng                 = createSeededRng(seed).fork('wood:place')
  const stand: Tree[]       = []

  for (let tries = 0; tries < TRIES && stand.length < MOST; tries += 1) {
    // Every draw is taken whether or not the spot is kept, so moving one rule
    // moves the trees it turns away and no others.
    const away  = Math.sqrt(rng.next())
    const angle = rng.range(0, Math.PI * 2)
    const luck  = rng.next()
    const grown = rng.range(0.8, 1.16)
    const bent  = rng.range(-0.03, 0.05)
    const x     = HEART.x + Math.cos(angle) * away * REACH
    const z     = HEART.z + Math.sin(angle) * away * REACH
    const edge  = smoothstep(THICK, 1, away)
    const apart = APART[0] + (APART[1] - APART[0]) * edge

    // Thinning toward its edge, and never two trunks in one place.
    if (luck < edge * 0.85 || stand.some(tree => Math.hypot(tree.x - x, tree.z - z) < apart) || !roots(site, x, z))
      continue

    const foot     = ground.heightAt(x, z)
    const exposure = Math.max(smoothstep(5, TREELINE, foot - ground.waterLevel), edge * 0.6)

    stand.push({
      x,
      z,
      foot,
      height: (TALL + (SCRUB - TALL) * exposure) * grown,
      lean:   LEAN + FLAGGED * exposure + bent,
    })
  }

  // The nearest to the door went first.
  const door   = shelter.place(0, SHELTER_LONG / 2)
  const near   = (tree: Tree): number => Math.hypot(tree.x - door.x, tree.z - door.z)
  const stumps = stand.filter(tree => near(tree) < CARRIED).sort((a, b) => near(a) - near(b))
    .slice(0, FELLED)
  const trees  = stand.filter(tree => !stumps.includes(tree))

  return {
    ...HEART,
    trees,
    stumps,
    reach: REACH,

    distanceTo (x, z) {
      let nearest = Infinity

      for (const tree of stand)
        nearest = Math.min(nearest, Math.hypot(tree.x - x, tree.z - z))

      return nearest
    },
  }
}

// perf: cheap — up to 1400 spots tried once, each one ground sample and, for
// the few that pass everything else, the four of its slope. `distanceTo` is a
// pass over 78 trunks: ask it at build time, not per frame.
