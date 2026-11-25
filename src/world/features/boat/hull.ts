// src/world/features/boat/hull.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import { PALETTE } from '../../shared/palette.ts'


/**
 * The boat's measures, in its own frame: x forward to the bow, y up from the
 * waterline, z out to starboard.
 *
 * A small double-ender, the same at both ends, for rowing and for one sail:
 * the sort two people carry up a beach. An eye on the path is three units up,
 * so it is a little over two people long.
 */
export const LENGTH = 7.6

const BEAM          = 2.5

/** How much of it is under the water, how high its side stands over it amidships, and how high its two ends rise. */
const DRAFT     = 0.34
const FREEBOARD = 0.66
const STEM      = 1.45

/** Sections the hull is drawn through, bow to stern. Few: the facets are its planks. */
const STATIONS = 10

/**
 * Half a section, keel to rail, as a part of the half-beam and a part of the
 * depth: three wide planks a side, each a flat run of facets, which is how a
 * boat built of overlapping planks catches the light.
 */
const SECTION = [[ 0, 0 ], [ 0.52, 0.15 ], [ 0.88, 0.52 ], [ 1, 1 ]] as const

/**
 * The hull where the water cuts it, for the sea to break round: half its
 * length, out to where `keel` comes up through the surface, and half its
 * beam amidships, `SECTION` read at the water's height up the side.
 */
export const WATERLINE = {
  half: LENGTH / 2 * (DRAFT / (DRAFT + STEM * 0.42)) ** (1 / 4.5),
  beam: BEAM / 2 * (SECTION[1][0] + (SECTION[2][0] - SECTION[1][0]) * (DRAFT / (DRAFT + FREEBOARD) - SECTION[1][1]) / (SECTION[2][1] - SECTION[1][1])),
} as const

/** Where the three thwarts are, as parts of the half-length, and how high. The mast stands through the middle one. */
const THWARTS = [ -0.52, 0.14, 0.6 ] as const
const SEAT    = FREEBOARD - 0.2

/** The mast: where along the boat it stands, how high over the water its top is, and half its thickness at the foot. */
export const MAST = { along: 0.14 * LENGTH / 2, top: 5.4, half: 0.075 } as const

/** The anchor's rope: how far ahead of the bow it is drawn, and how far under the water by then. */
const RODE = { ahead: 5.4, under: 0.9 } as const

/** Where a rope is made fast at either end of the boat: the head of the stem, or of the stern post. */
export const STEMHEAD = { along: LENGTH / 2 - 0.05, up: STEM - 0.1 } as const

/** The boat at its anchor: mast up, the sail down and furled, and one rope from the stem down into the water ahead. */
const AT_ANCHOR: Fit = {
  mast:  true,
  sail:  true,
  ropes: [[[ STEMHEAD.along, STEMHEAD.up, 0 ], [ LENGTH / 2 + RODE.ahead, -RODE.under, 0 ]]],
}

/** Wood as it is left: the top plank, the rail and everything inside. */
const TIMBER = new THREE.Color(PALETTE.timber)

/** The same wood tarred, below the top plank, to keep the sea out. */
const TARRED = new THREE.Color(PALETTE.timber).multiplyScalar(0.3)

/** The inside of the planking, in its own shade, and rope. */
const INSIDE = new THREE.Color(PALETTE.timber).multiplyScalar(0.72)

/** Sailcloth: wool woven close and left its own colour, greyed by salt. */
const SAIL = new THREE.Color(PALETTE.fleece).lerp(new THREE.Color(PALETTE.timber), 0.3)
const ROPE = new THREE.Color(PALETTE.timber).lerp(new THREE.Color(PALETTE.sand), 0.5)

const corner = new THREE.Vector3()
const edge   = new THREE.Vector3()
const facing = new THREE.Vector3()
const ahead  = new THREE.Vector3(1, 0, 0)
const lie    = new THREE.Quaternion()

type Point = readonly [number, number, number]

