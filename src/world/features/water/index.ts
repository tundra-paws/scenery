// src/world/features/water/index.ts
import * as THREE from 'three'

import { DEEP_WATER } from '../../shared/ground.ts'
import { createHeightMap } from '../../shared/height-map.ts'
import { PALETTE } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { SUN } from '../environment/index.ts'
import { TERRAIN_SEGMENTS } from '../terrain/index.ts'


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
  uniform float     uTime;
  uniform vec3      uDeep;
  uniform vec3      uShallow;
  uniform vec3      uSky;
  uniform vec3      uFoam;
  uniform vec3      uSun;
  uniform vec3      uSunDirection;
  uniform sampler2D uGround;
  uniform float     uGroundScale;

  varying vec3 vWorld;

  // Depth of water, in world units, over which the sea thins out to nothing
  // on the sand.
  const float SHALLOWS = 0.9;

  // Depth down to which the sea keeps all of its pale colour, and the depth
  // from which it is its darkest and hides whatever is under it.
  const float PALE = 0.3;
  const float DEEP = ${DEEP_WATER.toFixed(1)};

  // How much of what is under the shallows shows when looking straight down.
  const float CLEAR = 0.18;

  // How much of the sky the surface gives back when it is seen edge-on.
  const float SHEEN = 0.25;

  // Depth the foam on the waterline reaches out to when the swell is level.
  const float RIM = 0.18;

  // The wavelet behind the rim: its lines per unit of depth, how fast they run
  // in (one every five seconds or so, and one on its way at the tenth second,
  // when the postcards are taken), and the depth they first show at.
  const float WAVELET_DENSITY = 4.4;
  const float WAVELET_SPEED   = 1.17;
  const float WAVELET_START   = 1.3;

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

    // How much water lies over the land here. The map is on the terrain's own
    // grid, so zero is where the mesh breaks the surface.
    float depth = -texture2D(uGround, at * uGroundScale + 0.5).r;
    float pixel = fwidth(depth);

    // The sea's own colour is how much of it there is to look through: pale
    // over the shelf, where the sand is close under it, and dark past the
    // drop. On top of that the surface gives back some sky, most at a glance.
    float murk    = smoothstep(PALE, DEEP, depth);
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    vec3  colour  = mix(mix(uShallow, uDeep, murk), uSky, fresnel * SHEEN);

    vec3 halfway = normalize(uSunDirection + view);

    colour += uSun * pow(max(dot(normal, halfway), 0.0), 220.0) * 0.9;

    // The sea has no edge of its own: it thins over the last of the sand until
    // the sand is all there is. Over a couple of pixels at least, so the edge
    // stays soft from across the bay. The other way it closes early, at half
    // its darkness: a slanting look through the shallows runs on under the
    // deep water, where the terrain has built no floor to find.
    float veil  = max(fresnel, min(murk * 2.0, 1.0));
    float alpha = mix(1.0 - CLEAR, 1.0, veil) * smoothstep(0.0, SHALLOWS + pixel * 2.0, depth);

    // Foam where it runs out, reaching further and whiter where the swell is
    // up and all but gone where it is down. Never thinner than a pixel or so,
    // so from a distance the island still has a drawn shoreline.
    float swell = (across + along) * 0.25;
    float reach = RIM * (1.0 + 0.6 * swell) + pixel * 1.5;
    float foam  = (1.0 - smoothstep(reach * 0.5, reach, depth)) * clamp(0.65 + 0.5 * swell, 0.0, 1.0);

    // One wavelet behind it: a fainter line that drifts in and dies on the rim.
    // Where a pixel spans more than the gap between two lines there is nothing
    // to draw but moire, so it fades out with distance.
    float crest   = smoothstep(0.8, 1.0, sin(depth * WAVELET_DENSITY + uTime * WAVELET_SPEED + swell));
    float wavelet = crest * (1.0 - smoothstep(RIM, WAVELET_START, depth)) * (1.0 - smoothstep(0.4, 1.6, pixel * WAVELET_DENSITY));

    foam = max(foam, wavelet * 0.6);

    gl_FragColor = vec4(mix(colour, uFoam, foam), mix(alpha, 1.0, foam));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/**
 * The sea: one plane at the water level, pale over the shelf and dark past it,
 * with moving glints, thinning to foam where the land comes up through it.
 */
export function createWater (world: World): Feature {
  let mesh: THREE.Mesh | null               = null
  let material: THREE.ShaderMaterial | null = null
  let ground: THREE.DataTexture | null      = null

  return {
    name: 'water',

    build ({ scene }) {
      const heights = createHeightMap(world.ground, TERRAIN_SEGMENTS[world.quality.tier])

      ground   = heights.texture
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
            uDeep:         { value: new THREE.Color(PALETTE.waterDeep) },
            uShallow:      { value: new THREE.Color(PALETTE.waterShallow) },
            uSky:          { value: new THREE.Color(PALETTE.skyFill) },
            uFoam:         { value: new THREE.Color(PALETTE.foam) },
            uSun:          { value: new THREE.Color(PALETTE.sun) },
            uSunDirection: { value: SUN.clone() },
            uGround:       { value: null },
            uGroundScale:  { value: heights.scale },
          },
        ]),
      })

      // Set after the merge, which would hand back a copy of the texture.
      material.uniforms.uGround!.value = ground

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
      ground?.dispose()
      mesh?.removeFromParent()
      mesh     = null
      material = null
      ground   = null
    },
  }
}

// perf: cheap — one draw call, two triangles, one small height texture. The
// fragment shader is a dozen trig calls and one lookup; it covers a lot of
// screen, so keep it that small.
