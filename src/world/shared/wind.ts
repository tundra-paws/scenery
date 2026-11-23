// src/world/shared/wind.ts
import * as THREE from 'three'

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
 * Seconds the wind has already been blowing when the world begins.
 *
 * The weather is a fixed pattern, so this picks which part of it the visit
 * opens on, and it was picked by looking: ten seconds in, when the postcards
 * are taken, the cairn stands in the sun against open sky and a cloud's
 * shadow lies down the island's eastern shoulder.
 */
const HEAD_START = 1470

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

/**
 * The same signal for a shader: `uWindDrift`, the constants, and `windGust`.
 *
 * Written out from the table above rather than typed twice, so the grass on
 * the GPU and anything that asks `gustAt` on the CPU answer to one wind.
 * Guarded, so two amendments to one material may both ask for it.
 */
export const WIND_GLSL = /* glsl */ `
  #ifndef WIND_GLSL
  #define WIND_GLSL

  uniform vec2 uWindDrift;

  const float WEATHER_SPAN = ${glsl(WEATHER_SPAN)};
  const vec2  WIND         = vec2(${Math.cos(HEADING)}, ${Math.sin(HEADING)});

  // A place, in the air's own frame: where the air now here started from, as
  // an angle that goes round once across the span.
  vec2 windFrame (vec2 at) {
    return (at - uWindDrift) * ${TAU / WEATHER_SPAN};
  }

  // 0 in a lull, 1 in a gust.
  float windGust (vec2 at) {
    vec2 air = windFrame(at);

    return 0.5 + 0.5 * (${GUSTS.map(gust => `${glsl(gust.weight)} * sin(dot(air, vec2(${glsl(gust.x)}, ${glsl(gust.z)})) + ${glsl(gust.phase)})`).join(' + ')});
  }

  #endif
`

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

  /** Put the air where it is at `time` seconds. */
  blow (time: number): void

  /** How hard it blows at a place and a time: 0 in a lull, 1 in a gust. */
  gustAt (x: number, z: number, time: number): number
}

export interface WindUniforms {

  /** How far the air has moved, wrapped to the weather's span. */
  uWindDrift: { value: THREE.Vector2 }
}

function glsl (value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value)
}

/** A remainder that is never negative. */
function wrap (value: number, span: number): number {
  return (value % span + span) % span
}

export function createWind (): Wind {
  const direction = [ Math.cos(HEADING), Math.sin(HEADING) ] as const
  const uniforms  = { uWindDrift: { value: new THREE.Vector2() }}

  return {
    direction,
    speed: SPEED,
    uniforms,

    blow (time) {
      const gone = SPEED * (time + HEAD_START)

      uniforms.uWindDrift.value.set(wrap(direction[0] * gone, WEATHER_SPAN), wrap(direction[1] * gone, WEATHER_SPAN))
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
