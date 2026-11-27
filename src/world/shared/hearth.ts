// src/world/shared/hearth.ts
import * as THREE from 'three'
import { cos, mix, positionLocal, sin, vec3 } from 'three/tsl'

import type { Daylight } from './daylight.ts'
import { createUnlitMaterial } from './lit.ts'
import type { UnlitMaterial } from './lit.ts'
import { floatAttribute, heldFloat, vec3Attribute } from './nodes.ts'
import type { Held } from './nodes.ts'
import { PALETTE } from './palette.ts'

/** How much brighter than its colour a flame is. Less than the lamp's: a fire is seen from close to, and has to keep its amber through the tone curve. */
const FLAME = 1.3

/** How strong the daylight that comes in at a door is, and how much of the zenith's blue is in it: it is the sky's light, not the sun's. */
const DAYLIGHT = 0.5
const SKYLIT   = 0.55

/** What is left to see by where neither the fire nor the door reaches, as a share of the daylight: a room is never quite black. */
const GLOOM = 0.03

/** How much of a fire's light a face square to it takes when it is turned right away: the room's own walls give some back. */
const WRAP = 0.22

/** How much a fire wavers, as the lamp does, and how much more it gives an eye that has opened to the night. */
const FLICKER   = 0.11
const DARK_GAIN = 1.15

/** How far a flame's tip strays, sideways and up, for a tongue one unit tall. */
const LICK = { aside: 0.16, up: 0.24 } as const

const WARM = new THREE.Color(PALETTE.lamp)

/** A fire's two colours: the lamp's amber for the flame, and that gone toward the pennant's red for what glows under it. */
export const FLAME_COLOUR = new THREE.Color(PALETTE.lamp).multiplyScalar(FLAME)
export const EMBER_COLOUR = new THREE.Color(PALETTE.lamp).lerp(new THREE.Color(PALETTE.pennant), 0.5)
  .multiplyScalar(1.15)

/** Module-scope scratch. */
const edgeA  = new THREE.Vector3()
const edgeB  = new THREE.Vector3()
const facing = new THREE.Vector3()
const toward = new THREE.Vector3()
const corner = new THREE.Vector3()
const turned = new THREE.Matrix4()
const lit    = new THREE.Color()

/** A point of three numbers, as the plans type them. */
export type Triple = readonly [number, number, number]

/** A light inside: a fire, or an opening the day comes in at. Where it is, how strong, and how far off it has fallen to half. */
export interface Source {
  at:    Triple
  gain:  number
  reach: number
}

/** The fire's brightness now and the clock its flames keep: set each step by the feature that owns the fire. */
export interface Burning {
  level: Held<number>
  time:  Held<number>
}

/**
 * The inside of something built, as a painter's list of faces: what a fire
 * lights and what the day reaches through a door, worked out once a corner
 * when the list is closed.
 *
 * Nothing inside is lit by the sun's own light or the sky's: a roof is over
 * it, and the world's one shadow map is too coarse to say so. So an inside
 * is unlit, and carries its light with it: each corner knows how much of
 * the fire falls on it (`color`, in the fire's own amber) and how much of
 * the daylight at the door (`aDay`), and the material adds the two up for
 * the hour. A flame is a tongue whose tip strays (`aFlame`).
 */
export class Interior {
  private readonly fires: readonly Source[]

  private readonly doors: readonly Source[]

  private readonly position: number[] = []

  private readonly fire: number[] = []

  private readonly day: number[] = []

  private readonly flame: number[] = []

  constructor (fires: readonly Source[], doors: readonly Source[]) {
    this.fires = fires
    this.doors = doors
  }

  /** How much of every source of a kind falls on a face at a place. */
  private gathered (sources: readonly Source[], at: THREE.Vector3, wrap: number): number {
    let light = 0

    for (const source of sources) {
      toward.set(...source.at).sub(at)

      const far  = toward.length()
      const full = Math.max(0, facing.dot(toward) / (far || 1))

      light += source.gain * (wrap + (1 - wrap) * full) / (1 + (far / source.reach) ** 2)
    }

    return light
  }

  /** Something that gives light and takes none: a triangle of one colour, the same whatever the hour, or going to `tip` at its third corner. */
  private glowing (a: Triple, b: Triple, c: Triple, colour: THREE.Color, tips: Triple, tip = colour): void {
    [ a, b, c ].forEach((point, index) => {
      this.position.push(...point)
      this.fire.push(...(index === 2 ? tip : colour).toArray())
      this.day.push(0, 0, 0)
      this.flame.push(tips[index]!)
    })
  }

