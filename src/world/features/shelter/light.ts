// src/world/features/shelter/light.ts
import * as THREE from 'three'

import { PALETTE } from '../../shared/palette.ts'
import { LAMP } from './plan.ts'


/** How much brighter than its colour the flame is: enough to stay a light after the tone curve. */
const FLAME = 2.4

/** The lamp's light on what is near it: how strong, how far it reaches, and how much it wavers. */
const GLOW    = 5
const REACH   = 11
const FLICKER = 0.09

/**
 * What the dark adds to it. The flame is the same flame, but an eye that has
 * opened to the night sees it further and brighter, and the picture is drawn
 * for that eye: at night the lamp is this many times as strong, and reaches
 * this much further.
 */
const DARK_GAIN  = 2.6
const DARK_REACH = 15

const WARM = new THREE.Color(PALETTE.lamp)

/**
 * The lamp hung in the doorway, as one unlit geometry in the shelter's own
 * frame: a flame, and so not a surface the sun describes. The colour is the
 * palette's `lamp`, the amber of a flame, and nothing else in the world has
 * it but the other fires somebody lit.
 *
 * The doorway and the window are no longer painted on: they are open, and
 * what shows in them is the room and its fire (`features/hearth`).
 */
export function createLightGeometry (): THREE.BufferGeometry {
  const flame = WARM.clone().multiplyScalar(FLAME)
  const light = new THREE.OctahedronGeometry(0.2).toNonIndexed()
  const count = light.getAttribute('position').count
  const paint = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1)
    flame.toArray(paint, index * 3)

  light.setAttribute('color', new THREE.BufferAttribute(paint, 3))
  light.deleteAttribute('uv')
  light.deleteAttribute('normal')
  light.scale(1, 1.5, 1).translate(...LAMP)
  light.computeBoundingBox()
  light.computeBoundingSphere()

  return light
}

/** The lamp's light itself, at the lamp: warm, short of reach, and casting no shadow. */
export function createLamp (): THREE.PointLight {
  const lamp = new THREE.PointLight(WARM, GLOW, REACH, 2)

  // Out from the doorway by the depth of the wall, so it lights the stones
  // of the door's own gable and the ground before it, not only the jambs.
  lamp.position.set(LAMP[0], LAMP[1] - 0.3, LAMP[2] + 1.1)
  lamp.name = 'shelter-lamp'

  return lamp
}

/** How bright the lamp burns at `time` seconds, by day (`night` 0) or in the dark (1): a flame, so never quite steady. */
export function lampGlow (time: number, night: number): number {
  return GLOW * (1 + (DARK_GAIN - 1) * night) * (1 + FLICKER * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1.7))
}

/** How far its light reaches, by day or in the dark. */
export function lampReach (night: number): number {
  return REACH + DARK_REACH * night
}

// perf: cheap — one unlit draw call of 8 triangles, and one point light with
// no shadow, which every lit material pays a few instructions a fragment for.
