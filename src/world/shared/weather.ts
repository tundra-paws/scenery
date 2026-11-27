// src/world/shared/weather.ts
import * as THREE from 'three'
import { float, max, smoothstep, vec2 } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { heldFloat, heldVec4 } from './nodes.ts'
import type { Held } from './nodes.ts'
import { WEATHER_SPAN } from './wind.ts'
import type { Wind } from './wind.ts'


/** The most showers the sky holds: one uniform each, so a shader's loop over them is unrolled. */
export const MOST_SHOWERS = 6

/** How far out from the island's middle its land goes, give or take: the ground a shower must cross to wet it. */
const ISLAND = 100

/**
 * How the land takes rain and gives it up: how many seconds of a shower's
 * full rain soak it through (to two thirds), and how many seconds it keeps
 * two thirds of its wet once the rain is gone. A shower crosses the island in
 * half a minute; the land is dry again some four minutes after.
 */
const SOAK = 9
const DRY  = 80

/** How far back the land remembers rain, in seconds, and how finely: past five dryings nothing is left. */
const MEMORY = DRY * 5
const TICK   = 1.5

/** A shower as the weather knows it: where it is at home on the weather's square, and half the length and width of the ground its rain falls on. */
export interface Downpour {
  x:     number
  z:     number
  reach: readonly [number, number]
}

/**
 * The rain: where the showers are, and how wet the island is from those that
 * have crossed it.
 *
 * Like the wind and the hour it is one signal, written once a step, that
 * everything which can be rained on reads: the land darkens and shines, the
 * stones glisten, the path holds puddles of sky, the burn runs full, and the
 * sea is pocked under each shower as it goes over. Nothing in it but the
 * time, and the wind that carries the showers.
 */
export interface Weather {

  /** How wet the island is, 0 bone dry to 1 soaked: written each step. */
  readonly wet: Held<number>

  /** Each shower where it is now, wrapped to the square round the island: `[x, z, half its length, half its width]`, the rest zero. */
  readonly showers: readonly Held<THREE.Vector4>[]

  /** What a shader reads. */
  readonly nodes: WeatherNodes

  /** Tell the weather which clouds rain. The clouds feature does, when it builds. */
  fall (showers: readonly Downpour[]): void

  /** How wet the island is at `time` seconds. */
  wetAt (time: number): number

  /** How much rain is falling on the island at `time`: 0 to about 1. */
  rainAt (time: number): number

  /** Put the showers where they are at `time`, and the island's wet with them. */
  step (time: number): void
}

export interface WeatherNodes {
  wet: Node<'float'>

  /** How hard it is raining at a place on the sea or the land (`xz`): 1 under the middle of a shower, 0 clear of every one. */
  rainOn (at: Node<'vec2'>): Node<'float'>
}

/** A place brought back onto the weather's square, centred on the island. */
function wrapped (value: number): number {
  return ((value + WEATHER_SPAN / 2) % WEATHER_SPAN + WEATHER_SPAN) % WEATHER_SPAN - WEATHER_SPAN / 2
}

export function createWeather (wind: Wind): Weather {
  const wet        = { value: 0 }
  const showers    = Array.from({ length: MOST_SHOWERS }, () => ({ value: new THREE.Vector4() }))
  const [ ax, az ] = wind.direction

  let falling: readonly Downpour[] = []

  /** How much of a shower's rain lands on the island at `time`: all of it with its middle over the land, none once it is its own length clear. */
  const rainAt = (time: number): number => {
    const [ dx, dz ] = wind.driftAt(time)

    let sum = 0

    for (const shower of falling) {
      const x     = wrapped(shower.x + dx)
      const z     = wrapped(shower.z + dz)
      const along = Math.abs(x * ax + z * az)
      const aside = Math.abs(z * ax - x * az)
      const over  = Math.max(0, 1 - Math.max(0, along - ISLAND) / shower.reach[0]) * Math.max(0, 1 - Math.max(0, aside - ISLAND) / (shower.reach[1] * 2))

      sum += over * over * (3 - 2 * over)
    }

    return Math.min(sum, 1)
  }

  const wetAt = (time: number): number => {
    let soaked = 0

    for (let ago = 0; ago < MEMORY; ago += TICK)
      soaked += rainAt(time - ago) * Math.exp(-ago / DRY) * TICK

    return 1 - Math.exp(-soaked / SOAK)
  }

  const held = showers.map(shower => heldVec4(shower))

  return {
    wet,
    showers,

    nodes: {
      wet: heldFloat(wet),

      rainOn (at) {
        let sum: Node<'float'> = float(0)

        for (const shower of held) {
          const off   = at.sub(shower.xy)
          const along = off.dot(vec2(ax, az)).div(max(shower.z, 0.001))
          const aside = off.dot(vec2(-az, ax)).div(max(shower.w, 0.001))

          sum = sum.add(smoothstep(1, 0.55, along.mul(along).add(aside.mul(aside))
            .sqrt()).mul(shower.z.greaterThan(0).select(1, 0)))
        }

        return sum.min(1)
      },
    },

    fall (downpours) {
      falling = downpours.slice(0, MOST_SHOWERS)
    },

    wetAt,
    rainAt,

    step (time) {
      const [ dx, dz ] = wind.driftAt(time)

      showers.forEach((shower, index) => {
        const downpour = falling[index]

        if (downpour)
          shower.value.set(wrapped(downpour.x + dx), wrapped(downpour.z + dz), downpour.reach[0], downpour.reach[1])
        else
          shower.value.set(0, 0, 0, 0)
      })

      wet.value = wetAt(time)
    },
  }
}

// perf: trivial on the GPU — one uniform for the wet, one vec4 a shower. On
// the CPU a step adds up some 270 moments of rain over at most six showers:
// a few thousand multiplies.
