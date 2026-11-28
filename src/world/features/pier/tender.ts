// src/world/features/pier/tender.ts
import * as THREE from 'three'

import type { Pier } from '../../shared/pier.ts'
import { swellAt } from '../../shared/swell.ts'
import type { Swell } from '../../shared/swell.ts'
import type { Tide } from '../../shared/tide.ts'
import type { Wind } from '../../shared/wind.ts'
import { ROPE, STEMHEAD, createHullGeometry } from '../boat/hull.ts'
import { POST, POSTS, TENDER_SIZE } from './plan.ts'

/** How much of the swell so small a boat takes: nearly all of it. */
const RIDE = 0.9

/** How far it ranges on its ropes, fore and aft, and how far it turns between them, in radians. */
const RANGE = 0.07
const YAW   = 0.035

/** Half a rope's thickness, and how far up a post it is made fast, as a part of the post's height. */
const ROPE_HALF = 0.017
const HITCH     = 0.7

/** A rope is a square prism: eight corners, and its four sides as triangles of them. */
const SIDES = [ 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7 ] as const

/** Module-scope scratch, so a step allocates nothing. */
const sea: Swell = { height: 0, slopeX: 0, slopeZ: 0 }
const from       = new THREE.Vector3()
const along      = new THREE.Vector3()
const aside      = new THREE.Vector3()
const over       = new THREE.Vector3()
const up         = new THREE.Vector3(0, 1, 0)

/** The small boat, and the one thing it does. */
export interface Tender {
  mesh: THREE.Mesh

  /** The two ropes it lies to, post to stem and post to stern: drawn in the world's frame, since one end of each stays on the pier. */
  ropes: THREE.Mesh

  /** Lie as the sea has it at `time` seconds. */
  ride (time: number): void
  dispose (): void
}

/** Write a rope's eight corners into `positions` from `at`: a square prism from `a` to `b`. */
function stretch (positions: Float32Array, at: number, a: THREE.Vector3, b: THREE.Vector3): void {
  along.subVectors(b, a)
  aside.crossVectors(along, up).setLength(ROPE_HALF)
  over.crossVectors(aside, along).setLength(ROPE_HALF)

  for (let corner = 0; corner < 8; corner += 1) {
    const end  = corner < 4 ? a : b
    const turn = corner % 4
    const s    = turn === 0 || turn === 3 ? -1 : 1
    const o    = turn < 2 ? -1 : 1

    positions[at + corner * 3]     = end.x + aside.x * s + over.x * o
    positions[at + corner * 3 + 1] = end.y + aside.y * s + over.y * o
    positions[at + corner * 3 + 2] = end.z + aside.z * s + over.z * o
  }
}

/**
 * The small boat in the pier's lee: the boat at anchor's own build at six
 * tenths the size, no mast, its oars shipped, made fast to a post ahead and
 * a post astern. What goes between the boat and the shore.
 *
 * It rides the same swell (`swell.ts`) and ranges a hand's breadth on its
 * ropes, and it goes down with the tide and comes up with it: at low water
 * it lies a long way under the deck, and its ropes, which stay on their
 * posts, are drawn again each step from where the posts are to where its
 * ends have gone.
 */
export function createTender (pier: Pier, wind: Wind, tide: Tide, material: THREE.Material): Tender {
  const { tender, seaward, jetty } = pier
  const yaw                        = Math.atan2(-seaward[1], seaward[0])
  const ahead                      = (x: number, z: number): number => (x - tender.x) * seaward[0] + (z - tender.z) * seaward[1]

  // The two posts on its side of the pier, and which end of the boat each holds.
  const made = POSTS.filter(post => post.across > 0).map(post => {
    const { x, z } = pier.place(post.along, post.across)

    return { post: new THREE.Vector3(x, jetty.deck + POST.tall * HITCH, z), end: Math.sign(ahead(x, z)) }
  })

  const geometry = createHullGeometry({ mast: false, sail: 'none', ropes: []})
  const mesh     = new THREE.Mesh(geometry, material)

  mesh.name          = 'pier-tender'
  mesh.castShadow    = true
  mesh.receiveShadow = true
  mesh.scale.setScalar(TENDER_SIZE)

  // Turned to its heading first, then heeled and trimmed about its own axes.
  mesh.rotation.order = 'YXZ'

  const positions = new Float32Array(made.length * 8 * 3)
  const colours   = new Float32Array(positions.length)
  const cord      = new THREE.BufferGeometry()

  for (let index = 0; index < colours.length; index += 3)
    ROPE.toArray(colours, index)

  // Made as the boat's own geometry is (a place, a normal, a colour a
  // vertex), so the two are drawn with one program. Its facets are flat:
  // the normals are never read.
  cord.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  cord.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions.length).fill(1), 3))
  cord.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  cord.setIndex(made.flatMap((_, rope) => SIDES.map(corner => corner + rope * 8)))

  // They never leave the pier's side: one sphere holds them at every state of the tide.
  cord.boundingSphere = new THREE.Sphere(new THREE.Vector3(tender.x, tide.high, tender.z), jetty.length)

  const ropes = new THREE.Mesh(cord, material)

  ropes.name          = 'pier-tender-ropes'
  ropes.receiveShadow = true

  return {
    mesh,
    ropes,

    ride (time) {
      const range = RANGE * Math.sin(time * 0.47 + 0.9)
      const turn  = yaw + YAW * Math.sin(time * 0.29 + 2.3)
      const x     = tender.x + seaward[0] * range
      const z     = tender.z + seaward[1] * range

      swellAt(wind.direction, x, z, time, sea)

      const pitch = sea.slopeX * Math.cos(turn) - sea.slopeZ * Math.sin(turn)
      const heel  = sea.slopeX * Math.sin(turn) + sea.slopeZ * Math.cos(turn)

      mesh.position.set(x, tide.at(time) + sea.height * RIDE + 0.012 * Math.sin(time * 1.63 + 0.4), z)
      mesh.rotation.set(-Math.atan(heel * RIDE) + 0.045 * Math.sin(time * 0.81 + 1), turn, Math.atan(pitch * RIDE) + 0.01 * Math.sin(time * 2.1))
      mesh.updateMatrix()

      made.forEach(({ post, end }, rope) => {
        stretch(positions, rope * 24, from.set(end * STEMHEAD.along, STEMHEAD.up, 0).applyMatrix4(mesh.matrix), post)
      })

      cord.getAttribute('position').needsUpdate = true
    },

    dispose () {
      geometry.dispose()
      cord.dispose()
      mesh.removeFromParent()
      ropes.removeFromParent()
    },
  }
}

// perf: trivial — two draw calls (the boat is three with its shadow and the
// mirror; its ropes, sixteen triangles, are in neither) of some 440
// triangles. A step is a dozen sines, one question to the swell, and
// sixteen corners written for the ropes.
