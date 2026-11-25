// src/world/shared/wind.ts
import * as THREE from 'three'
import { dot, float, sin, vec2 } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { heldVec2 } from './nodes.ts'

/**
 * Edge of the square the weather repeats on, in world units.
 *
 * Everything the wind carries (a gust front, a cloud, a cloud's shadow) is one
 * pattern laid over this square and pushed along. It is far wider than the
 * haze lets anyone see, so the repeat is never in the picture, and because it
 * repeats, how far the air has moved can be kept small however long the page
 * stays open.
 */
export const WEATHER_SPAN = 2000

/** Which way the air moves, as an angle on the ground from +x toward +z: across the `hero` frame from the sun's side, and a little away. */
const HEADING = -1.2

/** World units a second. Gentle: a cloud takes most of a minute to cross the island. */
const SPEED = 7

/**
 * The air aloft, which carries the high cloud: which way it goes, turned
 * half a radian from the wind below it, and how fast against it. High cloud
 * seen from the ground creeps; the low clouds go by under it.
 */
export const ALOFT      = [ Math.cos(HEADING + 0.5), Math.sin(HEADING + 0.5) ] as const
export const ALOFT_PACE = 0.35

/**
 * Seconds the wind has already been blowing when the world begins.
 *
 * The weather is a fixed pattern, so this picks which part of it the visit
 * opens on, and it was picked by looking: ten seconds in, when the postcards
 * are taken, the low sun stands clear over the island's western shoulder
 * with two thin bars of cloud under it, and the cairn against open sky.
 */
const HEAD_START = 1500

const TAU = Math.PI * 2

/**
 * The gusts, as plane waves: whole cycles across the span along x and along z,
 * a weight, and a phase. Whole cycles, so the pattern meets itself at the seam.
 * The first two are fronts square to the wind, 60 and 34 units apart; the last
 * lies across them so no two fronts are alike. The weights sum to one.
 */
const GUSTS: readonly Gust[] = [
  { x: 12, z: -31, weight: 0.5, phase: 0 },
  { x: 28, z: -52, weight: 0.3, phase: 1.3 },
  { x: 8, z: 5, weight: 0.2, phase: 4.1 },
]

interface Gust {
  x:      number
  z:      number
  weight: number
  phase:  number
}

/**
 * The wind: one signal that everything which moves in the air reads.
 *
 * It is a frozen pattern carried along at a steady speed, so a gust that
 * flattens the grass here reaches the water downwind a moment later, and the
 * clouds overhead keep pace with both. Nothing in it but the time.
 */
export interface Wind {

  /** Where the air is going, as a unit `[x, z]`. */
  readonly direction: readonly [number, number]

  /** How fast it goes there, in world units a second. */
  readonly speed: number

  /** What a shader reads. One object shared by reference: a single write a step reaches every material. */
  readonly uniforms: WindUniforms

  /** The same for a node material: the drift, and the gust at a place. */
  readonly nodes: WindNodes

  /** Put the air where it is at `time` seconds. */
  blow (time: number): void

  /** How far the air has moved by `time` seconds, as `[x, z]` wrapped to the weather's span: what `blow` writes. */
  driftAt (time: number): readonly [number, number]

  /** How hard it blows at a place and a time: 0 in a lull, 1 in a gust. */
  gustAt (x: number, z: number, time: number): number
}

export interface WindUniforms {

  /** How far the air has moved, wrapped to the weather's span. */
  uWindDrift: { value: THREE.Vector2 }

  /** How far the air aloft has moved, along `ALOFT`, unwrapped: the high cloud it carries never comes round. */
  uWindAloft: { value: THREE.Vector2 }
}

/**
 * The wind for a node material: the same signal `gustAt` answers with on the
 * CPU, written out from the same table, so the grass on the GPU and the smoke
 * on the CPU answer to one wind.
 */
export interface WindNodes {

  /** How far the air has moved, wrapped to the weather's span. */
  drift: Node<'vec2'>

  /** How far the air aloft has moved. */
  aloft: Node<'vec2'>

  /** A place on the ground (`xz`) in the air's own frame: where the air now there started from, as an angle that goes round once across the span. */
  frame (at: Node<'vec2'>): Node<'vec2'>

  /** 0 in a lull, 1 in a gust, at a place on the ground (`xz`). */
  gust (at: Node<'vec2'>): Node<'float'>
}

function createWindNodes (uniforms: WindUniforms): WindNodes {
  const drift = heldVec2(uniforms.uWindDrift)
  const frame = (at: Node<'vec2'>): Node<'vec2'> => at.sub(drift).mul(TAU / WEATHER_SPAN)

  return {
    drift,
    aloft: heldVec2(uniforms.uWindAloft),
    frame,

    gust (at) {
      const air = frame(at)

      let sum: Node<'float'> = float(0)

      for (const gust of GUSTS)
        sum = sum.add(sin(dot(air, vec2(gust.x, gust.z)).add(gust.phase)).mul(gust.weight))

      return sum.mul(0.5).add(0.5)
    },
  }
}

/** A remainder that is never negative. */
function wrap (value: number, span: number): number {
  return (value % span + span) % span
}

export function createWind (): Wind {
  const direction = [ Math.cos(HEADING), Math.sin(HEADING) ] as const
  const uniforms  = { uWindDrift: { value: new THREE.Vector2() }, uWindAloft: { value: new THREE.Vector2() }}

  return {
    direction,
    speed: SPEED,
    uniforms,
    nodes: createWindNodes(uniforms),

    driftAt (time) {
      const gone = SPEED * (time + HEAD_START)

      return [ wrap(direction[0] * gone, WEATHER_SPAN), wrap(direction[1] * gone, WEATHER_SPAN) ]
    },

    blow (time) {
      const gone = SPEED * (time + HEAD_START)

      uniforms.uWindDrift.value.set(wrap(direction[0] * gone, WEATHER_SPAN), wrap(direction[1] * gone, WEATHER_SPAN))
      uniforms.uWindAloft.value.set(ALOFT[0], ALOFT[1]).multiplyScalar(gone * ALOFT_PACE)
    },

    gustAt (x, z, time) {
      const gone = SPEED * (time + HEAD_START)
      const airX = (x - direction[0] * gone) * TAU / WEATHER_SPAN
      const airZ = (z - direction[1] * gone) * TAU / WEATHER_SPAN

      let sum = 0

      for (const gust of GUSTS)
        sum += gust.weight * Math.sin(airX * gust.x + airZ * gust.z + gust.phase)

      return 0.5 + 0.5 * sum
    },
  }
}

// perf: trivial — one vector written a step. In a shader, `windGust` is three
// sines.
