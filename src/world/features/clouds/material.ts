// src/world/features/clouds/material.ts
import * as THREE from 'three'

import type { DaylightUniforms } from '../../shared/daylight.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import type { WindUniforms } from '../../shared/wind.ts'


/** Distance from the island at which a cloud starts to dwindle, and at which it is gone. */
const DWINDLE = [ 760, 980 ] as const

/** How fast the haze takes a cloud, per world unit. Thinner than the fog on the sea: the look is upward. */
const HAZE = 0.0016

const VERTEX = /* glsl */ `
  ${WIND_GLSL}

  attribute vec3 aCloud;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    // The cloud rides the wind, and comes round again on the far side of the
    // weather's square.
    vec2 home = mod(aCloud.xz + uWindDrift + WEATHER_SPAN * 0.5, WEATHER_SPAN) - WEATHER_SPAN * 0.5;

    // It is small when it does: grown from nothing out in the haze, and back
    // to nothing before it reaches the seam, so no cloud ever blinks.
    float presence = 1.0 - smoothstep(${DWINDLE[0].toFixed(1)}, ${DWINDLE[1].toFixed(1)}, length(home));

    // The instance matrix holds the puff's place in its cloud, not in the world.
    mat3 puff  = mat3(instanceMatrix);
    vec3 local = (instanceMatrix * vec4(position, 1.0)).xyz * presence;

    vWorld  = vec3(home.x, aCloud.y, home.y) + local;
    vNormal = puff * (normal / vec3(dot(puff[0], puff[0]), dot(puff[1], puff[1]), dot(puff[2], puff[2])));

    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform vec3 uHorizon;
  uniform vec3 uBodyDirection;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    vec3 normal = normalize(vNormal);

    // Two colours and the facets do the rest: the light's where a face is
    // turned to the sun or the moon, the sky's own where it is turned away,
    // and the flat underside a little deeper still. The light is taken from
    // where it truly is, so a sun going down lights a cloud from below.
    float toward = smoothstep(-0.35, 0.55, dot(normal, uBodyDirection));
    float under  = smoothstep(0.5, 0.95, -normal.y);
    vec3  colour = mix(uCloudShade, uCloudLit, toward) * (1.0 - 0.1 * under);

    // Haze by hand, and no tone mapping, for the reason the sky has none: a
    // far cloud has to arrive at the horizon in the horizon's exact colour.
    float far  = distance(cameraPosition, vWorld) * ${HAZE};
    float haze = 1.0 - exp(-far * far);

    gl_FragColor = vec4(mix(colour, uHorizon, haze), 1.0);

    #include <colorspace_fragment>
  }
`

/**
 * Flat-shaded cloud stuff that drifts on the wind in its vertex shader, in
 * the colours the hour gives it.
 */
export function createCloudMaterial (wind: WindUniforms, day: DaylightUniforms): THREE.ShaderMaterial {
  const { uCloudLit, uCloudShade, uHorizon, uBodyDirection } = day

  return new THREE.ShaderMaterial({
    name:           'cloud',
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    fog:            false,
    uniforms:       { ...wind, uCloudLit, uCloudShade, uHorizon, uBodyDirection },
  })
}

// perf: cheap — the drift is one `mod` a vertex and the shading two
// `smoothstep`s and an `exp` a fragment. Opaque, so a cloud in front of
// another costs nothing twice.