  /** One triangle of `albedo`, facing the side its corners go round anticlockwise from. */
  triangle (a: Triple, b: Triple, c: Triple, albedo: THREE.Color): void {
    facing.crossVectors(edgeA.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), edgeB.set(c[0] - a[0], c[1] - a[1], c[2] - a[2])).normalize()

    for (const point of [ a, b, c ]) {
      corner.set(...point)

      const fire = this.gathered(this.fires, corner, WRAP)
      const day  = this.gathered(this.doors, corner, 0.1) + GLOOM

      this.position.push(...point)
      this.fire.push(...lit.copy(albedo).multiply(WARM)
        .multiplyScalar(fire)
        .toArray())
      this.day.push(...lit.copy(albedo).multiplyScalar(day)
        .toArray())
      this.flame.push(0)
    }
  }

  /** A flat face of four corners, given anticlockwise as seen from the side it faces. */
  quad (a: Triple, b: Triple, c: Triple, d: Triple, albedo: THREE.Color): void {
    this.triangle(a, b, c, albedo)
    this.triangle(a, c, d, albedo)
  }

  /** A wall with a hole in it, as `sheet` lays one: the four pieces round the hole. Both are given as left, foot, right and head on the wall's own sheet. */
  pierced (sheet: readonly [number, number, number, number], hole: readonly [number, number, number, number], place: (across: number, up: number) => Triple, albedo: THREE.Color, grain = 1): void {
    const [ left, foot, right, head ] = sheet
    const [ from, sill, to, top ]     = hole

    this.sheet([ left, foot, from, head ], place, albedo, grain)
    this.sheet([ to, foot, right, head ], place, albedo, grain)
    this.sheet([ from, foot, to, sill ], place, albedo, grain)
    this.sheet([ from, top, to, head ], place, albedo, grain)
  }

  /**
   * A flat wall in pieces a stone or a flag in size, each a shade of its
   * own, so the fire has something to fall across. `place` takes a spot on
   * the wall's own sheet (across, up) to where it is; the pieces face the
   * side from which across runs to the right and up runs up.
   */
  sheet ([ left, foot, right, head ]: readonly [number, number, number, number], place: (across: number, up: number) => Triple, albedo: THREE.Color, grain = 1): void {
    if (right - left < 0.02 || head - foot < 0.02)
      return

    const columns = Math.max(1, Math.round((right - left) / (0.9 * grain)))
    const rows    = Math.max(1, Math.round((head - foot) / (0.55 * grain)))

    // Every other course starts with a half piece, so no joint stands over another.
    for (let row = 0; row < rows; row += 1)
      for (let column = 0; column < columns + (row & 1); column += 1) {
        const shift = (row & 1) / 2
        const u0    = left + (right - left) * Math.max(0, column - shift) / columns
        const u1    = left + (right - left) * Math.min(columns, column + 1 - shift) / columns
        const v0    = foot + (head - foot) * row / rows
        const v1    = foot + (head - foot) * (row + 1) / rows
        const shade = 0.82 + 0.36 * (Math.abs(Math.sin(u0 * 12.9898 + v0 * 78.233 + left * 3.1) * 43758.5453) % 1)

        this.quad(place(u0, v0), place(u1, v0), place(u1, v1), place(u0, v1), lit.copy(albedo).multiplyScalar(shade)
          .clone())
      }
  }

  /** A box of `size`, its middle at `at`: turned about the upright, then tipped about its own x (`tilt`) and its own z (`roll`). */
  box (size: Triple, at: Triple, albedo: THREE.Color, turn = 0, tilt = 0, roll = 0): void {
    const [ w, h, d ] = [ size[0] / 2, size[1] / 2, size[2] / 2 ]

    turned.makeRotationFromEuler(new THREE.Euler(tilt, turn, roll, 'YXZ')).setPosition(...at)

    const at8 = [[ -w, -h, -d ], [ w, -h, -d ], [ w, h, -d ], [ -w, h, -d ], [ -w, -h, d ], [ w, -h, d ], [ w, h, d ], [ -w, h, d ]].map(([ x, y, z ]) => corner.set(x!, y!, z!).applyMatrix4(turned)
      .toArray() as unknown as Triple)

    for (const [ a, b, c, d4 ] of [[ 1, 0, 3, 2 ], [ 4, 5, 6, 7 ], [ 0, 4, 7, 3 ], [ 5, 1, 2, 6 ], [ 3, 7, 6, 2 ], [ 0, 1, 5, 4 ]] as const)
      this.quad(at8[a]!, at8[b]!, at8[c]!, at8[d4]!, albedo)
  }

  /** The glowing heart of a fire: a low heap, `wide` across and `tall`, on `at`. */
  embers (at: Triple, wide: number, tall: number): void {
    const top  = [ at[0], at[1] + tall, at[2] ] as const
    const ring = Array.from({ length: 5 }, (_, index): Triple => {
      const angle = index / 5 * Math.PI * 2 + 0.4

      return [ at[0] + Math.cos(angle) * wide / 2, at[1], at[2] + Math.sin(angle) * wide / 2 ]
    })

    ring.forEach((point, index) => this.glowing(ring[(index + 1) % 5]!, point, top, EMBER_COLOUR, [ 0, 0, 0.12 ]))
  }

  /** A lamp's flame: a small lump of the fire's own light, `tall` from point to point. */
  lamp (at: Triple, tall: number): void {
    const wide = tall / 3
    const ring = [[ wide, 0 ], [ 0, wide ], [ -wide, 0 ], [ 0, -wide ]].map(([ x, z ]): Triple => [ at[0] + x!, at[1], at[2] + z! ])

    ring.forEach((point, index) => {
      const next = ring[(index + 1) % 4]!

      this.glowing(next, point, [ at[0], at[1] + tall / 2, at[2] ], FLAME_COLOUR, [ 0, 0, 0.05 ])
      this.glowing(point, next, [ at[0], at[1] - tall / 2, at[2] ], FLAME_COLOUR, [ 0, 0, 0 ])
    })
  }

  /** One tongue of flame: three faces up to a tip that strays. */
  tongue (at: Triple, wide: number, tall: number, turn: number): void {
    const tip  = [ at[0], at[1] + tall, at[2] ] as const
    const foot = Array.from({ length: 3 }, (_, index): Triple => {
      const angle = turn + index / 3 * Math.PI * 2

      return [ at[0] + Math.cos(angle) * wide / 2, at[1], at[2] + Math.sin(angle) * wide / 2 ]
    })

    foot.forEach((point, index) => this.glowing(foot[(index + 1) % 3]!, point, tip, EMBER_COLOUR, [ 0, 0, tall ], FLAME_COLOUR))
  }

  /** Close the list: one geometry, in whatever frame the faces were given in. */
  build (): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.fire, 3))
    geometry.setAttribute('aDay', new THREE.Float32BufferAttribute(this.day, 3))
    geometry.setAttribute('aFlame', new THREE.Float32BufferAttribute(this.flame, 1))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    return geometry
  }
}

