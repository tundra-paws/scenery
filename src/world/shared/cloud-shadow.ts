// src/world/shared/cloud-shadow.ts
import * as THREE from 'three'
import { float, smoothstep, texture, varying } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { heldFloat, heldVec2 } from './nodes.ts'
import { WEATHER_SPAN, createWind } from './wind.ts'
import type { Wind } from './wind.ts'


/** World height the clouds' flat undersides ride at, give or take. */
export const CLOUD_BASE = 120

/** How much of the sun a cloud takes from what is under it, and how much of the sky's light goes with it. */
const SHADE = 0.68

/** How much of the sky's light goes with the sun's under a cloud. */
export const GLOOM = 0.22

/**
 * A blot is painted as a slope, not a disc: full inside `CORE` of its radius,
 * nothing past `EDGE`, and half exactly at its rim. The shader draws the
 * shadow's outline where the picture crosses `RIM`, the way a distance-field
 * font is drawn, so a few texels a cloud still give a clean scalloped edge.
 */
const CORE = 0.3
const EDGE = 1.7
const RIM  = [ 0.42, 0.58 ] as const

/**
 * The furthest a cloud's shadow is laid from under it, as ground covered for
 * each unit the light's ray climbs. A sun on the horizon would throw it clean
 * off the island, and a small turn of the sky would send it racing: the low
 * light comes in under the clouds, and their shadows stay where one of
 * twenty-four degrees would put them.
 */
const REACH = 2.25

/** Strength of the light on the land at which the clouds shade it in full. Under that the shadow thins with the light. */
const FULL = 1.2

/**
 * The shadow of the clouds, as something a material can look up.
 *
 * The clouds never change shape and all move as one with the wind, so their
 * shadow is one picture of the whole sky from above, slid along the ground.
 * The uniform is made with the world and filled by the clouds feature when it
 * builds; every material that reads it shares this one object.
 */
export interface CloudShadow {
  uniforms: {
    uCloudShadow: { value: THREE.Texture | null }

    /** Ground covered for each unit the light's ray climbs, as `[x, z]`. */
    uCloudSlant: { value: THREE.Vector2 }

    /** How much of the light a cloud takes from what is under it. */
    uCloudShade: { value: number }
  }

  /** Lay the shadows where a light from `toward`, this strong, throws them. */
  cast (toward: THREE.Vector3, intensity: number): void

  /** The picture of the sky from above, when the clouds are built; `null` when they are gone. */
  cover (picture: THREE.Texture | null): void

  /**
   * For a node material: how much of the light gets through at a place in
   * the world, 1 in the open and less under a cloud. The lookup is worked
   * out at each vertex (it is linear in position, so it interpolates exactly).
   */
  light (at: Node<'vec3'>): Node<'float'>
}

/** A round thing in the sky that blocks the light: where it is before the wind has moved it, and how wide. */
export interface Blot {
  x:      number
  z:      number
  radius: number
}

export function createCloudShadow (wind: Wind = createWind()): CloudShadow {
  const uniforms: CloudShadow['uniforms'] = {
    uCloudShadow: { value: null },
    uCloudSlant:  { value: new THREE.Vector2() },
    uCloudShade:  { value: SHADE },
  }

  // Until the clouds are built there are none: a clear sky, one texel of it.
  const clear = new THREE.DataTexture(new Uint8Array(1), 1, 1, THREE.RedFormat, THREE.UnsignedByteType)

  clear.needsUpdate = true

  const picture = texture(clear)
  const slant   = heldVec2(uniforms.uCloudSlant)
  const shade   = heldFloat(uniforms.uCloudShade)

  return {
    uniforms,

    cover (baked) {
      uniforms.uCloudShadow.value = baked
      picture.value               = baked ?? clear
    },

    light (at) {
      // Up the light's ray to the height the clouds ride at, then back to
      // where the air that is there now started from.
      const under = at.xz.add(slant.mul(float(CLOUD_BASE).sub(at.y)))
      const uv    = varying(under.sub(wind.nodes.drift).div(WEATHER_SPAN)
        .add(0.5))

      return smoothstep(RIM[0], RIM[1], picture.sample(uv).r).mul(shade)
        .oneMinus()
    },

    cast (toward, intensity) {
      const flat  = Math.hypot(toward.x, toward.z)
      const slant = Math.min(flat / Math.max(toward.y, 0.0001), REACH) / Math.max(flat, 0.0001)

      uniforms.uCloudSlant.value.set(toward.x * slant, toward.z * slant)
      uniforms.uCloudShade.value = SHADE * Math.min(1, intensity / FULL)
    },
  }
}

/**
 * Paint the blots onto a square of `side` texels covering the weather's span:
 * 255 deep inside one, 0 in the open, and half way at a blot's rim.
 *
 * Each blot lands straight under itself, on the plane at `CLOUD_BASE` that
 * `cloudShadowUv` looks things up on: the light moves through the day, so
 * the slant is the lookup's to add and a puff's height over its cloud's flat
 * base is let go. It runs over the edge onto the far side, because the
 * weather repeats.
 */
export function bakeCloudShadow (blots: readonly Blot[], side: number): Uint8Array<ArrayBuffer> {
  const data  = new Uint8Array(side * side)
  const texel = WEATHER_SPAN / side
  const half  = WEATHER_SPAN / 2

  for (const blot of blots) {
    const { x, z } = blot
    const reach    = Math.ceil(blot.radius * EDGE / texel)
    const cx       = Math.floor((x + half) / texel)
    const cz       = Math.floor((z + half) / texel)

    for (let row = cz - reach; row <= cz + reach; row += 1)
      for (let column = cx - reach; column <= cx + reach; column += 1) {
        const away   = Math.hypot((column + 0.5) * texel - half - x, (row + 0.5) * texel - half - z)
        const shade  = Math.round(255 * (1 - (away / blot.radius - CORE) / (EDGE - CORE)))
        const offset = (row % side + side) % side * side + (column % side + side) % side

        data[offset] = Math.max(data[offset]!, Math.min(255, shade))
      }
  }

  return data
}

/** The baked shadow as a texture that repeats, the way the weather does. */
export function createCloudShadowTexture (blots: readonly Blot[], side: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(bakeCloudShadow(blots, side), side, side, THREE.RedFormat, THREE.UnsignedByteType)

  texture.name        = 'cloud-shadow'
  texture.wrapS       = THREE.RepeatWrapping
  texture.wrapT       = THREE.RepeatWrapping
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return texture
}

// perf: cheap — one single-channel texture (64 KB on the mobile tier, 256 KB
// above it), painted once, and one lookup a fragment in each material that
// reads it. Two uniforms a step: the wind's drift moves it and the light's
// slant leans it.
