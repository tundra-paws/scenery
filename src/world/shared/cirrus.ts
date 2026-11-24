// src/world/shared/cirrus.ts
import { dot, floor, fract, max, mix, pow, sin, smoothstep, vec2, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { ALOFT } from './wind.ts'

/**
 * How high the high cloud is laid, in world units over the sea. Only the
 * ratio to its features' sizes matters to the eye: it is drawn on the dome,
 * as far off as the sky, and never comes nearer as the camera moves.
 */
const HEIGHT = 900

/** A ripple's spacing across the wind, and a streak's length along it, in world units on that layer. */
const RIPPLE = 90
const STREAK = 1100

/** How much of the sky it covers, and how thick it is where it does: never more than a veil. */
const COVER   = 0.06
const OPACITY = 0.75

/** A number from 0 to 1 for a cell of the layer, the same every time. */
function hashAt (at: Node<'vec2'>): Node<'float'> {
  const p = fract(vec3(at.x, at.y, at.x).mul(0.1031))
  const q = p.add(dot(p, p.yzx.add(33.33)))

  return fract(q.x.add(q.y).mul(q.z))
}

/** Value noise: the cells' numbers, eased between. */
function noiseAt (at: Node<'vec2'>): Node<'float'> {
  const cell = floor(at)
  const part = fract(at)
  const ease = part.mul(part).mul(part.mul(-2).add(3))

  return mix(
    mix(hashAt(cell), hashAt(cell.add(vec2(1, 0))), ease.x),
    mix(hashAt(cell.add(vec2(0, 1))), hashAt(cell.add(vec2(1, 1))), ease.x),
    ease.y,
  )
}

/**
 * The high cloud: a thin layer combed into streaks by the wind aloft, and
 * rippled across them, a mackerel sky. How much of the sky toward
 * `direction` it veils, from 0 to `OPACITY`; `aloft` is how far the air up
 * there has moved (`world.wind.nodes.aloft`).
 *
 * It lies on the dome, so it costs no draw call and no triangle: the sky and
 * the stars both ask it, the sky to draw it and the stars to be dimmed by it.
 */
export function cirrusCover (direction: Node<'vec3'>, aloft: Node<'vec2'>): Node<'float'> {
  // Where this way meets the layer, carried by the wind aloft, and turned
  // into its frame: along the streaks, and across them. Under the horizon
  // there is none, and the thinning below takes it there before this could.
  const at     = direction.xz.div(max(direction.y, 0).add(0.06)).mul(HEIGHT)
    .sub(aloft)
  const combed = vec2(dot(at, vec2(ALOFT[0], ALOFT[1])), dot(at, vec2(-ALOFT[1], ALOFT[0])))

  // Long bands of it, and the bands broken across into a fish's scales.
  const bands  = noiseAt(combed.div(vec2(STREAK, RIPPLE * 4))).mul(0.65)
    .add(noiseAt(combed.div(vec2(STREAK * 0.45, RIPPLE * 1.7)).add(17)).mul(0.35))
  const ripple = sin(combed.y.div(RIPPLE).mul(6.2832)
    .add(noiseAt(combed.div(RIPPLE * 2.5)).mul(6))).mul(0.5)
    .add(0.5)
  const lumps  = noiseAt(combed.div(vec2(RIPPLE * 0.9, RIPPLE * 0.6)).add(5))
  const scales = smoothstep(0.25, 0.85, ripple).mul(smoothstep(0.2, 0.7, lumps))
  const cover  = smoothstep(0.5 - COVER, 0.78 - COVER, bands).mul(mix(0.3, 1, scales))

  // Thinned toward the horizon, where its ripples would crowd into noise,
  // and the haze would take it anyway.
  return cover.mul(smoothstep(0.03, 0.22, direction.y)).mul(OPACITY)
}

/**
 * Its colour: the low cloud's own two, lit side and shaded side, and the lit
 * side nearer the light (`body`). High up it catches the light longer.
 */
export function cirrusColour (direction: Node<'vec3'>, lit: Node<'vec3'>, shade: Node<'vec3'>, body: Node<'vec3'>): Node<'vec3'> {
  const toward = pow(max(dot(direction, body), 0), 3)

  return mix(shade, lit, toward.mul(0.3).add(0.7))
}

// perf: two value noises, and two more for the ripples, a fragment of the
// sky and a vertex of the stars. No draw call, no triangle, no texture.
