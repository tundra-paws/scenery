// src/world/features/boat/sail.ts
import * as THREE from 'three'

import { createLitMaterial } from '../../shared/lit.ts'
import type { World } from '../../world.ts'
import { LENGTH, LUG, MAST, ROPE, SAIL, STEMHEAD } from './hull.ts'

/** How much of the light on the far side of the cloth comes through it: wool, woven close. */
export const THROUGH = 0.85

/** Panels the sail is drawn in from luff to leech and from head to foot, on a phone and elsewhere. */
const PANELS = { mobile: [ 7, 5 ], desktop: [ 10, 7 ], highEnd: [ 12, 8 ]} as const

/**
 * How far off the bow the wind has to come to lay the sail right over to one
 * side, as the part of it that blows across the boat: about what the boat
 * sheers to in a lull (`SWING` in `mooring.ts`).
 */
const ABEAM = 0.15

/** How far the clew is carried to leeward when the sail is laid right over, and how deep the belly in it is then. */
const CARRY = 0.78
const BELLY = 0.3

/** How far a fold running from luff to leech throws the cloth, as a curtain's folds hang from its rail: what it keeps in a lull, and what a full gust adds. */
const SHAKE = [ 0.15, 0.13 ] as const

/** How far the same wave lifts the foot and the leech: in a lull, and what a gust adds. */
const LIFT = [ 0.03, 0.09 ] as const

/** The nearest the cloth comes to the middle line of the boat where the mast stands: it lies against the mast, not through it. */
const AGAINST = MAST.half * 0.8 + 0.025

/** The sheet: where it is made fast, on the stern post, how far it sags between there and the clew, and how thick it is. */
const SHEET = { along: -STEMHEAD.along, up: STEMHEAD.up + 0.1, sag: 0.16, thick: 0.045 } as const

/**
 * The cloths the sail is sewn from, luff to leech: how much of its colour
 * each has kept. Wool weathers as it was woven, a web at a time, and one
 * cloth near the leech is newer than the rest.
 */
const WEATHERED = [ 0.99, 0.955, 1, 0.97, 0.945, 0.985, 0.96, 1.03, 0.97, 0.99, 0.95, 0.975 ] as const

/** The reef points: how far down the sail each row of them is tied, and how long and thick a point hangs. */
const REEFS = [ 0.58, 0.79 ] as const
const POINT = { long: 0.2, thick: 0.035 } as const

/** How far off the cloth a reef point is drawn, on either side of it. */
const OFF = 0.02

/** A reef point's line: rope gone dark with handling. */
const TIE = ROPE.clone().multiplyScalar(0.5)

/** Module-scope scratch, so a step allocates nothing. */
const where = new THREE.Vector3()

/** The sail, and the one thing it does. */
export interface Sail {
  mesh: THREE.Mesh

  /**
   * Hang as the wind has it at `time` seconds: `gust` is how hard it blows
   * (0 to 1), `across` the part of it that blows over the boat to starboard.
   */
  fill (time: number, gust: number, across: number): void
  dispose (): void
}

function smoothstep (from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))

  return t * t * (3 - 2 * t)
}

/**
 * Where a place on the sail is, in the boat's own frame: `u` from the luff
 * (0) to the leech (1), `v` from the head (0) to the foot (1), in a wind
 * blowing `gust` hard and `across` the boat, at `time` seconds.
 *
 * A pure function of those. The head is laced to the yard and the luff is
 * taut from the throat to the tack, so neither moves; the cloth is freer
 * the further from both, and freest at the clew. With the wind ahead it is
 * a flag: it lies to whichever side the boat has sheered away from, with a
 * belly in it, and waves run down it from luff to leech and lift its foot,
 * bigger as it blows harder and never faster, so a gust cannot make it jump.
 * Where the mast stands it lies against the mast.
 */
export function clothAt (u: number, v: number, time: number, gust: number, across: number, out: THREE.Vector3): THREE.Vector3 {
  const headX = LUG.throat[0] + (LUG.peak[0] - LUG.throat[0]) * u
  const headY = LUG.throat[1] + (LUG.peak[1] - LUG.throat[1]) * u
  const footX = LUG.tack[0] + (LUG.clew[0] - LUG.tack[0]) * u
  const footY = LUG.tack[1] + (LUG.clew[1] - LUG.tack[1]) * u

  // The foot is cut with a little round to it, and hangs below the straight line.
  const round = 0.3 * Math.sin(Math.PI * u) * v * v
  const free  = u ** 0.8 * v ** 0.9
  const laid  = Math.max(-1, Math.min(1, across / ABEAM))
  const slack = 1 - 0.5 * Math.abs(laid)
  const shake = (SHAKE[0] + SHAKE[1] * gust) * slack
  const wave  = Math.sin(u * 16 + v * 2.4 - time * 2.2) + 0.5 * Math.sin(u * 9 - v * 3.1 - time * 1.5 + 1.1)
  const lift  = (LIFT[0] + LIFT[1] * gust) * Math.sin(u * 5.1 - time * 3.7 + 0.8)

  let aside = LUG.aside + laid * (CARRY * u * v ** 0.7 + BELLY * Math.sin(Math.PI * u) * v ** 0.6) + shake * free * wave

  const x = headX + (footX - headX) * v + 0.25 * free * shake * wave
  const y = headY + (footY - headY) * v - round + free * v * lift

  // The mast is to starboard of the cloth, from the foot up to the yard.
  aside = Math.min(aside, -AGAINST + 2 * smoothstep(0.1, 1.1, Math.abs(x - MAST.along)))

  return out.set(x, y, aside)
}

