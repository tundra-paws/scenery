// src/world/shared/swell.ts

/**
 * The swell: long, low waves the wind has raised out on the open sea, running
 * in before it and breaking on whatever shore they meet.
 *
 * Two trains, as plane waves: one straight down the wind, and a shorter,
 * lower one a little off it, so no two crests are alike. Each is a turn off
 * the wind's heading, a length from crest to crest, a height (half the rise
 * from trough to crest) and a phase. They run at the speed deep water lets a
 * wave of that length run, so the long one overtakes the short.
 *
 * The sea's shader reads it in its surface and its surf, and the boat rides
 * it: one swell, on the CPU and the GPU alike, as the wind is.
 */
const TRAINS: readonly Train[] = [
  { turn: 0, length: 16, height: 0.07, phase: 0 },
  { turn: 0.5, length: 9.5, height: 0.035, phase: 2.2 },
]

/** Gravity, for how fast a wave of a given length runs in deep water. */
const GRAVITY = 9.8

/**
 * The swell for a shader, to go after `WIND_GLSL`: `swellAt` gives the height
 * of the sea over its level at a place and time, and how steep it is there
 * along x and along z.
 */
export const SWELL_GLSL = /* glsl */ `
  #ifndef SWELL_GLSL
  #define SWELL_GLSL

  vec3 swellAt (vec2 at, float time) {
    vec3 swell = vec3(0.0);
    vec2 along;
    float phase;
${TRAINS.map(train => {
  const { k, omega } = motion(train)
  const [ c, s ]     = [ Math.cos(train.turn), Math.sin(train.turn) ].map(float)

  return `
    along  = vec2(WIND.x * ${c} - WIND.y * ${s}, WIND.x * ${s} + WIND.y * ${c});
    phase  = dot(at, along) * ${float(k)} - time * ${float(omega)} + ${float(train.phase)};
    swell += vec3(${float(train.height)} * sin(phase), ${float(train.height * k)} * cos(phase) * along);`
}).join('')}

    return swell;
  }

  #endif
`

/** One train of waves, as `TRAINS` lists them. */
interface Train {
  turn:   number
  length: number
  height: number
  phase:  number
}

/** A train's wave number, and how fast its phase turns in radians a second. */
interface Motion {
  k:     number
  omega: number
}

/** The sea's surface at one place and moment. */
export interface Swell {

  /** Height over the water's level. */
  height: number

  /** How much it rises for each unit along x, and along z. */
  slopeX: number
  slopeZ: number
}

/** A number as a GLSL float literal, never an int. */
function float (value: number): string {
  return value.toFixed(6)
}

/** A train's wave number and how fast its phase turns, from its length. */
function motion ({ length }: Train): Motion {
  const k = Math.PI * 2 / length

  return { k, omega: Math.sqrt(GRAVITY * k) }
}

/**
 * The swell at a place and moment, written into `out`, for a wind blowing
 * along `wind` (a unit vector on the ground). The same sums as `SWELL_GLSL`.
 */
export function swellAt (wind: readonly [number, number], x: number, z: number, time: number, out: Swell): Swell {
  out.height = 0
  out.slopeX = 0
  out.slopeZ = 0

  for (const train of TRAINS) {
    const { k, omega } = motion(train)
    const ax           = wind[0] * Math.cos(train.turn) - wind[1] * Math.sin(train.turn)
    const az           = wind[0] * Math.sin(train.turn) + wind[1] * Math.cos(train.turn)
    const phase        = (x * ax + z * az) * k - time * omega + train.phase
    const rise         = train.height * k * Math.cos(phase)

    out.height += train.height * Math.sin(phase)
    out.slopeX += rise * ax
    out.slopeZ += rise * az
  }

  return out
}

// perf: trivial — two sines and two cosines a call. The boat asks three
// times a step; the sea once a pixel.
