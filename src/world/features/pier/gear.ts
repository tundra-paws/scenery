// src/world/features/pier/gear.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { board, join } from '../../shared/boards.ts'
import type { Ground } from '../../shared/ground.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Pier } from '../../shared/pier.ts'
import { DARK, paint } from '../../shared/roof.ts'
import { headRope } from './nets.ts'
import { createTowerGear } from './tower.ts'
import type { Tower } from './tower.ts'
import { BARREL, BEACHED, BOX, COIL, COURSE, CREEL, CREELS, INSET, LADDER, NET, POLE, POST, POSTS, RACK, WALL } from './plan.ts'

/** Wood as it is left, and the same tarred: the boat's two. */
const TIMBER = new THREE.Color(PALETTE.timber)
const TARRED = new THREE.Color(PALETTE.timber).multiplyScalar(0.3)

/** Net steeped in bark to keep it from rotting: the timber's brown, darker. And rope, as the boat's is. */
export const BARKED = new THREE.Color(PALETTE.timber).multiplyScalar(0.52)

const ROPE = new THREE.Color(PALETTE.timber).lerp(new THREE.Color(PALETTE.sand), 0.5)

/** A cork float on a net's head rope: the birch's bark, which is what it is cut from in the north. */
const CORK = new THREE.Color(PALETTE.bark).multiplyScalar(0.9)

/** Split fish, salted and drying: the fleece's cream, toward the sand. */
const FISH = new THREE.Color(PALETTE.fleece).lerp(new THREE.Color(PALETTE.sand), 0.35)

/** Module-scope scratch. */
const scratch = new THREE.Color()

/** A geometry all of one colour. */
function dyed (geometry: THREE.BufferGeometry, colour: THREE.Color): THREE.BufferGeometry {
  return paint(geometry, () => colour)
}

/** The turn about the upright that lays something's own x along a direction on the ground. */
function heading ([ dx, dz ]: readonly [number, number]): number {
  return Math.atan2(-dz, dx)
}

/** A place on the pier as a point, `up` over the water's level. */
function on (pier: Pier, along: number, across: number, up: number): THREE.Vector3 {
  const { x, z } = pier.place(along, across)

  return new THREE.Vector3(x, up, z)
}

/**
 * The dark behind the pier's stones, so no light shows between them: one
 * block from under the water to under the deck.
 */
function core (pier: Pier, level: number): THREE.BufferGeometry {
  const { jetty } = pier
  const top       = jetty.deck - 0.2
  const foot      = level - (WALL.under + 0.5) * COURSE
  const middle    = pier.place(jetty.length / 2, 0)
  const block     = new THREE.BoxGeometry(jetty.length - INSET * 2, top - foot, (jetty.half - INSET) * 2)

  return dyed(block.rotateY(heading(pier.seaward)).translate(middle.x, (top + foot) / 2, middle.z), DARK)
}

/** The mooring posts, each a stout baulk let into the deck, tarred where a rope chafes it. */
function posts (pier: Pier): THREE.BufferGeometry[] {
  return POSTS.map(({ along, across }) => {
    const foot = on(pier, along, across, pier.jetty.deck - 0.3)
    const post = new THREE.BoxGeometry(POST.half * 2, POST.tall + 0.3, POST.half * 2).rotateY(heading(pier.seaward) + 0.2)

    post.translate(foot.x, foot.y + (POST.tall + 0.3) / 2, foot.z)

    return paint(post, at => at.y > pier.jetty.deck + POST.tall * 0.45 ? TIMBER : TARRED)
  })
}

