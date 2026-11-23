// src/world/features/clouds/material.ts
import * as THREE from 'three'

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
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uHaze;
  uniform vec3 uSunDirection;

  varying vec3 vNormal;
  varying vec3 vWorld;

  void main () {
    vec3 normal = normalize(vNormal);

    // Two colours and the facets do the rest: cream where a face is turned to
    // the sun, the sky's own blue where it is turned away, and the flat
    // underside a little deeper still.
    float toward = smoothstep(-0.35, 0.55, dot(normal, uSunDirection));
    float under  = smoothstep(0.5, 0.95, -normal.y);
    vec3  colour = mix(uShade, uLit, toward) * (1.0 - 0.1 * under);

    // Haze by hand, and no tone mapping, for the reason the sky has none: a
    // far cloud has to arrive at the horizon in the horizon's exact colour.
    float far  = distance(cameraPosition, vWorld) * ${HAZE};
    float haze = 1.0 - exp(-far * far);

    gl_FragColor = vec4(mix(colour, uHaze, haze), 1.0);

    #include <colorspace_fragment>
  }
`

interface CloudOptions {
  lit:          THREE.ColorRepresentation
  shade:        THREE.ColorRepresentation
  haze:         THREE.ColorRepresentation
  sunDirection: THREE.Vector3
  wind:         WindUniforms
}

/** Flat-shaded cloud stuff that drifts on the wind in its vertex shader. */
export function createCloudMaterial ({ lit, shade, haze, sunDirection, wind }: CloudOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name:           'cloud',
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    fog:            false,

    uniforms: {
      ...wind,
      uLit:          { value: new THREE.Color(lit) },
      uShade:        { value: new THREE.Color(shade) },
      uHaze:         { value: new THREE.Color(haze) },
      uSunDirection: { value: sunDirection.clone() },
    },
  })
}

// perf: cheap — the drift is one `mod` a vertex and the shading two
// `smoothstep`s and an `exp` a fragment. Opaque, so a cloud in front of
// another costs nothing twice.
