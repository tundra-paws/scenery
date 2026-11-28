// src/world/shared/skerry.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createSeededRng, smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from './ground.ts'
import type { Waypoint } from './path.ts'
import { SQUAT, createStoneGeometry } from './stone.ts'

/**
 * Where the skerry lies: its middle, the way its back runs, and half its
 * length along that. Typed in to fit `hero`, as the shelter's site is: off
 * the east shore, in the bottom right of that frame, broadside to it, clear
 * of the views that stand on the water there and of the tour's way between
 * them (`skerry.test.ts` says so when a view moves).
 */
export const REEF = { x: 73.9, z: 77.8, strike: [ 0.63, -0.777 ], half: 3.6 } as const

/** How many seals haul out on it. A phone gets the idea of them. */
const SEALS: Record<QualityTier, number> = { mobile: 4, desktop: 6, highEnd: 7 }

/** Rocks along its back, the slabs beside them where the seals lie, and the ones awash round its ends. */
const SPINE = 5
const SLABS = 7
const AWASH = 6

/** How high over the water the back stands at its highest and at its ends, a slab, and a rock awash. */
const STAND = { back: [ 0.75, 1.9 ], slab: [ 0.4, 0.75 ], awash: [ -0.02, 0.3 ]} as const

/** How far under the sea bed a rock is footed, so none is seen to float from under the water. */
const FOOTED = 0.3

/** The sun's height, in degrees, between which a seal settles to sleep; each has its own within this. */
const REST = [ -7, -2 ] as const
const DOZE = 2.5

/** How level a rock's face must be for a seal to lie on it, as the upward part of the way it looks. */
const LEVEL = 0.8

/** How long a seal looks round, and how long it holds itself up at both ends, in seconds. */
const LOOK   = 7
const BANANA = 5
const EASE   = 1.3

/** How long the one in the water shows its head each time it comes up, and how long from one time to the next. */
const SHOWS  = 13
const BREATH = 31

/** Where it comes up: along the reef and out from it on the side the open sea is, in the reef's own frame. */
const RISES = [[ -2.5, 6.2 ], [ 3.4, 7.4 ], [ 0.6, 9.5 ]] as const

/** Where on the stone its top is planed off, as a part of its half-height, and how much of what was over that is left. */
const PLANED = { from: 0.18, keep: 0.3 } as const

/** How tall the planed stone is, foot to top, for each unit it is stretched upward: its squat half under, the planed part over. */
const TALL = SQUAT * (1 + PLANED.from + (1 - PLANED.from) * PLANED.keep)

/** Module-scope scratch, so a question allocates nothing. */
const ray    = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0))
const hit    = new THREE.Vector3()
const edgeA  = new THREE.Vector3()
const edgeB  = new THREE.Vector3()
const turn   = new THREE.Euler()
const spin   = new THREE.Quaternion()
const place  = new THREE.Vector3()
const size   = new THREE.Vector3()
const corner = new THREE.Vector3()

/** One rock of the reef: where its middle is, how it is turned and how big, as the matrix its stone is drawn with. */
export interface Rock extends Waypoint {

  /** Height of its top over the world's zero. */
  top: number

  /** Half its width where it is widest, for what keeps clear of it. */
  reach: number

  /** Half its width where the water cuts it at high water, for the sea to break round. Nothing when it lies under. */
  footing: number

  /** The same at low water, when every one of them stands out of it. */
  ebbed:  number
  matrix: THREE.Matrix4

  /** Lighter or darker than the rock's own grey. The ones awash are wet, and darker. */
  shade: number
}

/** A seal, hauled out: where it lies and how, which never changes, and what it is like. */
export interface Seal extends Waypoint {

  /** Height of the rock under its middle. */
  y: number

  /** Its heading, as an angle from the world's x toward its z. */
  yaw: number

  /** The rock's face under it, as the way that face looks: it lies as the facet does. */
  lie:  readonly [number, number, number]
  size: number

  /** 0 for the palest coat, 1 for the darkest. */
  coat: number

  /** Its own time: when in its round it looks about, how long the round is, and the sun's height it sleeps under. */
  phase:  number
  period: number
  rest:   number
  whim:   number
}

