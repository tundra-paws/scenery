// src/world/features/wood/timber.ts
import * as THREE from 'three'
import type { Noise3D } from 'threejs-scenes/primitives'

/** How far noise pushes a lump of leaves in and out, as a part of its radius. */
const RAGGED = 0.3

/**
 * How far a leaf's face is turned up toward the sky before it is lit. A crown
 * is not a boulder: light comes through it, and its underside is never as
 * dark as a stone's. The same reason a tuft of grass is lit like the ground.
 */
const SKYWARD = 0.85

/** Module-scope scratch. */
const UP    = new THREE.Vector3(0, 1, 0)
const EAST  = new THREE.Vector3(1, 0, 0)
const along = new THREE.Vector3()
const u     = new THREE.Vector3()
const v     = new THREE.Vector3()
const a     = new THREE.Vector3()
const b     = new THREE.Vector3()
const c     = new THREE.Vector3()
const d     = new THREE.Vector3()

/** A cross-section of a limb: where its middle is and how thick it is there. */
export interface Ring {
  at:     THREE.Vector3
  radius: number
}

/** What a tree gives to the wind: where it is rooted, and how tall it stands over that. */
export interface Rooted {
  x:      number
  z:      number
  foot:   number
  height: number
}

/** A lump of leaves: where, how big, how far it streams along `lee`, and which of the noise it is cut from. */
export interface Lump {
  at:      THREE.Vector3
  radius:  number
  lee:     THREE.Vector3
  stretch: number
  squash:  number
  cut:     number
}

/**
 * Everything of the wood, written triangle by triangle into one geometry.
 *
 * Flat-shaded and coloured per vertex, in world space. Beside its place and
 * its colour every vertex carries `sway`: the foot of the tree it belongs to
 * (which gust it reads), how far it goes with a gust (the square of its
 * height up the tree, so a foot stays planted and a top travels), and, for a
 * leaf, the phase it flutters in. Wood that is cut and stacked carries none.
 */
export interface Timber {

  /** Whatever is written next belongs to this tree and sways with it. `null` for what lies still. */
  root (tree: Rooted | null): void

  /** A tapered tube through the rings, `sides` round. A ring of no radius closes it to a point. */
  limb (rings: readonly Ring[], sides: number, colourOf: (ring: number, side: number) => THREE.Color): void

  /** A flat end: a fan of `sides` triangles facing along `axis`. */
  disc (at: THREE.Vector3, axis: THREE.Vector3, radius: number, sides: number, colour: THREE.Color): void

  /** A lump of leaves cut from the ball `ball` (unit positions, three a vertex, nine a triangle). */
  lump (ball: ArrayLike<number>, lump: Lump, colour: THREE.Color, flutter: number): void

  /** Triangles written so far. */
  readonly triangles: number

  /** The finished geometry: `position`, `color` and `sway`. */
  build (): THREE.BufferGeometry
}

/** Two unit vectors square to `axis` and to each other, into `u` and `v`. */
function frame (axis: THREE.Vector3): void {
  u.crossVectors(axis, Math.abs(axis.y) > 0.9 ? EAST : UP).normalize()
  v.crossVectors(axis, u).normalize()
}

/** The point of a ring at `turn` round it, into `out`. Uses the frame in `u` and `v`. */
function rim (ring: Ring, turn: number, out: THREE.Vector3): THREE.Vector3 {
  return out.copy(ring.at)
    .addScaledVector(u, Math.cos(turn) * ring.radius)
    .addScaledVector(v, Math.sin(turn) * ring.radius)
}

export function createTimber (noise: Noise3D): Timber {
  const position: number[] = []
  const colour: number[]   = []
  const sway: number[]     = []

  let rooted: Rooted | null = null

  /** One corner of a triangle. */
  function vertex (at: THREE.Vector3, tint: THREE.Color, flutter: number): void {
    position.push(at.x, at.y, at.z)
    colour.push(tint.r, tint.g, tint.b)

    if (rooted) {
      const up = Math.max(0, (at.y - rooted.foot) / rooted.height)

      sway.push(rooted.x, rooted.z, up * up * rooted.height, flutter)
    }
    else
      sway.push(0, 0, 0, 0)
  }

  function triangle (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3, tint: THREE.Color, flutter = 0): void {
    vertex(p, tint, flutter)
    vertex(q, tint, flutter)
    vertex(r, tint, flutter)
  }

  return {
    get triangles () {
      return position.length / 9
    },

    root (tree) {
      rooted = tree
    },

    limb (rings, sides, colourOf) {
      // One frame for the whole limb, from its foot to its tip, so its sides
      // run straight up it and do not twist.
      frame(along.subVectors(rings.at(-1)!.at, rings[0]!.at).normalize())

      for (let ring = 1; ring < rings.length; ring += 1) {
        const lower = rings[ring - 1]!
        const upper = rings[ring]!

        for (let side = 0; side < sides; side += 1) {
          const from = side / sides * Math.PI * 2
          const to   = (side + 1) / sides * Math.PI * 2
          const tint = colourOf(ring - 1, side)

          triangle(rim(lower, from, a), rim(lower, to, b), rim(upper, from, c), tint)

          if (upper.radius > 0)
            triangle(rim(lower, to, b), rim(upper, to, d), rim(upper, from, c), tint)
        }
      }
    },

    disc (at, axis, radius, sides, tint) {
      const ring = { at, radius }

      frame(axis)

      for (let side = 0; side < sides; side += 1)
        triangle(at, rim(ring, side / sides * Math.PI * 2, a), rim(ring, (side + 1) / sides * Math.PI * 2, b), tint)
    },

    lump (ball, { at, radius, lee, stretch, squash, cut }, tint, flutter) {
      for (let corner = 0; corner < ball.length; corner += 3) {
        const x = ball[corner]!
        const y = ball[corner + 1]!
        const z = ball[corner + 2]!

        // Keyed on where the corner is on the ball, so the corners that
        // neighbouring faces share move together and the lump stays closed.
        const size = radius * (1 + noise.sample(x * 1.4 + cut, y * 1.4, z * 1.4 - cut) * RAGGED)

        a.set(x, y * squash, z).multiplyScalar(size)
          .addScaledVector(lee, (x * lee.x + z * lee.z) * size * stretch)
          .add(at)
        vertex(a, tint, flutter)
      }
    },

    build () {
      const geometry = new THREE.BufferGeometry()

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3))
      geometry.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 4))

      // No corner is shared, so these are the faces' own normals: the wood is
      // faceted without asking the material to shade it flat, which leaves
      // the leaves' normals free to be turned.
      geometry.computeVertexNormals()

      const normal = geometry.getAttribute('normal')

      for (let index = 0; index < normal.count; index += 1)
        if (sway[index * 4 + 3]! > 0) {
          a.fromBufferAttribute(normal, index).addScaledVector(UP, SKYWARD)
            .normalize()
          normal.setXYZ(index, a.x, a.y, a.z)
        }

      geometry.computeBoundingBox()
      geometry.computeBoundingSphere()

      return geometry
    },
  }
}

// perf: cheap — plain arrays filled once at build, nine numbers a corner, and
// copied into three attributes. Nothing here runs after that.
