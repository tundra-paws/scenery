// src/world/features/terrain/wet.ts
import { materialRoughness, mix, positionWorld, smoothstep } from 'three/tsl'
import type { Node } from 'three/webgpu'

import type { LitMaterial } from '../../shared/lit.ts'
import { heldFloat } from '../../shared/nodes.ts'
import type { Held } from '../../shared/nodes.ts'
import { swellNode } from '../../shared/swell.ts'
import type { Wind } from '../../shared/wind.ts'


/** How high over the water the sand stays wet when the sea is level, and how much higher each unit of swell sends the wash. */
const WET   = 0.42
const SWASH = 2.6

/** What the water does to the sand: how much darker it is, and how smooth, so a low light catches it. */
const DARK  = 0.58
const GLOSS = 0.32

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

// perf: cheap — two sines a fragment of land, and nothing else; the land's
// draw call and its triangles are unchanged.
