// src/world/features/environment/sky.ts
import * as THREE from 'three'

import { CIRRUS_GLSL } from '../../shared/cirrus.ts'
import { SKY_GLOW_GLSL } from '../../shared/daylight.ts'
import type { DaylightUniforms } from '../../shared/daylight.ts'
import type { WindUniforms } from '../../shared/wind.ts'


/** Half the moon's width, in degrees. Three times the real one, as a low moon looks. */
const MOON = 1.4

const VERTEX = /* glsl */ `
  varying vec3 vDirection;

  void main () {
    vDirection = normalize(position);

    // Turned with the view and never moved by it: the dome is drawn around the
    // camera wherever that is, so walking never brings its wall closer and a
    // picture from a new place needs nothing told to the sky first.
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  ${SKY_GLOW_GLSL}
  ${CIRRUS_GLSL}

  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunDisc;
  uniform vec3 uMoonDisc;
  uniform vec3 uCloudLit;
  uniform vec3 uCloudShade;
  uniform vec3 uBodyDirection;

  varying vec3 vDirection;

  void main () {
    vec3 direction = normalize(vDirection);

    // Below the horizon the dome keeps the horizon colour, so the fog over the
    // water blends into it instead of meeting a darker band.
    float height = clamp(direction.y, 0.0, 1.0);
    vec3  colour = mix(uHorizon, uZenith, pow(height, 0.55)) + skyGlow(direction);

    // A disc is cut off at the horizon: from high up the sea's far edge lies
    // a little under it, and a sun that has set would show in the gap.
    float risen = smoothstep(-0.012, 0.0, direction.y);
    float sun   = max(dot(direction, uSunDirection), 0.0);
    float moon  = max(-dot(direction, uSunDirection), 0.0);

    // The high cloud lies over the dome's colours, and the sun and the moon
    // shine through it, a little dimmed where it is thickest.
    float veil = cirrusCover(direction);

    colour  = mix(colour, cirrusColour(direction, uCloudLit, uCloudShade, uBodyDirection), veil);
    colour += uSunDisc * (pow(sun, 420.0) * 1.6 * risen + pow(sun, 16.0) * 0.16) * (1.0 - 0.5 * veil);

    // The moon stands opposite the sun, so it is always full: a flat disc
    // with a clean edge, and a little of its light in the air around it.
    colour += uMoonDisc * (smoothstep(${Math.cos(THREE.MathUtils.degToRad(MOON * 1.07))}, ${Math.cos(THREE.MathUtils.degToRad(MOON))}, moon) * 0.9 + pow(moon, 90.0) * 0.07) * risen * (1.0 - 0.5 * veil);

    gl_FragColor = vec4(colour, 1.0);

    // No tone mapping on purpose. Fog is mixed in after tone mapping, in the
    // exact colour it was given, so the dome has to arrive at the horizon in
    // that same colour or the land fades into a band that is not the sky.
    #include <colorspace_fragment>
  }
`

/**
 * A gradient sky with the sun's disc and glow and the moon's, and the high
 * cloud over them (`shared/cirrus.ts`), drawn on the inside of a dome. Every
 * colour and direction is the hour's own uniforms, and the cloud's drift the
 * wind's, so the dome is told nothing: it turns with the day.
 */
export function createSkyMaterial (day: DaylightUniforms, wind: WindUniforms): THREE.ShaderMaterial {
  const { uZenith, uHorizon, uSunDisc, uMoonDisc, uSunDirection, uGlow, uCloudLit, uCloudShade, uBodyDirection } = day

  return new THREE.ShaderMaterial({
    name:           'sky',
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    side:           THREE.BackSide,
    depthWrite:     false,
    fog:            false,
    uniforms:       { uZenith, uHorizon, uSunDisc, uMoonDisc, uSunDirection, uGlow, uCloudLit, uCloudShade, uBodyDirection, uWindAloft: wind.uWindAloft },
  })
}
