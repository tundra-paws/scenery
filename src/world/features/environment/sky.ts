// src/world/features/environment/sky.ts
import * as THREE from 'three'


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
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  void main () {
    vec3 direction = normalize(vDirection);

    // Below the horizon the dome keeps the horizon colour, so the fog over the
    // water blends into it instead of meeting a darker band.
    float height = clamp(direction.y, 0.0, 1.0);
    vec3  colour = mix(uHorizon, uZenith, pow(height, 0.55));

    float toward = max(dot(direction, uSunDirection), 0.0);

    colour += uSun * (pow(toward, 420.0) * 1.6 + pow(toward, 10.0) * 0.16);

    gl_FragColor = vec4(colour, 1.0);

    // No tone mapping on purpose. Fog is mixed in after tone mapping, in the
    // exact colour it was given, so the dome has to arrive at the horizon in
    // that same colour or the land fades into a band that is not the sky.
    #include <colorspace_fragment>
  }
`

interface SkyOptions {
  zenith:       THREE.ColorRepresentation
  horizon:      THREE.ColorRepresentation
  sun:          THREE.ColorRepresentation
  sunDirection: THREE.Vector3
}

/** A gradient sky with a sun disc and its glow, drawn on the inside of a dome. */
export function createSkyMaterial ({ zenith, horizon, sun, sunDirection }: SkyOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name:           'sky',
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    side:           THREE.BackSide,
    depthWrite:     false,
    fog:            false,

    uniforms: {
      uZenith:       { value: new THREE.Color(zenith) },
      uHorizon:      { value: new THREE.Color(horizon) },
      uSun:          { value: new THREE.Color(sun) },
      uSunDirection: { value: sunDirection.clone() },
    },
  })
}