/** The ladder down the lee face: two rails standing a little off the stones at the foot, and their rungs. */
function ladder (pier: Pier, level: number): THREE.BufferGeometry[] {
  const { jetty } = pier
  const parts     = [] as THREE.BufferGeometry[]
  const head      = (hand: number): THREE.Vector3 => on(pier, LADDER.along + hand * LADDER.wide / 2, jetty.half + 0.14, jetty.deck + 0.55)
  const foot      = (hand: number): THREE.Vector3 => on(pier, LADDER.along + hand * LADDER.wide / 2, jetty.half + 0.4, level - LADDER.under)

  for (const hand of [ -1, 1 ])
    parts.push(dyed(board(foot(hand), head(hand), 0.07, 0.07), TIMBER))

  const long = foot(0).distanceTo(head(0))

  for (let up = 0.3; up < long - 0.5; up += LADDER.rung)
    parts.push(dyed(board(foot(-1).lerp(head(-1), up / long), foot(1).lerp(head(1), up / long), 0.045, 0.045), TIMBER))

  return parts
}

/**
 * A creel, about the middle of its base: a slatted bottom, a tunnel of net
 * over three hoops, turned by `turn` and set down at `at`.
 */
function creel (at: THREE.Vector3, turn: number): THREE.BufferGeometry[] {
  const { long, wide, high } = CREEL
  const radius               = wide / 2
  const base                 = dyed(new THREE.BoxGeometry(long + 0.05, 0.045, wide + 0.05).translate(0, 0.022, 0), TIMBER)

  // Half a drum on its side: the round of it up, its ends closed with net.
  const tunnel = new THREE.CylinderGeometry(radius, radius, long, 6, 1, false, 0, Math.PI).rotateZ(Math.PI / 2)
    .scale(1, high / radius, 1)

  const hoops = [ -1, 0, 1 ].map(hoop => dyed(new THREE.CylinderGeometry(radius + 0.025, radius + 0.025, 0.06, 6, 1, true, 0, Math.PI).rotateZ(Math.PI / 2)
    .scale(1, high / radius, 1)
    .translate(hoop * (long / 2 - 0.03), 0.02, 0), TIMBER))

  const parts = [ base, paint(tunnel.translate(0, 0.04, 0), (_place, facing) => scratch.copy(BARKED).multiplyScalar(Math.abs(facing.x) > 0.9 ? 0.7 : 1)), ...hoops ]

  for (const part of parts)
    part.rotateY(turn).translate(at.x, at.y, at.z)

  return parts
}

/** A barrel on its end: staves bound with two tarred hoops, and its head let in a little. */
function barrel (at: THREE.Vector3): THREE.BufferGeometry {
  const { radius, tall } = BARREL
  const profile          = [[ 0.001, 0.02 ], [ radius * 0.82, 0 ], [ radius * 0.95, tall * 0.16 ], [ radius, tall * 0.5 ], [ radius * 0.95, tall * 0.84 ], [ radius * 0.82, tall ], [ radius * 0.74, tall - 0.05 ], [ 0.001, tall - 0.05 ]] as const
  const turned           = new THREE.LatheGeometry(profile.map(([ out, up ]) => new THREE.Vector2(out, up)), 8)

  return paint(turned.translate(at.x, at.y, at.z), place => {
    const up = (place.y - at.y) / tall

    return Math.abs(up - 0.16) < 0.02 || Math.abs(up - 0.84) < 0.02 ? TARRED : TIMBER
  })
}

/** A fish box: four boards and a bottom, and the catch lying in it. */
function fishBox (at: THREE.Vector3, turn: number): THREE.BufferGeometry[] {
  const { long, wide, high } = BOX
  const parts                = [
    dyed(new THREE.BoxGeometry(long, 0.04, wide).translate(0, 0.02, 0), TIMBER),
    dyed(new THREE.BoxGeometry(long - 0.08, 0.04, wide - 0.08).translate(0, high * 0.62, 0), FISH),
    ...[ -1, 1 ].map(hand => dyed(new THREE.BoxGeometry(long, high, 0.04).translate(0, high / 2, hand * (wide / 2 - 0.02)), TIMBER)),
    ...[ -1, 1 ].map(hand => dyed(new THREE.BoxGeometry(0.04, high, wide).translate(hand * (long / 2 - 0.02), high / 2, 0), TIMBER)),
  ]

  for (const part of parts)
    part.rotateY(turn).translate(at.x, at.y, at.z)

  return parts
}

