// src/world/features/shelter/light.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import { PALETTE } from '../../shared/palette.ts'
import { DOOR_HALF, DOOR_TOP, HALF_DEEP, HALF_LONG, INSET, LAMP, WINDOW } from './plan.ts'


/** How far in front of the dark behind the stones an opening's own dark is hung, so the two never fight. */
const PROUD = 0.04

/** How much brighter than its colour the flame is: enough to stay a light after the tone curve. */
const FLAME = 2.4

/** How much of that the window shows: a fire seen across a room. */
const HEARTH = 0.4

/** The lamp's light on what is near it: how strong, how far it reaches, and how much it wavers. */
const GLOW    = 5
const REACH   = 11
const FLICKER = 0.09

const WARM = new THREE.Color(PALETTE.lamp)

/** The dark of a doorway with a fire somewhere behind it: no light of its own to speak of, and what there is, warm. */
const WITHIN = new THREE.Color(PALETTE.lamp).multiplyScalar(0.035)

/** A flat sheet of one colour, standing where `place` puts it. */
function sheet (width: number, height: number, colour: THREE.Color, place: (sheet: THREE.BufferGeometry) => void): THREE.BufferGeometry {
  return solid(new THREE.PlaneGeometry(width, height), colour, place)
}

/** A geometry painted one colour, without the attributes an unlit material does not read. */
function solid (geometry: THREE.BufferGeometry, colour: THREE.Color, place: (geometry: THREE.BufferGeometry) => void): THREE.BufferGeometry {
  const plain   = geometry.index ? geometry.toNonIndexed() : geometry
  const count   = plain.getAttribute('position').count
  const colours = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1)
    colour.toArray(colours, index * 3)

  plain.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  plain.deleteAttribute('uv')
  plain.deleteAttribute('normal')
  place(plain)

  if (plain !== geometry)
    geometry.dispose()

  return plain
}

/**
 * What in the shelter is light or the want of it, as one unlit geometry in
 * the shelter's own frame: the dark of the doorway, the lamp hung in it, and
 * the window with the fire behind it.
 *
 * Unlit, because none of it is a surface the sun describes. The colour is the
 * palette's `lamp`, the amber of a flame, and nothing else in the world has it.
 */
export function createLightGeometry (): THREE.BufferGeometry {
  const wide  = WINDOW.to - WINDOW.from
  const tall  = WINDOW.head - WINDOW.sill
  const flame = WARM.clone().multiplyScalar(FLAME)

  const parts = [
    sheet(DOOR_HALF * 2 + 0.7, DOOR_TOP + 0.6, WITHIN, door => door.translate(0, DOOR_TOP / 2 - 0.2, HALF_LONG - INSET + PROUD)),
    sheet(wide + 0.6, tall + 0.5, flame.clone().multiplyScalar(HEARTH), pane => pane.rotateY(Math.PI / 2).translate(HALF_DEEP - INSET + PROUD, (WINDOW.sill + WINDOW.head) / 2, (WINDOW.from + WINDOW.to) / 2)),
    sheet(0.12, tall + 0.5, WITHIN, bar => bar.rotateY(Math.PI / 2).translate(HALF_DEEP - INSET + PROUD * 2, (WINDOW.sill + WINDOW.head) / 2, (WINDOW.from + WINDOW.to) / 2)),
    solid(new THREE.OctahedronGeometry(0.2), flame, lamp => lamp.scale(1, 1.5, 1).translate(...LAMP)),
  ]

  const light = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

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

/** How bright the lamp burns at `time` seconds: a flame, so never quite steady. */
export function lampGlow (time: number): number {
  return GLOW * (1 + FLICKER * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1.7))
}

// perf: cheap — one unlit draw call of 14 triangles, and one point light with
// no shadow, which every lit material pays a few instructions a fragment for.
