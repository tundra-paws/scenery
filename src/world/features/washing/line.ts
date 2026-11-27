// src/world/features/washing/line.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import { PALETTE } from '../../shared/palette.ts'
import { HEIGHT, SPAN } from '../../shared/washing.ts'
import type { World } from '../../world.ts'

/** How much of the light on the far side of the cloth comes through it: the sail's share, so both are one program. */
const THROUGH = 0.85

/** The flock's own wool, as it is woven: white, brown, and the dark of a black fleece. */
const FLEECE = new THREE.Color(PALETTE.fleece)
const MOORIT = new THREE.Color(PALETTE.moorit)
const BLACK  = new THREE.Color(PALETTE.face).lerp(FLEECE, 0.16)

/** Linen, which was never white: the wool's cream greyed with the stone's colour. */
const LINEN = new THREE.Color(PALETTE.fleece).lerp(new THREE.Color(PALETTE.rock), 0.22)

/** The line and the poles it is stretched between. */
const ROPE = new THREE.Color(PALETTE.timber).lerp(new THREE.Color(PALETTE.sand), 0.5)
const POLE = new THREE.Color(PALETTE.timber).multiplyScalar(0.85)

/**
 * What hangs on the line, from the pole up the island to the one by the
 * field: where each piece starts along it, the places across it and down it
 * that it is drawn through, and the colour of each band between two of the
 * latter. `body` is the columns that hang the whole way down, where a piece
 * is wider at the line than below it: a shirt pegged by its sleeves.
 */
const PIECES: readonly Piece[] = [
  { at: 0.5, across: [ 0, 0.5, 1, 1.5 ], down: [ 0, 0.48, 0.86, 0.97, 1.1, 1.2, 1.32 ], bands: [ FLEECE, FLEECE, MOORIT, FLEECE, MOORIT, FLEECE ]},
  { at: 2.22, across: [ 0, 0.3, 0.78, 1.08 ], down: [ 0, 0.27, 0.62, 0.98 ], bands: [ LINEN, LINEN, LINEN ], body: [ 1, 2 ]},
  { at: 3.52, across: [ 0, 0.42, 0.84, 1.26 ], down: [ 0, 0.46, 0.84, 0.96, 1.16 ], bands: [ MOORIT, MOORIT, FLEECE, MOORIT ]},
  { at: 4.94, across: [ 0, 0.13 ], down: [ 0, 0.3, 0.58 ], bands: [ BLACK, BLACK ]},
  { at: 5.14, across: [ 0, 0.13 ], down: [ 0, 0.3, 0.55 ], bands: [ BLACK, BLACK ]},
]

/** How far a piece's hem is carried downwind, for each unit it hangs: in a lull, and what a full gust adds. */
const LEAN = [ 0.04, 0.2 ] as const

/** How far a wave running along the line throws a hem out of its plane, the same way: what it keeps in a lull, and what a gust adds. */
const THROW = [ 0.05, 0.17 ] as const

/** The poles' thickness, how far into the ground they go, and the line's. */
const POST = { thick: 0.12, sunk: 0.4, over: 0.08 } as const
const CORD = { thick: 0.035, spans: 8 } as const

/** Scratch, so a step allocates nothing: how hard it blows on each piece. */
const gusts = new Float32Array(PIECES.length)

/** One thing on the line. */
interface Piece {
  at:     number
  across: readonly number[]
  down:   readonly number[]
  bands:  readonly THREE.Color[]
  body?:  readonly [number, number]
}

/** Triangles being gathered: where each vertex hangs at rest, its colour, and for the cloth which piece it is of, how far along the line it is and how far down. */
interface Sheet {
  rest:   number[]
  colour: number[]
  index:  number[]
  piece:  number[]
  along:  number[]
  drop:   number[]
}

/** The washing, and the one thing it does. */
export interface Line {
  mesh: THREE.Mesh

  /** Hang as the wind has it at `time` seconds. */
  blow (time: number): void
  dispose (): void
}

/** How far a place on a piece moves: nothing at the line, and more than in proportion the further it hangs. */
export function give (drop: number): number {
  return drop ** 1.25
}

/** Add a four-cornered facet with its own vertices, so its colour is its own. Corners go round. */
function quad (sheet: Sheet, corners: readonly (readonly [number, number, number])[], colour: THREE.Color): number {
  const first = sheet.rest.length / 3

  for (const corner of corners) {
    sheet.rest.push(...corner)
    sheet.colour.push(colour.r, colour.g, colour.b)
  }

  sheet.index.push(first, first + 1, first + 2, first, first + 2, first + 3)

  return first
}

/** A square post, as four sides and a top. */
function post (sheet: Sheet, x: number, foot: number, top: number, z: number): void {
  const h = POST.thick / 2

  const ring = [[ -h, -h ], [ h, -h ], [ h, h ], [ -h, h ]] as const

  ring.forEach(([ ax, az ], side) => {
    const [ bx, bz ] = ring[(side + 1) % 4]!

    quad(sheet, [[ x + ax, foot, z + az ], [ x + bx, foot, z + bz ], [ x + bx, top, z + bz ], [ x + ax, top, z + az ]], POLE)
  })

  quad(sheet, ring.map(([ ax, az ]) => [ x + ax, top, z + az ] as const), POLE)
}