/** How a seal holds itself at one moment, each from 0 to 1 but `turn`, which is radians either way. */
export interface Haul {

  /** Its head, from flat on the rock to as high as it lifts it. */
  lift: number
  turn: number

  /** Its hind flippers, from trailing on the rock to curled up over its back. */
  tail: number
}

/** The seal in the water, at one moment. */
export interface Swim extends Waypoint {

  /** How much of its head is out: 0 when it is under. */
  up:  number
  yaw: number
}

/**
 * The skerry: a reef off the east shore that the tide never covers, the
 * sea-mark someone stacked on its highest rock, and the seals on it.
 *
 * A layout and a clock, DOM-free and GPU-free like the flock's: the feature
 * draws it, the sea breaks round `rocks`, and the tests ask it where
 * everything is.
 */
export interface Skerry extends Waypoint {

  /** The seed the one stone every rock is a copy of was cut from. */
  shape: number
  rocks: readonly Rock[]

  /** The top of its highest rock, where the mark stands. */
  mark:  Waypoint & { y: number }
  seals: readonly Seal[]

  /** How far a place is from the edge of the nearest rock: negative over one. */
  distanceTo (x: number, z: number): number

  /** Height of the rock at a place, or `null` over open water. */
  heightAt (x: number, z: number): number | null

  /** How `seal` holds itself at `time`, with the sun `elevation` degrees up. */
  haul (seal: Seal, time: number, elevation: number, out: Haul): Haul

  /** Where the one in the water is at `time`, and how much of it shows. */
  swim (time: number, elevation: number, out: Swim): Swim
}

/** A stone's corners in the world, three to a facet, and what `heightAt` reads. */
interface Cut {
  rock:    Rock
  corners: Float32Array
}

interface Surface {
  y:      number
  normal: THREE.Vector3
}

/**
 * The reef's stone: the boulders' own (`stone.ts`), with its top planed
 * nearly flat by the sea, so a rock that goes down to the bed still shows
 * the sky a level face, and a seal has somewhere to lie.
 */
export function createReefStone (seed: number): THREE.BufferGeometry {
  const geometry = createStoneGeometry(seed)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index)

    if (y > PLANED.from * SQUAT)
      position.setY(index, PLANED.from * SQUAT + (y - PLANED.from * SQUAT) * PLANED.keep)
  }

  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/** 0 outside a spell of `length` seconds starting at `from`, 1 inside it, eased at both ends. */
function spell (at: number, from: number, length: number): number {
  return smoothstep(from, from + EASE, at) * (1 - smoothstep(from + length - EASE, from + length, at))
}

/** A place in the reef's own frame (along its back, out to seaward) as one in the world. */
function reefToWorld (along: number, out: number): Waypoint {
  const [ sx, sz ] = REEF.strike

  // Seaward is the strike turned a right angle, away from the island.
  return { x: REEF.x + sx * along - sz * out, z: REEF.z + sz * along + sx * out }
}

/**
 * Set one rock: the stone, turned and stretched, then sunk until its top
 * stands `stand` over the water. The stone's own lumps decide where its top
 * is, so it is measured, not guessed.
 */
function setRock (stone: THREE.BufferAttribute, at: Waypoint, spread: readonly [number, number, number], yaw: number, tilt: readonly [number, number], stand: number, level: number): Cut {
  turn.set(tilt[0], yaw, tilt[1])
  spin.setFromEuler(turn)
  place.set(at.x, 0, at.z)
  size.set(...spread)

  const matrix  = new THREE.Matrix4().compose(place, spin, size)
  const corners = new Float32Array(stone.count * 3)

  let top = -Infinity

  for (let index = 0; index < stone.count; index += 1) {
    corner.fromBufferAttribute(stone, index).applyMatrix4(matrix)
    corner.toArray(corners, index * 3)
    top = Math.max(top, corner.y)
  }

  const sink = level + stand - top

  matrix.elements[13] = sink

  for (let index = 1; index < corners.length; index += 3)
    corners[index] = corners[index]! + sink

  const reach = Math.max(spread[0], spread[2])

  return {
    corners,
    rock: {
      ...at,
      top:     level + stand,
      reach,
      footing: stand > 0 ? (spread[0] + spread[2]) / 2 * (0.55 + 0.4 * Math.min(1, stand / 0.5)) : 0,
      ebbed:   (spread[0] + spread[2]) / 2 * 0.95,
      matrix,
      shade:   0,
    },
  }
}

