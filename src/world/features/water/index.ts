// src/world/features/water/index.ts
import * as THREE from 'three'

import { PALETTE } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { SUN } from '../environment/index.ts'


/** Edge length of the water plane. Far wider than the land, so the fog hides its edge. */
const EXTENT = 3200

const VERTEX = /* glsl */ `
  varying vec3 vWorld;

  #include <fog_pars_vertex>

  void main () {
    vec4 world      = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * world;

    vWorld      = world.xyz;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  uniform vec3  uSun;
  uniform vec3  uSunDirection;

  varying vec3 vWorld;

  #include <fog_pars_fragment>

  void main () {
    vec2 at = vWorld.xz;

    // Two pairs of travelling sines stand in for a normal map: cheap, endless,
    // and a pure function of position and time.
    float across = sin(at.x * 0.35 + uTime * 0.9) + sin(at.y * 0.27 - uTime * 0.7);
    float along  = sin((at.x + at.y) * 0.21 + uTime * 0.5) + sin((at.x - at.y) * 0.43 - uTime * 1.1);

    // Far away a ripple is smaller than a pixel and turns into a moire of the
    // sampling grid, so the waves flatten out with distance.
    float calm = 0.05 / (1.0 + distance(cameraPosition, vWorld) * 0.012);

    vec3 normal = normalize(vec3(across * calm, 1.0, along * calm));
    vec3 view   = normalize(cameraPosition - vWorld);

    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    vec3  colour  = mix(uDeep, uShallow, fresnel);

    vec3 halfway = normalize(uSunDirection + view);

    colour += uSun * pow(max(dot(normal, halfway), 0.0), 220.0) * 0.9;

    gl_FragColor = vec4(colour, mix(uOpacity, 1.0, fresnel));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/** The sea: one plane at the water level, with moving glints and a fresnel fade. */
export function createWater (world: World): Feature {
  let mesh: THREE.Mesh | null               = null
  let material: THREE.ShaderMaterial | null = null

  return {
    name: 'water',

    build ({ scene }) {
      material = new THREE.ShaderMaterial({
        name:           'water',
        vertexShader:   VERTEX,
        fragmentShader: FRAGMENT,
        transparent:    true,
        fog:            true,

        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime:         { value: 0 },
            uOpacity:      { value: 0.82 },
            uDeep:         { value: new THREE.Color(PALETTE.waterDeep) },
            uShallow:      { value: new THREE.Color(PALETTE.waterShallow) },
            uSun:          { value: new THREE.Color(PALETTE.sun) },
            uSunDirection: { value: SUN.clone() },
          },
        ]),
      })

      const geometry = new THREE.PlaneGeometry(EXTENT, EXTENT)

      geometry.rotateX(-Math.PI / 2)

      mesh            = new THREE.Mesh(geometry, material)
      mesh.name       = 'water'
      mesh.position.y = world.ground.waterLevel

      scene.add(mesh)
    },

    update (_state, frame) {
      if (material)
        material.uniforms.uTime!.value = frame.frame * STEP
    },

    dispose () {
      mesh?.geometry.dispose()
      material?.dispose()
      mesh?.removeFromParent()
      mesh     = null
      material = null
    },
  }
}

// perf: cheap — one draw call, two triangles, no textures. The fragment shader
// is a dozen trig calls; it covers a lot of screen, so keep it that small.
