// src/world/shared/cloud-shadow.ts
import * as THREE from 'three'

import { amendShader, insertAfter } from './amend.ts'
import { WEATHER_SPAN, WIND_GLSL } from './wind.ts'
import type { Wind } from './wind.ts'


/** World height the clouds' flat undersides ride at, give or take. */
export const CLOUD_BASE = 120

/** How much of the sun a cloud takes from what is under it, and how much of the sky's light goes with it. */
const SHADE = 0.68
const GLOOM = 0.22

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
 * The lookup for a shader, to go after `WIND_GLSL`: `cloudShadowUv` in a
 * vertex shader (it is linear in position, so it interpolates exactly) and
 * `cloudLight` in the fragment shader.
 */
export const CLOUD_SHADOW_GLSL = /* glsl */ `
  uniform sampler2D uCloudShadow;
  uniform vec2      uCloudSlant;
  uniform float     uCloudShade;

  // Where in the picture of the sky to look for a point in the world: up the
  // light's ray to the height the clouds ride at, then back to where the air
  // that is there now started from.
  vec2 cloudShadowUv (vec3 at) {
    vec2 under = at.xz + uCloudSlant * (${CLOUD_BASE.toFixed(1)} - at.y);

    return (under - uWindDrift) / WEATHER_SPAN + 0.5;
  }

  // How much of the light gets through: 1 in the open, less under a cloud.
  float cloudLight (vec2 uv) {
    return 1.0 - uCloudShade * smoothstep(${RIM[0]}, ${RIM[1]}, texture2D(uCloudShadow, uv).r);
  }
`

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
}

/** A round thing in the sky that blocks the light: where it is before the wind has moved it, and how wide. */
export interface Blot {
  x:      number
  z:      number
  radius: number
}

/** The part of the world a material needs to be shaded by the clouds. */
interface Air {
  wind:   Wind
  clouds: CloudShadow
}

export function createCloudShadow (): CloudShadow {
  const uniforms = {
    uCloudShadow: { value: null },
    uCloudSlant:  { value: new THREE.Vector2() },
    uCloudShade:  { value: SHADE },
  }

  return {
    uniforms,

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

/**
 * Let the clouds shade a built-in lit material.
 *
 * The light's own share is dimmed after three has added it up, and a little of
 * the sky's with it, or a shadow on a slope already turned from the sun would
 * not show. What the shadow map says is left as it was.
 */
export function shadeUnderClouds (material: THREE.Material, { wind, clouds }: Air): void {
  amendShader(material, 'cloud-shadow', shader => {
    Object.assign(shader.uniforms, wind.uniforms, clouds.uniforms)

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', `${WIND_GLSL}${CLOUD_SHADOW_GLSL}varying vec2 vCloudUv;`),
      '#include <project_vertex>',
      /* glsl */ `
        vec4 cloudAt = vec4(transformed, 1.0);

        #ifdef USE_INSTANCING
          cloudAt = instanceMatrix * cloudAt;
        #endif

        vCloudUv = cloudShadowUv((modelMatrix * cloudAt).xyz);
      `,
    )

    shader.fragmentShader = insertAfter(
      insertAfter(shader.fragmentShader, '#include <common>', `${WIND_GLSL}${CLOUD_SHADOW_GLSL}varying vec2 vCloudUv;`),
      '#include <lights_fragment_end>',
      /* glsl */ `
        float cloudLit = cloudLight(vCloudUv);

        reflectedLight.directDiffuse   *= cloudLit;
        reflectedLight.directSpecular  *= cloudLit;
        reflectedLight.indirectDiffuse *= mix(1.0, cloudLit, ${GLOOM});
      `,
    )
  })
}

// perf: cheap — one single-channel texture (64 KB on the mobile tier, 256 KB
// above it), painted once, and one lookup a fragment in each material that
// reads it. Two uniforms a step: the wind's drift moves it and the light's
// slant leans it.
