// src/world/features/clouds/material.ts
import { cameraPosition, distance, dot, exp, length, mix, mod, normalWorld, positionWorld, smoothstep, vec3, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'

import type { DaylightNodes } from '../../shared/daylight.ts'
import { displaceInstances, vec3Attribute } from '../../shared/nodes.ts'
import { printed } from '../../shared/output.ts'
import { WEATHER_SPAN } from '../../shared/wind.ts'
import type { WindNodes } from '../../shared/wind.ts'


/** Distance from the island at which a cloud starts to dwindle, and at which it is gone. */
export const DWINDLE = [ 760, 980 ] as const

/** How fast the haze takes a cloud, per world unit. Thinner than the fog on the sea: the look is upward. */
export const HAZE = 0.0016

/**
 * Flat-shaded cloud stuff that drifts on the wind in its vertex shader, in
 * the colours the hour gives it. `aCloud` is where each puff's cloud is at
 * home; the instance matrix holds the puff's place in its cloud, not in the
 * world.
 */
export function createCloudMaterial (wind: WindNodes, day: DaylightNodes): NodeMaterial {
  const material = new NodeMaterial()
  const cloud    = vec3Attribute('aCloud')

  // The cloud rides the wind, and comes round again on the far side of the
  // weather's square.
  const home = mod(cloud.xz.add(wind.drift).add(WEATHER_SPAN / 2), WEATHER_SPAN).sub(WEATHER_SPAN / 2)

  // It is small when it does: grown from nothing out in the haze, and back
  // to nothing before it reaches the seam, so no cloud ever blinks.
  const presence = smoothstep(DWINDLE[0], DWINDLE[1], length(home)).oneMinus()

  // Two colours and the facets do the rest: the light's where a face is
  // turned to the sun or the moon, the sky's own where it is turned away,
  // and the flat underside a little deeper still. The light is taken from
  // where it truly is, so a sun going down lights a cloud from below.
  const toward = smoothstep(-0.35, 0.55, dot(normalWorld, day.bodyDirection))
  const under  = smoothstep(0.5, 0.95, normalWorld.y.negate())
  const colour = mix(day.cloudShade, day.cloudLit, toward).mul(under.mul(-0.1).add(1))

  // Haze by hand, and printed, not developed, for the reason the sky is: a
  // far cloud has to arrive at the horizon in the horizon's exact colour.
  const far  = distance(cameraPosition, positionWorld).mul(HAZE)
  const haze = exp(far.mul(far).negate()).oneMinus()

  material.name         = 'cloud'
  material.fragmentNode = vec4(printed(mix(colour, day.horizon, haze)), 1)
  material.fog          = false

  displaceInstances(material, puff => vec3(home.x, cloud.y, home.y).add(puff.mul(presence)))

  return material
}

// perf: cheap — the drift is one `mod` a vertex and the shading two
// `smoothstep`s and an `exp` a fragment. Opaque, so a cloud in front of
// another costs nothing twice.