/** A rope coiled down on the deck: two turns of it, one on the other. */
function coil (at: THREE.Vector3): THREE.BufferGeometry[] {
  return [[ COIL.radius, 0.06 ], [ COIL.radius * 0.8, 0.16 ]].map(([ radius, up ]) => dyed(new THREE.TorusGeometry(radius, 0.06, 4, 9).rotateX(Math.PI / 2)
    .translate(at.x, at.y + up!, at.z), ROPE))
}

/**
 * The net poles and the rope between their heads, with a stay from each end
 * pole down to the beach, and the nets' cork floats along the rope.
 */
function poles (pier: Pier, ground: Ground): THREE.BufferGeometry[] {
  const parts = [] as THREE.BufferGeometry[]

  for (const pole of pier.poles)
    parts.push(dyed(board(new THREE.Vector3(pole.x, pole.foot - POLE.sunk, pole.z), new THREE.Vector3(pole.x, pole.top, pole.z), POLE.half * 2, POLE.half * 2), TIMBER))

  // The rope sags between two poles: four straight lengths of it a span.
  for (let span = 0; span < pier.poles.length - 1; span += 1)
    for (let part = 0; part < 4; part += 1)
      parts.push(dyed(board(headRope(pier, span, part / 4, new THREE.Vector3()), headRope(pier, span, (part + 1) / 4, new THREE.Vector3()), 0.045, 0.045), ROPE))

  // The nets' floats, strung along it.
  for (let span = 0; span < pier.poles.length - 1; span += 1)
    for (let float = 0; float < NET.floats; float += 1) {
      const at = headRope(pier, span, (float + 0.5) / NET.floats, new THREE.Vector3())

      parts.push(dyed(new THREE.BoxGeometry(0.13, 0.2, 0.13).rotateY(heading(pier.lee) + float)
        .translate(at.x, at.y - 0.08, at.z), CORK))
    }

  for (const [ end, toward ] of [[ 0, -1 ], [ pier.poles.length - 1, 1 ]] as const) {
    const pole = pier.poles[end]!
    const x    = pole.x + pier.lee[0] * toward * 1.5
    const z    = pole.z + pier.lee[1] * toward * 1.5

    parts.push(dyed(board(new THREE.Vector3(pole.x, pole.top - POLE.rope, pole.z), new THREE.Vector3(x, ground.heightAt(x, z), z), 0.04, 0.04), ROPE))
  }

  return parts
}

/** One split fish hung by the tail from `tail`, its flat toward `face`: a kite, drawn from both sides. */
function fish (tail: THREE.Vector3, face: THREE.Vector3, long: number, broad: number): THREE.BufferGeometry {
  const across   = new THREE.Vector3(-face.z, 0, face.x).multiplyScalar(broad)
  const shoulder = tail.clone().add(new THREE.Vector3(0, -long * 0.62, 0))
  const nose     = tail.clone().add(new THREE.Vector3(0, -long, 0))
  const left     = shoulder.clone().sub(across)
  const right    = shoulder.clone().add(across)
  const corners  = [ tail, left, right, left, nose, right, tail, right, left, left, right, nose ]
  const kite     = new THREE.BufferGeometry()

  kite.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap(corner => corner.toArray()), 3))
  kite.computeVertexNormals()

  return dyed(kite, FISH)
}

/**
 * The rack: a trestle at each end, a rail in their crotch and one lower on
 * each side, and the split fish hung along all three to dry in the wind.
 */
