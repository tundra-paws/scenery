// src/world/features/terrain/wet.ts
import { fwidth, materialRoughness, max, mix, mx_noise_float, positionWorld, smoothstep, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'

import type { DaylightNodes } from '../../shared/daylight.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { heldFloat, vec4Attribute } from '../../shared/nodes.ts'
import type { Held } from '../../shared/nodes.ts'
import { swellNode } from '../../shared/swell.ts'
import type { Weather } from '../../shared/weather.ts'
import type { Wind } from '../../shared/wind.ts'


/** How high over the water the sand stays wet when the sea is level, and how much higher each unit of swell sends the wash. */
const WET   = 0.42
const SWASH = 2.6

/** What the water does to the sand: how much darker it is, and how smooth, so a low light catches it. */
const DARK  = 0.58
const GLOSS = 0.32

/**
 * Puddles: the pitch of the noise they lie in (a few paces across), the
 * slope of the land (as `aLand.y`) from which they thin and past which
 * none stands, how much a slope shrinks them, and how much of the path
 * they cover when it is soaked and when it is drying: they shrink to the
 * deepest hollows first, and are gone a while before the land is dry.
 */
const PUDDLE = 0.32
const LEVEL  = [ 0.1, 0.3 ] as const
const SHED   = 0.9
const COVER  = [ 1.02, 0.58 ] as const

/** How much of a wet stone's sheen the land has where it is grown over: the turf and the heather break the film up. */
const TURF_FILM = 0.16

/** And where it is the bare path: trodden earth holds more of a film than turf, and less than stone. */
const PATH_FILM = 0.42

/** The clock the wash keeps: the world's time, set each step. */
export interface WetShore {
  time: Held<number>
}

/**
 * Wet the foot of the land: the sand the sea has just run back off is darker
 * and has a sheen, up to a line that climbs the beach as a back of the swell
 * comes ashore and falls back as it goes (`swell.ts`, the same swell the sea
 * draws and the boat rides). Rock at the waterline is wet the same way.
 */
export function wetTheShore (material: LitMaterial, wind: Wind, level: number): WetShore {
  const time  = { value: 0 }
  const swash = swellNode(wind.direction, positionWorld.xz, heldFloat(time)).x.mul(SWASH).add(WET)
  const wet   = smoothstep(swash.sub(0.1), swash, positionWorld.y.sub(level)).oneMinus()

  material.dye(colour => colour.mul(mix(1, DARK, wet)))
  material.roughnessNode = mix(materialRoughness as unknown as Node<'float'>, GLOSS, wet)

  return { time }
}

/**
 * Let the rain at the land: it darkens and shines as the island wets
 * (`shared/lit.ts`), and on the bare path, where it is near level, the
 * water stands in puddles that give back the sky. They lie in the noise's
 * hollows and shrink into them as the land dries. Where the land is grown
 * over (all but its rock, `bare`, and the path) it shines less.
 */
export function poolTheRain (material: LitMaterial, weather: Weather, day: DaylightNodes, onPath: Node<'float'>, bare: Node<'float'>): void {
  const wet    = weather.nodes.wet
  const slope  = vec4Attribute('aLand').y
  const level  = smoothstep(LEVEL[1], LEVEL[0], slope)
  const hollow = mx_noise_float(vec3(positionWorld.x, 0, positionWorld.z).mul(PUDDLE)).mul(0.5)
    .add(0.5)
  const brim   = mix(COVER[0], COVER[1], wet).add(slope.mul(SHED))
  const edge   = max(fwidth(hollow), 0.012)
  const pooled = smoothstep(brim, brim.add(edge), hollow).mul(level)
    .mul(onPath)

  material.wets(wet, day, pooled, mix(mix(TURF_FILM, PATH_FILM, onPath), 1, bare))
}

// perf: cheap — two sines a fragment of land for the wash, and one noise
// for the puddles; the land's draw call and its triangles are unchanged.