/**
 * The washing on its line: two blankets of the flock's wool, a linen shirt
 * pegged out by its sleeves and a pair of stockings, hung between two poles
 * on the green under the house.
 *
 * Whoever lives here did it this morning and has not taken it in. It is
 * cloth as the sail is, in the sail's material: the low sun comes through
 * it, and it reads the wind on the CPU (`wind.gustAt`) where it hangs, so a
 * gust that crosses the bay and shakes the sail lifts the blankets a moment
 * later. The pegged edge never moves; a hem moves most, carried downwind
 * and thrown out of its plane by a wave that never changes pace, only size.
 * One mesh in the world's own frame: the cloth, the cord and both poles.
 */
export function createLine (world: World): Line {
  const { washing, wind } = world
  const sheet: Sheet      = { rest: [], colour: [], index: [], piece: [], along: [], drop: []}
  const hung              = (along: number, drop: number): readonly [number, number, number] => {
    const { x, y, z } = washing.lineAt(along / SPAN)

    return [ x, y - drop, z ]
  }

  PIECES.forEach(({ at, across, down, bands, body }, piece) => {
    for (let column = 0; column < across.length - 1; column += 1)
      for (let row = 0; row < down.length - 1; row += 1) {
        if (row > 0 && body && (column < body[0] || column >= body[1]))
          continue

        const corners = [[ column, row ], [ column, row + 1 ], [ column + 1, row + 1 ], [ column + 1, row ]] as const

        quad(sheet, corners.map(([ c, r ]) => hung(at + across[c]!, down[r]!)), bands[row]!)

        for (const [ c, r ] of corners) {
          sheet.piece.push(piece)
          sheet.along.push(at + across[c]!)
          sheet.drop.push(down[r]!)
        }
      }
  })

  const cloth = sheet.rest.length / 3

  // The cord, a ribbon from head to head, and the poles it is made fast to.
  for (let span = 0; span < CORD.spans; span += 1) {
    const from = hung(span / CORD.spans * SPAN, 0)
    const to   = hung((span + 1) / CORD.spans * SPAN, 0)

    quad(sheet, [[ from[0], from[1] + CORD.thick, from[2] ], from, to, [ to[0], to[1] + CORD.thick, to[2] ]], ROPE)
  }

  for (const pole of washing.poles)
    post(sheet, pole.x, pole.foot - POST.sunk, pole.top + POST.over, pole.z)

  const rest     = Float32Array.from(sheet.rest)
  const position = new THREE.BufferAttribute(Float32Array.from(sheet.rest), 3)
  const geometry = new THREE.BufferGeometry()
  const [ a, b ] = washing.poles

  position.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position)
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(sheet.colour, 3))
  geometry.setIndex(sheet.index)

  // It moves every step, so the sphere three culls by is set once, round
  // everywhere it can reach.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3((a.x + b.x) / 2, (a.foot + b.foot) / 2 + HEIGHT / 2, (a.z + b.z) / 2), SPAN / 2 + 1.2)

  // The sail's material, made as the sail's is, and so its program.
  const material = createLitMaterial(world, { name: 'washing', vertexColors: true, side: THREE.DoubleSide })

  material.sheds()

  material.letThrough(THROUGH)

  const mesh = new THREE.Mesh(geometry, material)

  mesh.name = 'washing'

  // Out of its plane: across the line, on the ground.
  const outX = -washing.along[1]
  const outZ = washing.along[0]

  // Where the middle of each piece hangs, for the wind to be asked there.
  const middles = PIECES.map(({ at, across }) => washing.lineAt((at + across.at(-1)! / 2) / SPAN))

  return {
    mesh,

    blow (time) {
      for (let piece = 0; piece < middles.length; piece += 1)
        gusts[piece] = wind.gustAt(middles[piece]!.x, middles[piece]!.z, time)

      for (let at = 0; at < cloth; at += 1) {
        const piece = sheet.piece[at]!
        const along = sheet.along[at]!
        const gust  = gusts[piece]!
        const moved = give(sheet.drop[at]!)
        const lean  = moved * (LEAN[0] + LEAN[1] * gust)
        const wave  = Math.sin(along * 2.3 - time * 3.1 + piece * 1.9) + 0.5 * Math.sin(along * 4.1 - time * 4.7 + piece * 0.7)
        const out   = moved * (THROW[0] + THROW[1] * gust) * wave

        // Carried aside it swings up a little, as anything hung does.
        position.setXYZ(
          at,
          rest[at * 3]! + wind.direction[0] * lean + outX * out,
          rest[at * 3 + 1]! + (lean * lean + out * out) * 0.4,
          rest[at * 3 + 2]! + wind.direction[1] * lean + outZ * out,
        )
      }

      position.needsUpdate = true
    },

    dispose () {
      geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}

// perf: trivial — one draw call (two where it casts a shadow) of some 120
// triangles. A step asks the wind once a piece and writes 150 vertices.