function rack (pier: Pier, ground: Ground, lay: SeededRng, spare: boolean): THREE.BufferGeometry[] {
  const { x, z, run, half, tall } = pier.rack
  const parts                     = [] as THREE.BufferGeometry[]
  const out                       = new THREE.Vector3(-run[1], 0, run[0])
  const foot                      = ground.heightAt(x, z)
  const rails                     = [] as [THREE.Vector3, THREE.Vector3][]

  /** A place on the rack: `along` its rails, `aside` out from under them, `up` over the ground at its middle. */
  const at = (along: number, aside: number, up: number): THREE.Vector3 => new THREE.Vector3(x + run[0] * along + out.x * aside, foot + up, z + run[1] * along + out.z * aside)

  for (const end of [ -1, 1 ])
    for (const hand of [ -1, 1 ]) {
      const stood = at(end * half, hand * RACK.splay, 0)

      stood.y = ground.heightAt(stood.x, stood.z) - 0.2
      parts.push(dyed(board(stood, at(end * half, -hand * 0.07, tall + 0.2), 0.08, 0.08), TIMBER))
    }

  for (const [ aside, up ] of [[ 0, RACK.rails[0] ], [ -1, RACK.rails[1] ], [ 1, RACK.rails[1] ]] as const)
    rails.push([ at(-half - 0.25, aside * RACK.splay * (1 - up) * 1.08, tall * up), at(half + 0.25, aside * RACK.splay * (1 - up) * 1.08, tall * up) ])

  for (const [ from, to ] of rails) {
    parts.push(dyed(board(from, to, 0.06, 0.06), TIMBER))

    const room = from.distanceTo(to) - 0.7

    for (let hung = 0; hung * RACK.gap < room; hung += 1) {
      const tail = from.clone().lerp(to, (0.35 + hung * RACK.gap + lay.range(-0.05, 0.05)) / from.distanceTo(to))
      const turn = lay.range(-0.35, 0.35)
      const face = new THREE.Vector3(out.x * Math.cos(turn) - out.z * Math.sin(turn), 0, out.x * Math.sin(turn) + out.z * Math.cos(turn))

      tail.y -= 0.03

      // Its draws are taken either way, so a phone's fish hang where a desktop's do.
      if (!spare || hung % 2 === 0)
        parts.push(fish(tail, face, RACK.fish[0] * lay.range(0.8, 1.1), RACK.fish[1] * lay.range(0.85, 1.15)))
    }
  }

  return parts
}

/**
 * Everything of the fishing that is wood, net or rope and does not move, as
 * one geometry in the world's frame, coloured a vertex: the dark inside the
 * pier, its mooring posts and its ladder, the creels on its head, a barrel,
 * a fish box and a coiled rope on its deck; the net poles along the beach
 * with a few creels at their foot; and the rack with its fish.
 *
 * `spare` is a phone's: the creels on the beach, the box and the coil are
 * left off, and every other fish.
 */
export function createGear (pier: Pier, ground: Ground, tower: Tower, lay: SeededRng, spare: boolean): THREE.BufferGeometry {
  const { jetty } = pier
  const level     = ground.waterLevel
  const first     = pier.poles[0]!
  const stacked   = (up: number): number => up * (CREEL.high + 0.05)

  const parts = [
    core(pier, level),
    ...posts(pier),
    ...ladder(pier, level),
    ...CREELS.flatMap(({ along, across, up, turn }) => creel(on(pier, along, across, jetty.deck + 0.03 + stacked(up)), heading(pier.seaward) + turn)),
    barrel(on(pier, BARREL.along, BARREL.across, jetty.deck + 0.02)),
    ...poles(pier, ground),
    ...rack(pier, ground, lay, spare),
    ...createTowerGear(tower),
  ]

  if (!spare) {
    parts.push(...fishBox(on(pier, BOX.along, BOX.across, jetty.deck + 0.03), heading(pier.seaward) + 0.12))
    parts.push(...coil(on(pier, COIL.along, COIL.across, jetty.deck)))

    for (const { past, down, turn, up } of BEACHED) {
      const x = first.x + pier.lee[0] * past + pier.seaward[0] * down
      const z = first.z + pier.lee[1] * past + pier.seaward[1] * down

      parts.push(...creel(new THREE.Vector3(x, ground.heightAt(x, z) + stacked(up), z), heading(pier.lee) + turn))
    }
  }

  return join(parts)
}

// perf: cheap — some 2k triangles (1.5k on a phone), built once and drawn in
// one call. Nothing per frame.