/** The rock's surface under a place, from above: the highest facet any stone has there. */
function surfaceAt (cuts: readonly Cut[], x: number, z: number, out: Surface): Surface | null {
  let found = false

  ray.origin.set(x, 100, z)
  out.y = -Infinity

  for (const { rock, corners } of cuts) {
    if (Math.hypot(rock.x - x, rock.z - z) > rock.reach * 1.4)
      continue

    for (let index = 0; index < corners.length; index += 9) {
      edgeA.fromArray(corners, index)
      edgeB.fromArray(corners, index + 3)
      corner.fromArray(corners, index + 6)

      if (!ray.intersectTriangle(edgeA, edgeB, corner, true, hit) || hit.y <= out.y)
        continue

      found = true
      out.y = hit.y
      out.normal.crossVectors(edgeB.sub(edgeA), corner.sub(edgeA)).normalize()
    }
  }

  return found ? out : null
}

/** The reef's rocks: its back, highest in the middle; the slabs under it on either side; and the ones awash. */
function layReef (ground: Ground, seed: number, stone: THREE.BufferAttribute): Cut[] {
  const rng         = createSeededRng(seed).fork('skerry:reef')
  const level       = ground.waterLevel
  const cuts: Cut[] = []
  const strike      = Math.atan2(-REEF.strike[1], REEF.strike[0])
  const deep        = (at: Waypoint, stand: number): number => (level + stand - ground.heightAt(at.x, at.z) + FOOTED) / TALL
  const set         = (at: Waypoint, wide: number, long: number, stand: number, shade: number): void => {
    const cut = setRock(stone, at, [ wide * long, deep(at, stand), wide ], strike + rng.range(-0.35, 0.35), [ rng.range(-0.08, 0.08), rng.range(-0.08, 0.08) ], stand, level)

    cut.rock.shade = shade
    cuts.push(cut)
  }

  for (let index = 0; index < SPINE; index += 1) {
    const along = (index / (SPINE - 1) * 2 - 1) * REEF.half * 0.82
    const crest = 1 - Math.abs(along / REEF.half - 0.15) ** 1.6

    set(reefToWorld(along + rng.range(-0.3, 0.3), rng.range(-0.4, 0.4)), rng.range(1.5, 1.9) + crest * 0.4, rng.range(1.1, 1.35), THREE.MathUtils.lerp(STAND.back[0], STAND.back[1], Math.max(0, crest)), rng.range(0.01, 0.07))
  }

  for (let index = 0; index < SLABS; index += 1) {
    const side  = index % 2 === 0 ? 1 : -1
    const along = ((index + 0.5) / SLABS * 2 - 1) * REEF.half * 0.95

    set(reefToWorld(along + rng.range(-0.3, 0.3), side * rng.range(2.2, 2.9)), rng.range(1.6, 1.95), rng.range(1.15, 1.4), rng.range(STAND.slab[0], STAND.slab[1]), rng.range(-0.01, 0.05))
  }

  for (let index = 0; index < AWASH; index += 1) {
    const end   = index % 2 === 0 ? 1 : -1
    const along = end * (REEF.half + rng.range(0.6, 2.6))

    set(reefToWorld(along, rng.range(-2.6, 3.6)), rng.range(0.7, 1.3), rng.range(1, 1.3), rng.range(STAND.awash[0], STAND.awash[1]), rng.range(-0.08, -0.03))
  }

  return cuts
}