/**
 * What a boat of this build carries besides its planks, thwarts and oars:
 * whether it has its mast stepped, whether its sail lies furled on its yard
 * along the thwarts, and the ropes that lead off it, each from one place to
 * another in the boat's own frame.
 */
export interface Fit {
  mast:  boolean
  sail:  boolean
  ropes: readonly (readonly [Point, Point])[]
}

/** Triangles, as flat lists a geometry is made from at the end. */
interface Sheet {
  positions: number[]
  colours:   number[]
}

/** Half the boat's width at a place along it, -1 at the stern to 1 at the bow. Never quite nothing, so no facet is a line. */
function halfBeam (along: number): number {
  return Math.max(0.02, BEAM / 2 * (1 - Math.abs(along) ** 2.3) ** 0.85)
}

/** Height of the keel there: under the water amidships, and coming up out of it into the stem at either end. */
function keel (along: number): number {
  return -DRAFT + (DRAFT + STEM * 0.42) * Math.abs(along) ** 4.5
}

/** Height of the rail there: the sheer, lowest amidships. */
function sheer (along: number): number {
  return FREEBOARD + (STEM - FREEBOARD) * Math.abs(along) ** 2.4
}

/** A place on the hull: at a station, on a line of the section, on one side. */
function hullAt (station: number, line: number, side: number): Point {
  const along       = station / STATIONS * 2 - 1
  const [ out, up ] = SECTION[line]!

  return [ along * LENGTH / 2, keel(along) + (sheer(along) - keel(along)) * up, side * halfBeam(along) * out ]
}

/** Add a triangle, turned to face away from `inside`, or toward it. */
function face (sheet: Sheet, [ a, b, c ]: readonly [Point, Point, Point], inside: Point, colour: THREE.Color, outward = true): void {
  corner.set(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  edge.set(c[0] - a[0], c[1] - a[1], c[2] - a[2])
  facing.set(a[0] - inside[0], a[1] - inside[1], a[2] - inside[2])

  for (const point of corner.cross(edge).dot(facing) >= 0 === outward ? [ a, b, c ] : [ a, c, b ]) {
    sheet.positions.push(...point)
    sheet.colours.push(colour.r, colour.g, colour.b)
  }
}

/**
 * The planking: every facet twice, once facing out in the outside's colour
 * and once facing in, in the inside's. A plank has no thickness worth a
 * triangle, and only one of the pair ever faces the eye.
 */
function plank (sheet: Sheet): void {
  for (let station = 0; station < STATIONS; station += 1)
    for (let line = 0; line < SECTION.length - 1; line += 1)
      for (const side of [ -1, 1 ]) {
        const a = hullAt(station, line, side)
        const b = hullAt(station + 1, line, side)
        const c = hullAt(station + 1, line + 1, side)
        const d = hullAt(station, line + 1, side)

        // Somewhere inside the boat at this station: on the middle line, half way up.
        const within: Point = [ (a[0] + b[0]) / 2, (a[1] + d[1]) / 2 + 0.2, 0 ]
        const outside       = line === SECTION.length - 2 ? TIMBER : TARRED

        for (const corners of [[ a, b, c ], [ a, c, d ]] as const) {
          face(sheet, corners, within, outside)
          face(sheet, corners, within, INSIDE, false)
        }
      }
}

/** The rail: a flat strip laid along the top of each side, and its outer edge. */
function rail (sheet: Sheet): void {
  for (let station = 0; station < STATIONS; station += 1)
    for (const side of [ -1, 1 ]) {
      const [ ax, ay, az ] = hullAt(station, SECTION.length - 1, side)
      const [ bx, by, bz ] = hullAt(station + 1, SECTION.length - 1, side)
      const below: Point   = [ (ax + bx) / 2, ay - 1, (az + bz) / 2 - side * 0.3 ]

      const inA: Point  = [ ax, ay + 0.03, az - side * 0.05 ]
      const inB: Point  = [ bx, by + 0.03, bz - side * 0.05 ]
      const outA: Point = [ ax, ay + 0.03, az + side * 0.08 ]
      const outB: Point = [ bx, by + 0.03, bz + side * 0.08 ]
      const lowA: Point = [ ax, ay - 0.07, az + side * 0.08 ]
      const lowB: Point = [ bx, by - 0.07, bz + side * 0.08 ]

      for (const corners of [[ inA, inB, outB ], [ inA, outB, outA ], [ outA, outB, lowB ], [ outA, lowB, lowA ]] as const)
        face(sheet, corners, below, TIMBER)
    }
}

/** A box of one colour, as a geometry the rest can be merged with. */
function box (width: number, height: number, depth: number, colour: THREE.Color): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth).toNonIndexed()
  const colours  = new Float32Array(geometry.getAttribute('position').count * 3)

  for (let index = 0; index < colours.length; index += 3)
    colour.toArray(colours, index)

  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  geometry.deleteAttribute('uv')

  return geometry
}

