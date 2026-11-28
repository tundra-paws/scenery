// src/world/features/terrain/wet.ts
import { fwidth, materialRoughness, max, mix, mx_noise_float, positionWorld, smoothstep, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'

import type { DaylightNodes } from '../../shared/daylight.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { heldFloat, vec4Attribute } from '../../shared/nodes.ts'
import type { Held } from '../../shared/nodes.ts'
import { swellNode } from '../../shared/swell.ts'
import { RANGE } from '../../shared/tide.ts'
import type { Tide } from '../../shared/tide.ts'
import type { Weather } from '../../shared/weather.ts'
import type { Wind } from '../../shared/wind.ts'


/** How high over the water the sand stays wet when the sea is level, and how much higher each unit of swell sends the wash. */
const WET   = 0.42
const SWASH = 2.6

/** What the water does to the sand: how much darker it is, and how smooth, so a low light catches it. */
const DARK  = 0.58
const GLOSS = 0.32

/**
 * What the ebb leaves: the height over high water between which the last
 * tide's mark lies, how wet the top of the strand still is against its
 * foot, where the sea has only just gone from, and how much darker sand
 * the tide has been over is than sand it never reaches.
 */
const MARK    = [ 0.18, 0.4 ] as const
const DRAINED = 0.55
const STAINED = 0.78

/**
 * Water left standing on the strand, in the hollows of the same noise the
 * puddles lie in: how much of it the foot of the strand holds and how much
 * its top, and the slope (as `aLand.y`) from which it thins and past which
 * none stands. A beach is steeper than a path, and what lies on it is a
 * sheet running back, so it is let lie on more of a slope than rain is.
 */
const SHEET  = [ 0.56, 0.92 ] as const
const SLOPED = [ 0.07, 0.16 ] as const

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

/** The shore's wet: the clock its wash keeps, and how wet the tide has left each fragment of the strand. */
export interface WetShore {

  /** The world's time, set each step. */
  time: Held<number>

  /** How wet the sea has left the land here, 0 to 1: all of it in the wash, less up the strand, nothing over the tide's mark. */
  strand: Node<'float'>
}

/**
 * Wet the foot of the land: the sand the sea has just run back off is darker
 * and has a sheen, up to a line that climbs the beach as a back of the swell
 * comes ashore and falls back as it goes (`swell.ts`, the same swell the sea
 * draws and the boat rides). Rock at the waterline is wet the same way.
 *
 * And the tide: the wash goes down the beach with it, and what it leaves
 * bare stays wet behind it, from the last high water's mark down, wettest
 * where the sea has only just gone. `strand` says how wet, for the rain's
 * own film and puddles to be laid over (`poolTheRain`).
 */
export function wetTheShore (material: LitMaterial, wind: Wind, tide: Tide): WetShore {
  const time    = { value: 0 }
  const above   = positionWorld.y.sub(tide.nodes.level)
  const swash   = swellNode(wind.direction, positionWorld.xz, heldFloat(time)).x.mul(SWASH).add(WET)
  const wash    = smoothstep(swash.sub(0.1), swash, above).oneMinus()
  const tidal   = smoothstep(MARK[0], MARK[1], positionWorld.y.sub(tide.high)).oneMinus()
  const drained = tidal.mul(mix(1, DRAINED, smoothstep(0, RANGE, above)))

  material.dye(colour => colour.mul(mix(1, STAINED, tidal)).mul(mix(1, DARK, wash)))
  material.roughnessNode = mix(materialRoughness as unknown as Node<'float'>, GLOSS, wash)

  return { time, strand: max(wash, drained) }
}

/**
 * Let the rain at the land: it darkens and shines as the island wets
 * (`shared/lit.ts`), and on the bare path, where it is near level, the
 * water stands in puddles that give back the sky. They lie in the noise's
 * hollows and shrink into them as the land dries. Where the land is grown
 * over (all but its rock, `bare`, and the path) it shines less.
 *
 * The sea wets it the same way: where the tide has been (`strand`) the land
 * is as wet as that says whatever the weather, holds a full film, and keeps
 * a sheet of water in its hollows, more of it nearer the sea.
 */
export function poolTheRain (material: LitMaterial, weather: Weather, day: DaylightNodes, onPath: Node<'float'>, bare: Node<'float'>, strand: Node<'float'>): void {
  const wet    = weather.nodes.wet
  const slope  = vec4Attribute('aLand').y
  const level  = smoothstep(LEVEL[1], LEVEL[0], slope)
  const hollow = mx_noise_float(vec3(positionWorld.x, 0, positionWorld.z).mul(PUDDLE)).mul(0.5)
    .add(0.5)
  const brim   = mix(COVER[0], COVER[1], wet).add(slope.mul(SHED))
  const edge   = max(fwidth(hollow), 0.012)
  const pooled = smoothstep(brim, brim.add(edge), hollow).mul(level)
    .mul(onPath)
  const shore = mix(SHEET[1], SHEET[0], strand)
  const sheet = smoothstep(shore, shore.add(edge), hollow.add(strand.mul(0.3))).mul(smoothstep(SLOPED[1], SLOPED[0], slope))
    .mul(smoothstep(0.3, 0.5, strand))

  material.wets(max(wet, strand), day, max(pooled, sheet), max(mix(mix(TURF_FILM, PATH_FILM, onPath), 1, bare), strand))
}

// perf: cheap — two sines a fragment of land for the wash, and one noise
// for the puddles and the strand's sheet; the land's draw call and its
// triangles are unchanged.
