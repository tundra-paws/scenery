// src/world/features/environment/stars.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { CIRRUS_GLSL } from '../../shared/cirrus.ts'
import type { DaylightUniforms } from '../../shared/daylight.ts'
import { NIGHT_THINS } from './sky.ts'
import type { WindUniforms } from '../../shared/wind.ts'


/** Distance the stars are drawn at: outside the furthest cloud, inside the camera's far plane. */
const RADIUS = 2000

/** A star's width in pixels, smallest and largest. Most are small. */
const SIZE = [ 1.2, 3.4 ] as const

const VERTEX = /* glsl */ `
  ${CIRRUS_GLSL}

  uniform float uNight;
  uniform float uTime;
  uniform float uPixelRatio;

  // Width in pixels, brightness, and where in its flicker it is.
  attribute vec3 aStar;

  varying float vLight;

  void main () {
    // The mesh turns about the pole with the sky. Where a star is after that
    // is where it is seen: the haze takes the low ones, and the day all.
    vec3  direction = normalize(mat3(modelMatrix) * position);
    float clear     = smoothstep(0.03, 0.3, direction.y);
    float flicker   = 0.82 + 0.18 * sin(uTime * (1.3 + aStar.z) + aStar.z * 40.0);

    // The high cloud hides them as it passes, all but the brightest.
    vLight = uNight * clear * aStar.y * flicker * max(1.0 - 1.4 * cirrusCover(direction) * ${1 - NIGHT_THINS}, 0.0);

    // Around the camera, like the dome. A star with no light is put outside
    // the picture, so by day they cost nothing to fill.
    gl_Position  = vLight > 0.003 ? projectionMatrix * vec4(mat3(viewMatrix) * direction * ${RADIUS.toFixed(1)}, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = aStar.x * uPixelRatio;
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uStar;

  varying float vLight;

  void main () {
    float away = length(gl_PointCoord - 0.5);

    gl_FragColor = vec4(uStar * vLight * smoothstep(0.5, 0.15, away), 1.0);

    #include <colorspace_fragment>
  }
`

/** What the stars are told each step, besides the hour. */
export interface Stars {
  points: THREE.Points

  /** Turn them with the sky, and keep their size in screen pixels. */
  turn (time: number, hour: number, pixelRatio: number): void
  dispose (): void
}

interface StarOptions {
  count:  number
  rng:    SeededRng
  colour: THREE.ColorRepresentation

  /** The axis the sky turns about. */
  pole: THREE.Vector3
  day:  DaylightUniforms

  /** The wind, which carries the high cloud across them. */
  wind: WindUniforms
}

/**
 * The stars: points on the sky all the way round, most of them faint, that
 * turn about the pole with the sun and come out as it goes.
 *
 * One draw call, added to whatever is behind it. They are always in the
 * scene, so the night allocates nothing the day did not: by day every point
 * is moved off the screen in the vertex shader.
 */
export function createStars ({ count, rng, colour, pole, day, wind }: StarOptions): Stars {
  const positions = new Float32Array(count * 3)
  const stars     = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    // Even over the sphere: a height, and a turn about it.
    const y      = rng.range(-1, 1)
    const turn   = rng.range(0, Math.PI * 2)
    const flat   = Math.sqrt(1 - y * y)
    const bright = rng.next() ** 3

    positions.set([ flat * Math.cos(turn), y, flat * Math.sin(turn) ], index * 3)
    stars.set([ THREE.MathUtils.lerp(SIZE[0], SIZE[1], bright), 0.35 + 0.65 * bright, rng.next() ], index * 3)
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aStar', new THREE.BufferAttribute(stars, 3))

  const material = new THREE.ShaderMaterial({
    name:           'stars',
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    transparent:    true,
    depthWrite:     false,
    blending:       THREE.AdditiveBlending,
    fog:            false,

    uniforms: {
      uNight:      day.uNight,
      uWindAloft:  wind.uWindAloft,
      uTime:       { value: 0 },
      uPixelRatio: { value: 1 },
      uStar:       { value: new THREE.Color(colour) },
    },
  })

  const points = new THREE.Points(geometry, material)

  points.name          = 'stars'
  points.frustumCulled = false

  // Before the sea, which is the other see-through thing: the sea then hides
  // whatever of them is under the horizon.
  points.renderOrder = -1

  return {
    points,

    turn (time, hour, pixelRatio) {
      material.uniforms.uTime!.value       = time
      material.uniforms.uPixelRatio!.value = pixelRatio
      points.quaternion.setFromAxisAngle(pole, -hour)
    },

    dispose () {
      geometry.dispose()
      material.dispose()
      points.removeFromParent()
    },
  }
}

// perf: cheap — one draw call of points, a few hundred on a phone and a
// thousand or so above. By day none of them reaches the rasteriser.
