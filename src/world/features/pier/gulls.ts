// src/world/features/pier/gulls.ts
import * as THREE from 'three'

import { elevationAt } from '../../shared/daylight.ts'
import type { Glide, Gull, Gulls, Perch } from '../../shared/gulls.ts'
import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Pier } from '../../shared/pier.ts'
import { POST, POSTS } from './plan.ts'

/** The lumps a gull is drawn in: its body, its head, and a wing each side. */
const LUMPS = 4

/**
 * A gull's measures, for a bird of size 1. Its body and its head, each as
 * half its width, half its height and half its length; and a wing: its
 * length from root to tip, half its width fore and aft, half its thickness,
 * and how far out from the middle its root is.
 */
const BODY = [ 0.17, 0.15, 0.46 ] as const
const HEAD = [ 0.1, 0.1, 0.18 ] as const
const WING = { span: 1.2, chord: 0.2, thick: 0.03, root: 0.08 } as const

/** Where along a lump its widest part is, from -1 at its blunt end to 1 at its point: a breast, or a wing's root. */
const WAIST = -0.45

/** How far a spread wing is held up from level, in radians, and how far a slow beat lifts and drops it. */
const DIHEDRAL = 0.16
const BEAT     = 0.13

/** The gull's two colours: the sea's one cold white, and for its wings and back that white gone toward the rock's grey. */
const WHITE  = new THREE.Color(PALETTE.foam)
const MANTLE = new THREE.Color(PALETTE.foam).lerp(new THREE.Color(PALETTE.rock), 0.4)

/** The way a bird looks, in its own frame: a wing is lifted by turning it about this. */
const AHEAD = new THREE.Vector3(1, 0, 0)

/** The turns that lay a lump's point toward the bird's tail, and toward its bill. */
const AFT  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
const FORE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)

/** Module-scope scratch, so a step allocates nothing. */
const glide: Glide = { x: 0, y: 0, z: 0, yaw: 0, bank: 0, pitch: 0, spread: 0 }
const bird         = new THREE.Matrix4()
const part         = new THREE.Matrix4()
const turn         = new THREE.Euler(0, 0, 0, 'YXZ')
const spin         = new THREE.Quaternion()
const place        = new THREE.Vector3()
const size         = new THREE.Vector3()

/** The gulls as they are drawn, and the one thing they do. */
export interface Flight {
  mesh: THREE.InstancedMesh

  /** Fly, or stand, as they do at `time` seconds. */
  fly (time: number): void
}

/**
 * Where a gull can stand, best first: the post on the pier's head, then
 * turn about the net poles and the other posts, so the two that never fly
 * are on the pier and on the nets.
 */
export function findPerches (pier: Pier): Perch[] {
  const posts = POSTS.map(({ along, across }): Perch => {
    const { x, z } = pier.place(along, across)

    return [ x, pier.jetty.deck + POST.tall, z ]
  })
  const poles = pier.poles.map(({ x, z, top }): Perch => [ x, top, z ])

  return [ posts.at(-1)!, poles[1]!, poles.at(-1)!, posts[0]!, poles[0]!, posts[1]!, ...poles.slice(2, -1) ]
}

/**
 * The one shape every lump of a gull is: a spindle along z, blunt at one end
 * and drawn out to a point at the other, widest near the blunt end. Stretched
 * one way it is a body with its breast forward, another a wing tapering to
 * its tip. Eight triangles.
 */
function createLumpGeometry (): THREE.BufferGeometry {
  const ends     = [[ 0, 0, 1 ], [ 0, 0, -1 ]] as const
  const waist    = [[ 1, 0, WAIST ], [ 0, 1, WAIST ], [ -1, 0, WAIST ], [ 0, -1, WAIST ]] as const
  const corners  = [] as number[]
  const geometry = new THREE.BufferGeometry()

  for (let side = 0; side < 4; side += 1) {
    const from = waist[side]!
    const to   = waist[(side + 1) % 4]!

    corners.push(...from, ...to, ...ends[0], ...to, ...from, ...ends[1])
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  geometry.computeVertexNormals()

  return geometry
}

/** One lump of a gull, placed and turned in the bird's own frame (x ahead, y up, z to its right) and carried to where the bird is. */
function lump (mesh: THREE.InstancedMesh, index: number, at: readonly [number, number, number], turned: THREE.Quaternion, scale: readonly [number, number, number]): void {
  part.compose(place.set(...at), turned, size.set(...scale))
  mesh.setMatrixAt(index, part.premultiply(bird))
}

/** Put one gull where it is: body, head, and the two wings, spread or folded. */
function poseGull (mesh: THREE.InstancedMesh, index: number, gull: Gull, held: Glide, time: number): void {
  const { spread } = held
  const beat       = DIHEDRAL + BEAT * Math.sin(time * 2.6 + gull.phase * 3)

  bird.compose(place.set(held.x, held.y, held.z), spin.setFromEuler(turn.set(held.bank, held.yaw, held.pitch)), size.setScalar(gull.size))

  lump(mesh, index * LUMPS, [ 0, 0, 0 ], AFT, BODY)
  lump(mesh, index * LUMPS + 1, [ BODY[2] * 0.8, 0.12, 0 ], FORE, HEAD)

  // A wing spread is long and thin, its root at the shoulder, held a little
  // up and beating slowly; folded, it is a short flat lump along the back.
  const half = WING.span / 2 * spread + 0.2 * (1 - spread)
  const up   = beat * spread

  for (const hand of [ -1, 1 ]) {
    // Spread, it points out to its own side and a little up; it folds by swinging back to point aft.
    spin.setFromAxisAngle(AHEAD, hand > 0 ? -up : Math.PI + up).slerp(AFT, 1 - spread)

    const out = (WING.root + half * Math.cos(up)) * spread + 0.07 * (1 - spread)

    lump(mesh, index * LUMPS + 2 + (hand + 1) / 2, [ -0.14 * (1 - spread), 0.06 + half * Math.sin(up) * spread, hand * out ], spin, [ WING.chord * spread + 0.06 * (1 - spread), WING.thick + 0.05 * (1 - spread), half ])
  }
}

/**
 * The gulls (`shared/gulls.ts`): one instanced mesh, four faceted lumps to
 * a bird, never a model of a gull. White, with a grey back and wings: the
 * foam's white is the only white there is, and they are the sea's.
 *
 * `material` is lit like the sheep and the starlings, and so is their program.
 */
export function createFlight (gulls: Gulls, material: THREE.Material): Flight {
  const mesh = new THREE.InstancedMesh(createLumpGeometry(), material, gulls.birds.length * LUMPS)

  mesh.name          = 'pier-gulls'
  mesh.castShadow    = false
  mesh.receiveShadow = true
  mesh.frustumCulled = false

  gulls.birds.forEach((_, index) => {
    mesh.setColorAt(index * LUMPS, WHITE)
    mesh.setColorAt(index * LUMPS + 1, WHITE)
    mesh.setColorAt(index * LUMPS + 2, MANTLE)
    mesh.setColorAt(index * LUMPS + 3, MANTLE)
  })

  const flight: Flight = {
    mesh,

    fly (time) {
      const elevation = elevationAt(time)

      gulls.birds.forEach((gull, index) => {
        poseGull(mesh, index, gull, gulls.at(gull, time, elevation, glide), time)
      })

      mesh.instanceMatrix.needsUpdate = true
    },
  }

  flight.fly(0)
  commitInstances(mesh)

  return flight
}

// perf: trivial — one draw call (two with the sea's mirror), 32 triangles a
// bird. A step is the sun's height once, and for each bird a dozen sines and
// four matrices.
