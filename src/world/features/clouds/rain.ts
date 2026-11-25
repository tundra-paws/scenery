// src/world/features/clouds/rain.ts
import * as THREE from 'three'
import { cameraPosition, clamp, cross, distance, exp, fract, length, min, mix, mod, normalize, positionGeometry, positionWorld, smoothstep, vec3, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'
import type { Node } from 'three/webgpu'
import type { SeededRng } from 'threejs-scenes'

import type { DaylightNodes } from '../../shared/daylight.ts'
import { vec3Attribute, vec4Attribute } from '../../shared/nodes.ts'
import { printed } from '../../shared/output.ts'
import { WEATHER_SPAN } from '../../shared/wind.ts'
import type { WindNodes } from '../../shared/wind.ts'
import { DWINDLE, HAZE } from './material.ts'
import type { Shower } from './showers.ts'

/** Streaks of rain under one shower. The same on every tier: the sky is one thing. */
export const STREAKS = 400

/** How long a streak is, from and to, in world units; and the most it may be as a part of how far off it is. */
const LONG  = [ 16, 40 ] as const
const SHORT = 0.07

/**
 * How many times a streak falls from the cloud to the sea while the wind
 * crosses the weather's span along x: a whole number, so the rain does not
 * jump when the drift comes round. Some six seconds a fall.
 */
const FALLS = 130

/** How far a streak's foot lags behind its head, for every unit it has fallen: the air below is slower than the cloud. */
const SLANT = 0.32

/** A streak's width as a part of how far off it is (a pixel or so, wherever it is seen from), and the least and the most it may be. */
const FINE  = 0.0019
const THIN  = 0.012
const THICK = 1.5

/** How much of the horizon's colour is in the rain's, with the clouds' shade: a veil, not a wall. */
const PALE = 0.22

/**
 * The rain under every shower, as one mesh of thin quads.
 *
 * A streak's four corners all carry the same place, a spot on the ground
 * its shower rains on, measured from the shower's middle. What tells them
 * apart is `aStreak`: which side of the streak's line, which end, when in
 * the fall it is, and how long it is. `aCloud` is where its shower is at
 * home, as for the puffs.
 */
export function createRainGeometry (showers: readonly Shower[], rng: SeededRng): THREE.BufferGeometry {
  const count    = showers.length * STREAKS
  const position = new Float32Array(count * 12)
  const home     = new Float32Array(count * 12)
  const streak   = new Float32Array(count * 16)
  const index    = new Uint16Array(count * 6)

  let quad = 0

  for (const shower of showers)
    for (let drop = 0; drop < STREAKS; drop += 1) {
      // Evenly over the ellipse under the cloud, thinner toward its rim.
      const turn  = rng.range(0, Math.PI * 2)
      const away  = Math.pow(rng.next(), 0.62)
      const along = Math.cos(turn) * away * shower.reach[0]
      const aside = Math.sin(turn) * away * shower.reach[1]
      const phase = rng.next()
      const long  = rng.range(LONG[0], LONG[1])

      for (let corner = 0; corner < 4; corner += 1) {
        position.set([ shower.row[0] * along - shower.row[1] * aside, 0, shower.row[1] * along + shower.row[0] * aside ], quad * 12 + corner * 3)
        home.set([ shower.x, shower.y, shower.z ], quad * 12 + corner * 3)
        streak.set([ corner & 1 ? 1 : -1, corner >> 1, phase, long ], quad * 16 + corner * 4)
      }

      index.set([ quad * 4, quad * 4 + 1, quad * 4 + 2, quad * 4 + 1, quad * 4 + 3, quad * 4 + 2 ], quad * 6)
      quad += 1
    }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('aCloud', new THREE.BufferAttribute(home, 3))
  geometry.setAttribute('aStreak', new THREE.BufferAttribute(streak, 4))
  geometry.setIndex(new THREE.BufferAttribute(index, 1))

  return geometry
}

/**
 * What the rain is drawn with: the clouds' own shade, thinned with the
 * horizon's colour, and no colour of its own.
 *
 * Nothing is simulated. A streak rides the wind with its shower, as a puff
 * does, and where it is in its fall depends only on how far the air has
 * moved: it leaves the cloud's flat base, falls to the sea, and leaves
 * again. Its foot lags behind its head, since the air below is slower, so
 * the whole veil leans back from the way the shower is going. Each is
 * turned to face whoever is looking and is about a pixel wide wherever it
 * is seen from: far off they close into a grey veil, and under the shower
 * they are short hairlines. Opaque, like everything in this sky.
 */
export function createRainMaterial (wind: WindNodes, day: DaylightNodes, lee: readonly [number, number]): NodeMaterial {
  const material = new NodeMaterial()
  const cloud    = vec3Attribute('aCloud')
  const streak   = vec4Attribute('aStreak')

  // With its shower: the clouds' own drift and their dwindling at the seam.
  const home     = mod(cloud.xz.add(wind.drift).add(WEATHER_SPAN / 2), WEATHER_SPAN).sub(WEATHER_SPAN / 2)
  const presence = smoothstep(DWINDLE[0], DWINDLE[1], length(home)).oneMinus()

  /** Where the streak's line is at a height: under its spot of the cloud, and behind it by what it has fallen. */
  const placed = (height: Node<'float'>): Node<'vec3'> => {
    const lag = cloud.y.sub(height).mul(SLANT)

    return vec3(home.x.add(positionGeometry.x.mul(presence)).sub(lag.mul(lee[0])), height, home.y.add(positionGeometry.z.mul(presence)).sub(lag.mul(lee[1])))
  }

  // How far through its fall it is, and from that how high its head is. A
  // streak far off is as long as it was made; near to, it is a dash: rain
  // seen from inside the shower is not rods of glass.
  const fallen = fract(streak.z.add(wind.drift.x.mul(FALLS / WEATHER_SPAN)))
  const top    = cloud.y.mul(fallen.oneMinus())
  const long   = min(streak.w, length(cameraPosition.sub(placed(top))).mul(SHORT)).mul(presence)
  const at     = placed(top.sub(streak.y.mul(long)))

  // Turned to the eye about its own line, and as wide as a pixel is there.
  const line  = normalize(vec3(-lee[0] * SLANT, -1, -lee[1] * SLANT))
  const toEye = cameraPosition.sub(at)
  const wide  = clamp(length(toEye).mul(FINE), THIN, THICK).mul(presence)
    .mul(smoothstep(0, 0.06, fallen))

  material.positionNode = at.add(normalize(cross(line, toEye)).mul(streak.x)
    .mul(wide.mul(0.5)))

  const far  = distance(cameraPosition, positionWorld).mul(HAZE)
  const haze = exp(far.mul(far).negate()).oneMinus()

  material.name         = 'rain'
  material.fragmentNode = vec4(printed(mix(mix(day.cloudShade, day.horizon, PALE), day.horizon, haze)), 1)
  material.fog          = false
  material.side         = THREE.DoubleSide

  return material
}

// perf: cheap — one draw call, two triangles a streak: 4k for five
// showers, on every tier. A `mod`, a `fract`, a cross product and two
// normalisations a vertex; a mix and an `exp` a fragment. Nothing on the CPU.