/** The seals, each on a slab of its own: lying along the rock as it finds it, head to the open sea more often than not. */
function haulOut (cuts: readonly Cut[], seed: number, count: number): Seal[] {
  const rng           = createSeededRng(seed).fork('skerry:seals')
  const under         = { y: 0, normal: new THREE.Vector3() }
  const seals: Seal[] = []
  const seaward       = Math.atan2(REEF.strike[0], -REEF.strike[1])

  for (const { rock } of cuts.slice(SPINE, SPINE + SLABS)) {
    const yaw = seaward + rng.range(-1.1, 1.1) + (rng.next() < 0.3 ? Math.PI : 0)
    const lie = surfaceAt(cuts, rock.x, rock.z, under)

    const seal: Seal = {
      x:      rock.x,
      z:      rock.z,
      y:      lie?.y ?? rock.top,
      yaw,
      lie:    lie ? [ lie.normal.x, lie.normal.y, lie.normal.z ] : [ 0, 1, 0 ],
      size:   rng.range(0.82, 1.08),
      coat:   rng.pick([ 0, 0.1, 0.24, 0.5 ]),
      phase:  rng.range(0, 60),
      period: rng.range(26, 44),
      rest:   rng.range(REST[0], REST[1]),
      whim:   rng.range(0, Math.PI * 2),
    }

    // Every slab draws its seal, so the others stay who they were; a slab
    // that is too steep, or under the back's own rock, is left bare.
    if (seals.length < count && seal.lie[1] > LEVEL)
      seals.push(seal)
  }

  return seals
}

/** The top of a rock: a lumpy stone's highest point is seldom over its middle, so it is looked for. */
function topOf (rock: Rock, height: (x: number, z: number) => number | null): Waypoint & { y: number } {
  const top = { x: rock.x, z: rock.z, y: height(rock.x, rock.z) ?? rock.top }

  for (let dx = -1.5; dx <= 1.5; dx += 0.25)
    for (let dz = -1.5; dz <= 1.5; dz += 0.25) {
      const y = height(rock.x + dx, rock.z + dz)

      if (y !== null && y > top.y) {
        top.x = rock.x + dx
        top.z = rock.z + dz
        top.y = y
      }
    }

  return top
}

export function createSkerry (ground: Ground, seed: number, tier: QualityTier): Skerry {
  const shape  = createSeededRng(seed).fork('skerry:shape')
    .int(1, 1_000_000)
  const cut    = createReefStone(shape)
  const cuts   = layReef(ground, seed, cut.getAttribute('position') as THREE.BufferAttribute)
  const rocks  = cuts.map(({ rock }) => rock)
  const seals  = haulOut(cuts, seed, SEALS[tier])
  const under  = { y: 0, normal: new THREE.Vector3() }
  const height = (x: number, z: number): number | null => surfaceAt(cuts, x, z, under)?.y ?? null

  cut.dispose()

  // The mark stands on the highest of the back.
  const summit = topOf(rocks.slice(0, SPINE).reduce((best, rock) => rock.top > best.top ? rock : best), height)

  return {
    x:        REEF.x,
    z:        REEF.z,
    shape,
    rocks,
    mark:     summit,
    seals,
    heightAt: height,

    distanceTo (x, z) {
      let nearest = Infinity

      for (const rock of rocks)
        nearest = Math.min(nearest, Math.hypot(rock.x - x, rock.z - z) - rock.reach)

      return nearest
    },

    haul (seal, time, elevation, out) {
      const awake  = smoothstep(seal.rest - DOZE, seal.rest + DOZE, elevation)
      const at     = ((time + seal.phase) % seal.period + seal.period) % seal.period
      const look   = spell(at, 2, LOOK)
      const banana = spell(at, seal.period * 0.55, BANANA)

      // Asleep it lies flat. Awake it is never quite still: it breathes.
      out.lift = awake * Math.min(1, 0.07 + 0.03 * Math.sin(time * 0.9 + seal.whim) + look + banana * 0.7)
      out.turn = awake * look * 0.7 * Math.sin(time * 0.55 + seal.whim)
      out.tail = awake * (banana + 0.08 * look)

      return out
    },

    swim (time, elevation, out) {
      const dive           = Math.floor(time / BREATH)
      const at             = time - dive * BREATH
      const [ along, off ] = RISES[dive % RISES.length]!
      const where          = reefToWorld(along, off)

      out.x   = where.x
      out.z   = where.z
      out.up  = spell(at, 3, SHOWS) * smoothstep(REST[0], REST[1], elevation)
      out.yaw = dive * 2.4 + 0.5 * Math.sin(time * 0.4)

      return out
    },
  }
}

// perf: cheap — at build, eighty corners a rock set and measured, and a ray
// through a few rocks' facets for each seal. A step asks `haul` once a seal
// and `swim` once: a dozen sines.