/**
 * The boat's sail, hoisted to dry: a lugsail of undyed wool on its yard,
 * the sheet slack, shaking in the wind the boat lies head to.
 *
 * The largest thing the wind moves here, and it moves as the pennant over
 * it and the nets ashore do, from the same gust. It is the boat's child, so
 * it rides and swings with her, and is worked out in her frame. The low sun
 * shines through it (`letThrough`). One mesh: the cloths it is sewn from,
 * each a strip from head to foot in its own weathered shade, the reef
 * points tied across it, and the sheet from its clew to the stern post.
 */
export function createSail (world: World): Sail {
  const [ strips, down ] = PANELS[world.quality.tier]
  const rows             = down + 1
  const cloth            = strips * 2 * rows
  const points           = cloth + strips * REEFS.length * 8
  const count            = points + 6
  const position         = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
  const colour           = new Float32Array(count * 3)
  const index            = [] as number[]
  const shade            = new THREE.Color()

  /** Two triangles between four vertices, given as the first of each pair. */
  const quad = (a: number, b: number): void => {
    index.push(a, a + 1, b + 1, a, b + 1, b)
  }

  // The cloths: every strip has both its edges to itself, so a seam is a
  // hard line between two shades.
  for (let strip = 0; strip < strips; strip += 1)
    for (let edge = 0; edge < 2; edge += 1)
      for (let row = 0; row < rows; row += 1) {
        const at = (strip * 2 + edge) * rows + row

        shade.copy(SAIL).multiplyScalar(WEATHERED[strip % WEATHERED.length]!)
          .toArray(colour, at * 3)

        if (edge === 0 && row < down)
          quad(at, at + rows)
      }

  // The reef points: a short length of line through the cloth in the middle
  // of every strip, hanging down both sides of it.
  for (let point = 0; point < strips * REEFS.length * 2; point += 1) {
    for (let corner = 0; corner < 4; corner += 1)
      TIE.toArray(colour, (cloth + point * 4 + corner) * 3)

    quad(cloth + point * 4, cloth + point * 4 + 2)
  }

  for (let place = 0; place < 3; place += 1) {
    ROPE.toArray(colour, (points + place * 2) * 3)
    ROPE.toArray(colour, (points + place * 2 + 1) * 3)

    if (place < 2)
      quad(points + place * 2, points + place * 2 + 2)
  }

  position.setUsage(THREE.DynamicDrawUsage)

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', position)
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  geometry.setIndex(index)

  // It moves every step, so the sphere three culls by is set once, round
  // everywhere it can reach.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(-0.8, 3, 0), LENGTH / 2 + 0.6)

  const material = createLitMaterial(world, { name: 'sail', vertexColors: true, side: THREE.DoubleSide })

  material.letThrough(THROUGH)

  const mesh = new THREE.Mesh(geometry, material)

  mesh.name = 'boat-sail'

  return {
    mesh,

    fill (time, gust, over) {
      for (let strip = 0; strip < strips; strip += 1)
        for (let edge = 0; edge < 2; edge += 1)
          for (let row = 0; row < rows; row += 1) {
            clothAt((strip + edge) / strips, row / down, time, gust, over, where)
            position.setXYZ((strip * 2 + edge) * rows + row, where.x, where.y, where.z)
          }

      // The clew is the last of the cloth.
      const clewX = where.x
      const clewY = where.y
      const clewZ = where.z

      // A reef point hangs from where it goes through the cloth, a hair off it on either side.
      for (let line = 0; line < REEFS.length; line += 1)
        for (let strip = 0; strip < strips; strip += 1) {
          clothAt((strip + 0.5) / strips, REEFS[line]!, time, gust, over, where)

          for (let side = 0; side < 2; side += 1) {
            const at  = cloth + ((line * strips + strip) * 2 + side) * 4
            const off = where.z + (side ? OFF : -OFF)

            position.setXYZ(at, where.x - POINT.thick / 2, where.y, off)
            position.setXYZ(at + 1, where.x - POINT.thick / 2, where.y - POINT.long, off)
            position.setXYZ(at + 2, where.x + POINT.thick / 2, where.y, off)
            position.setXYZ(at + 3, where.x + POINT.thick / 2, where.y - POINT.long, off)
          }
        }

      // The sheet, from the clew to the stern post, hanging slack between.
      for (let place = 0; place < 3; place += 1) {
        const part = place / 2
        const x    = clewX + (SHEET.along - clewX) * part
        const y    = clewY + (SHEET.up - clewY) * part - SHEET.sag * 4 * part * (1 - part)
        const z    = clewZ * (1 - part)

        position.setXYZ(points + place * 2, x, y + SHEET.thick / 2, z)
        position.setXYZ(points + place * 2 + 1, x, y - SHEET.thick / 2, z)
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

// perf: cheap — one draw call of some 230 triangles (a phone: 130), one more
// in the sun's shadow pass off a phone, and one in the sea's mirror. A step
// is a few sines for each of its 260 vertices (a phone: 150), one buffer.
