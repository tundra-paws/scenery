// src/world/features/environment/stars.ts
import * as THREE from 'three'
import { cameraProjectionMatrix, cameraViewMatrix, length, max, modelWorldMatrix, positionGeometry, screenSize, select, sin, smoothstep, uniform, varying, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'
import type { SeededRng } from 'threejs-scenes'

import { cirrusCover } from '../../shared/cirrus.ts'
import type { DaylightNodes } from '../../shared/daylight.ts'
import { heldFloat, vec3Attribute } from '../../shared/nodes.ts'
import { printed } from '../../shared/output.ts'
import type { WindNodes } from '../../shared/wind.ts'
import { NIGHT_THINS } from './sky.ts'


/** Distance the stars are drawn at: outside the furthest cloud, inside the camera's far plane. */
const RADIUS = 2000

/** A star's width in pixels, smallest and largest. Most are small. */
const SIZE = [ 1.2, 3.4 ] as const

/** What the stars are told each step, besides the hour. */
export interface Stars {
  points: THREE.Mesh

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
  day:  DaylightNodes

  /** The wind, which carries the high cloud across them. */
  wind: WindNodes
}

/**
 * The stars: points on the sky all the way round, most of them faint, that
 * turn about the pole with the sun and come out as it goes.
 *
 * One draw call, added to whatever is behind it: a small disc a star,
 * every one an instance of the same triangle, facing the eye and sized in
 * pixels. They are always in the scene, so the night allocates nothing
 * the day did not: by day every star is moved off the screen in the vertex
 * shader.
 */
export function createStars ({ count, rng, colour, pole, day, wind }: StarOptions): Stars {
  const places = new Float32Array(count * 3)
  const stars  = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    // Even over the sphere: a height, and a turn about it.
    const y      = rng.range(-1, 1)
    const turn   = rng.range(0, Math.PI * 2)
    const flat   = Math.sqrt(1 - y * y)
    const bright = rng.next() ** 3

    places.set([ flat * Math.cos(turn), y, flat * Math.sin(turn) ], index * 3)
    stars.set([ THREE.MathUtils.lerp(SIZE[0], SIZE[1], bright), 0.35 + 0.65 * bright, rng.next() ], index * 3)
  }

  const geometry = new THREE.InstancedBufferGeometry()

  // One triangle a star, big enough to hold the square its disc is drawn in:
  // half the triangles two would be, and the corners beyond the square are
  // dark anyway.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([ -0.5, -0.5, 0, 1.5, -0.5, 0, -0.5, 1.5, 0 ], 3))
  geometry.setAttribute('aPlace', new THREE.InstancedBufferAttribute(places, 3))
  geometry.setAttribute('aStar', new THREE.InstancedBufferAttribute(stars, 3))
  geometry.instanceCount = count

  const time       = { value: 0 }
  const pixelRatio = { value: 1 }
  const material   = new NodeMaterial()

  // Width in pixels, brightness, and where in its flicker it is.
  const star = vec3Attribute('aStar')

  // The mesh turns about the pole with the sky. Where a star is after that
  // is where it is seen: the haze takes the low ones, and the day all.
  const direction = modelWorldMatrix.mul(vec4(vec3Attribute('aPlace'), 0)).xyz.normalize()
  const clear     = smoothstep(0.03, 0.3, direction.y)
  const flicker   = sin(heldFloat(time).mul(star.z.add(1.3))
    .add(star.z.mul(40))).mul(0.18)
    .add(0.82)

  // The high cloud hides them as it passes, all but the brightest.
  const light = varying(day.night.mul(clear).mul(star.y)
    .mul(flicker)
    .mul(max(cirrusCover(direction, wind.aloft).mul(-1.4 * (1 - NIGHT_THINS))
      .add(1), 0)))

  // Around the camera, like the dome, and its corner so many pixels out
  // from its middle. A star with no light is put outside the picture, so by
  // day they cost nothing to fill.
  const middle = cameraProjectionMatrix.mul(vec4(cameraViewMatrix.mul(vec4(direction.mul(RADIUS), 0)).xyz, 1))
  const corner = positionGeometry.xy.mul(star.x).mul(heldFloat(pixelRatio))
    .mul(2)
    .div(screenSize)
    .mul(middle.w)

  material.name         = 'stars'
  material.vertexNode   = select(light.greaterThan(0.003), vec4(middle.xy.add(corner), middle.zw), vec4(2, 2, 2, 1))
  material.fragmentNode = vec4(printed(uniform(new THREE.Color(colour)).mul(light)
    .mul(smoothstep(0.5, 0.15, length(varying(positionGeometry.xy))))), 1)
  material.transparent = true
  material.depthWrite  = false
  material.blending    = THREE.AdditiveBlending
  material.fog         = false

  const points = new THREE.Mesh(geometry, material)

  points.name          = 'stars'
  points.frustumCulled = false

  // Before the sea, which is the other see-through thing: the sea then hides
  // whatever of them is under the horizon.
  points.renderOrder = -1

  return {
    points,

    turn (now, hour, ratio) {
      time.value       = now
      pixelRatio.value = ratio
      points.quaternion.setFromAxisAngle(pole, -hour)
    },

    dispose () {
      geometry.dispose()
      material.dispose()
      points.removeFromParent()
    },
  }
}

// perf: cheap — one draw call of one triangle a star, a few hundred stars on
// a phone and a thousand or so above. By day none of them reaches the rasteriser.
