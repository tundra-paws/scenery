// src/world/features/pier/beacon.ts
import * as THREE from 'three'

import { elevationAt } from '../../shared/daylight.ts'
import { createUnlitMaterial } from '../../shared/lit.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { World } from '../../world.ts'
import { LANTERN } from './plan.ts'
import type { Tower } from './tower.ts'

/**
 * The sun's height, in degrees, at which the lamp is lit in the evening and
 * put out in the morning, and how many degrees it takes to come up to its
 * full light: somebody trims the wick and turns it up.
 */
const LIT_AT = 1.2
const RAMP   = 1.4

/** How much brighter than its colour the glazing is when it is lit: the shelter's flame, seen through glass. */
const FLAME = 2.1

/** How far outside the glass the lit panes are hung, so the two never fight; inside the bars. */
const PROUD = 0.012

/**
 * The lamp's light on the pier, the boats and the water: how strong, how
 * far it reaches, how much it wavers, and what the dark adds to it (as the
 * shelter's lamp: the eye has opened).
 */
const GLOW       = 7
const REACH      = 16
const FLICKER    = 0.04
const DARK_GAIN  = 2.2
const DARK_REACH = 14

const WARM = new THREE.Color(PALETTE.lamp)

/** The light at the pier's head as it is drawn: the glazing when the lamp is lit, and the lamp's light. */
export interface Beacon {
  panes: THREE.Mesh
  lamp:  THREE.PointLight

  /** Light it, or put it out, for `time` seconds. */
  burn (time: number, night: number): void
  dispose (): void
}

/** How far up the lamp is turned at `time`: nothing by day, all of it from a little after sunset to a little before sunrise. */
export function lampLevel (time: number): number {
  return THREE.MathUtils.clamp((LIT_AT - elevationAt(time)) / RAMP, 0, 1)
}

/** The glazing, lit: eight panes of the lamp's amber just outside the glass, painted with the shelter's flame so the two are one program. */
function createPanes (): THREE.BufferGeometry {
  const panes   = new THREE.CylinderGeometry(LANTERN.radius + PROUD, LANTERN.radius + PROUD, LANTERN.glazed - 0.06, 8, 1, true).toNonIndexed()
  const count   = panes.getAttribute('position').count
  const colours = new Float32Array(count * 3)
  const flame   = WARM.clone().multiplyScalar(FLAME)

  for (let index = 0; index < count; index += 1)
    flame.toArray(colours, index * 3)

  panes.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  panes.deleteAttribute('uv')
  panes.deleteAttribute('normal')

  return panes
}

/**
 * The light at the pier's head: lit at sunset and burning till sunrise, so
 * a boat coming in after dark finds the landing. Somebody lights it, and is
 * never seen doing it. The glazing goes the lamp's amber, the one warm note
 * that is somebody's, and the lamp's light falls on the tower's own head,
 * the deck, the small boat in the lee and the water round them; the sea
 * gives it back.
 */
export function createBeacon (world: World, tower: Tower): Beacon {
  const material = createUnlitMaterial(world, { name: 'pier-light', vertexColors: true })
  const panes    = new THREE.Mesh(createPanes(), material)
  const lamp     = new THREE.PointLight(WARM, 0, REACH, 2)

  panes.name = 'pier-light'
  panes.position.set(tower.x, tower.glass + LANTERN.glazed / 2, tower.z)
  panes.visible = false

  // In the lantern: it throws no shadow, so the bars and the roof keep none of it from the deck.
  lamp.name = 'pier-lamp'
  lamp.position.copy(tower.lamp)

  return {
    panes,
    lamp,

    burn (time, night) {
      const level = lampLevel(time)
      const waver = 1 + FLICKER * Math.sin(time * 5.1) * Math.sin(time * 2.3 + 0.6)

      panes.visible = level > 0
      material.color.setScalar(level * waver)
      lamp.intensity = GLOW * level * waver * (1 + (DARK_GAIN - 1) * night)
      lamp.distance  = REACH + DARK_REACH * night

      world.wash.shine(tower.lamp.x, tower.lamp.y, tower.lamp.z, level * waver)
    },

    dispose () {
      panes.geometry.dispose()
      material.dispose()
      panes.removeFromParent()
      lamp.dispose()
      lamp.removeFromParent()
    },
  }
}

// perf: cheap — by day nothing is drawn and the lamp's light is out (a point
// light at nothing, which every lit material still pays a few instructions a
// fragment for). Lit, one unlit draw call of 16 triangles, and one more in
// the sea's mirror. A step works out the sun's height once.