/**
 * What an inside is drawn with: unlit, its light its own. The fire's share
 * wavers with the fire (`burning.level`), the day's takes the horizon's
 * colour at this hour, and a flame's tip strays with the clock.
 *
 * Every inside made with it is one program, whichever building it is in.
 */
export function createFirelitMaterial (day: Daylight, burning: Burning): UnlitMaterial {
  const material = createUnlitMaterial({ day }, { name: 'firelit' })
  const time     = heldFloat(burning.time)
  const tip      = floatAttribute('aFlame')

  // Each tongue keeps a beat of its own, by where it stands.
  const beat  = positionLocal.x.mul(23).add(positionLocal.z.mul(17))
  const stray = vec3(sin(time.mul(9.1).add(beat)).mul(LICK.aside), sin(time.mul(13.7).add(beat.mul(1.7))).mul(LICK.up), cos(time.mul(7.9).add(beat.mul(0.6))).mul(LICK.aside))

  material.colorNode    = vec3Attribute('color').mul(heldFloat(burning.level))
    .add(vec3Attribute('aDay').mul(mix(day.nodes.horizon, day.nodes.zenith, SKYLIT))
      .mul(DAYLIGHT))
  material.positionNode = positionLocal.add(stray.mul(tip))

  return material
}

/** How brightly a fire burns at `time` seconds, by day (`night` 0) or in the dark (1): never quite steady. */
export function fireLevel (time: number, night: number, phase = 0): number {
  return (1 + (DARK_GAIN - 1) * night) * (1 + FLICKER * Math.sin(time * 7.3 + phase) * Math.sin(time * 3.1 + 1.7 + phase))
}

// perf: built once: three sources a corner at most. The material is an
// unlit one with two attributes added up and three sines a vertex; nothing
// inside casts a shadow or takes one.