/** Everything in the boat that is a plain piece of wood or a length of rope. */
function fit ({ mast, sail, ropes }: Fit): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = []

  for (const along of THWARTS)
    parts.push(box(0.46, 0.07, halfBeam(along) * 1.84, TIMBER).translate(along * LENGTH / 2, SEAT, 0))

  // The stem and the stern post, standing a hand over the rail.
  for (const end of [ -1, 1 ])
    parts.push(box(0.12, 0.6, 0.12, TIMBER).translate(end * (LENGTH / 2 - 0.03), STEM + 0.18, 0))

  // The mast, a little thinner than it is deep so its faces catch different light.
  if (mast)
    parts.push(box(MAST.half * 2, MAST.top - SEAT + 0.5, MAST.half * 1.6, TIMBER).translate(MAST.along, (MAST.top + SEAT - 0.5) / 2, 0))

  // The sail, lowered and rolled on its yard, laid fore and aft to port of the mast.
  if (sail)
    parts.push(
      box(4.7, 0.07, 0.07, TIMBER).translate(0.2, SEAT + 0.3, -0.24),
      box(4, 0.22, 0.3, SAIL).rotateX(0.5)
        .translate(0.2, SEAT + 0.2, -0.3),
    )

  // Two oars shipped along the thwarts, blades aft.
  for (const side of [ -1, 1 ]) {
    parts.push(box(3.5, 0.07, 0.07, TIMBER).rotateY(side * 0.05)
      .translate(-0.1, SEAT + 0.07, side * 0.42))
    parts.push(box(0.8, 0.035, 0.22, TIMBER).rotateY(side * 0.05)
      .translate(-2.2, SEAT + 0.07, side * 0.52))
  }

  // Its ropes. The boat at anchor always lies straight behind it, and one
  // made fast to a pier barely moves, so in the boat's own frame a rope is still.
  for (const [ a, b ] of ropes) {
    const from = new THREE.Vector3(...a)
    const to   = new THREE.Vector3(...b)

    parts.push(box(from.distanceTo(to), 0.05, 0.05, ROPE).applyQuaternion(lie.setFromUnitVectors(ahead, to.clone().sub(from)
      .normalize()))
      .translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2))
  }

  return parts
}

/**
 * The whole boat but its pennant, as one geometry coloured per vertex: the
 * planking, the rail, three thwarts, two oars, and what `fitted` says of its
 * mast and its ropes. Left to itself it is the boat at its anchor.
 */
export function createHullGeometry (fitted: Fit = AT_ANCHOR): THREE.BufferGeometry {
  const sheet: Sheet = { positions: [], colours: []}

  plank(sheet)
  rail(sheet)

  const shell = new THREE.BufferGeometry()

  shell.setAttribute('position', new THREE.Float32BufferAttribute(sheet.positions, 3))
  shell.setAttribute('color', new THREE.Float32BufferAttribute(sheet.colours, 3))
  shell.computeVertexNormals()

  const parts  = [ shell, ...fit(fitted) ]
  const merged = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

  merged.computeBoundingBox()
  merged.computeBoundingSphere()

  return merged
}

// perf: cheap — about 450 triangles, built once, drawn in one call (two with
// its shadow pass).
