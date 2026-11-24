// src/world/features/environment/sky.ts
import * as THREE from 'three'
import { cameraProjectionMatrix, cameraViewMatrix, clamp, dot, max, mix, positionLocal, pow, smoothstep, varying, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'

import { cirrusColour, cirrusCover } from '../../shared/cirrus.ts'
import type { DaylightNodes } from '../../shared/daylight.ts'
import { printed } from '../../shared/output.ts'
import type { WindNodes } from '../../shared/wind.ts'


/** How much of the high cloud's veil the night takes: it is seen by the light it catches. */
export const NIGHT_THINS = 0.75

/** Half the moon's width, in degrees. Three times the real one, as a low moon looks. */
const MOON = 1.4

/**
 * A gradient sky with the sun's disc and glow and the moon's, and the high
 * cloud over them (`shared/cirrus.ts`), drawn on the inside of a dome. Every
 * colour and direction is the hour's own nodes, and the cloud's drift the
 * wind's, so the dome is told nothing: it turns with the day.
 */
export function createSkyMaterial (day: DaylightNodes, wind: WindNodes): NodeMaterial {
  const material  = new NodeMaterial()
  const direction = varying(positionLocal.normalize()).normalize()

  // Below the horizon the dome keeps the horizon colour, so the haze over the
  // water blends into it instead of meeting a darker band.
  const height = clamp(direction.y, 0, 1)
  const dome   = mix(day.horizon, day.zenith, pow(height, 0.55)).add(day.skyGlow(direction))

  // A disc is cut off at the horizon: from high up the sea's far edge lies
  // a little under it, and a sun that has set would show in the gap.
  const risen = smoothstep(-0.012, 0, direction.y)
  const sun   = max(dot(direction, day.sunDirection), 0)
  const moon  = max(dot(direction, day.sunDirection).negate(), 0)

  // The high cloud lies over the dome's colours, and the sun and the moon
  // shine through it, a little dimmed where it is thickest. At night it
  // has only the moon to catch, and is fainter.
  const veil   = cirrusCover(direction, wind.aloft).mul(day.night.mul(-NIGHT_THINS).add(1))
  const veiled = mix(dome, cirrusColour(direction, day.cloudLit, day.cloudShade, day.bodyDirection), veil)
  const dimmed = veil.mul(-0.5).add(1)
  const sunlit = day.sunDisc.mul(pow(sun, 420).mul(1.6)
    .mul(risen)
    .add(pow(sun, 16).mul(0.16))).mul(dimmed)

  // The moon stands opposite the sun, so it is always full: a flat disc
  // with a clean edge, and a little of its light in the air around it.
  const disc    = smoothstep(Math.cos(THREE.MathUtils.degToRad(MOON * 1.07)), Math.cos(THREE.MathUtils.degToRad(MOON)), moon)
  const moonlit = day.moonDisc.mul(disc.mul(0.9).add(pow(moon, 90).mul(0.07))).mul(risen)
    .mul(dimmed)

  material.name = 'sky'

  // Turned with the view and never moved by it: the dome is drawn around the
  // camera wherever that is, so walking never brings its wall closer and a
  // picture from a new place needs nothing told to the sky first.
  material.vertexNode = cameraProjectionMatrix.mul(vec4(cameraViewMatrix.mul(vec4(positionLocal, 0)).xyz, 1))

  // Printed, not developed, on purpose. The haze is mixed in after tone
  // mapping, in the exact colour it was given, so the dome has to arrive at
  // the horizon in that same colour or the land fades into a band that is
  // not the sky.
  material.fragmentNode = vec4(printed(veiled.add(sunlit).add(moonlit)), 1)
  material.side         = THREE.BackSide
  material.depthWrite   = false
  material.fog          = false

  return material
}

// perf: one draw call for the dome; a fragment is the high cloud's five
// value noises and three powers.
