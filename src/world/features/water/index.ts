// src/world/features/water/index.ts
import * as THREE from 'three'

import { CLOUD_SHADOW_GLSL } from '../../shared/cloud-shadow.ts'
import { SKY_GLOW_GLSL } from '../../shared/daylight.ts'
import { DEEP_WATER } from '../../shared/ground.ts'
import { createHeightMap } from '../../shared/height-map.ts'
import { PALETTE } from '../../shared/palette.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'


/** Edge length of the water plane. Far wider than the land, so the fog hides its edge. */
const EXTENT = 3200

const VERTEX = /* glsl */ `
  ${WIND_GLSL}
  ${CLOUD_SHADOW_GLSL}

  varying vec3 vWorld;
  varying vec2 vCloudUv;

  #include <fog_pars_vertex>

  void main () {
    vec4 world      = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * world;

    vWorld      = world.xyz;
    vCloudUv    = cloudShadowUv(world.xyz);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const FRAGMENT = /* glsl */ `
  ${WIND_GLSL}
  ${CLOUD_SHADOW_GLSL}
  ${SKY_GLOW_GLSL}

  uniform float     uTime;
  uniform vec3      uDeep;
  uniform vec3      uShallow;
  uniform vec3      uFoam;
  uniform vec3      uSeaTint;
  uniform vec3      uSeaSky;
  uniform vec3      uSeaGlint;
  uniform vec3      uLightDirection;
  uniform vec3      uHorizon;
  uniform sampler2D uGround;
  uniform float     uGroundScale;

  varying vec3 vWorld;
  varying vec2 vCloudUv;

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

  // How far upwind to feel for the bottom, to tell a shore the wind blows onto
  // from one it blows off, and the drop in depth over that reach that makes a
  // shore fully one or the other.
  const float FETCH  = 3.0;
  const float SHELVE = 0.35;

  // How much darker a gust ruffles the water, and how much of its light the
  // sea loses under a cloud.
  const float RUFFLE = 0.13;
  const float GLOOM  = 0.5;

  #include <fog_pars_fragment>

  void main () {
    vec2 at = vWorld.xz;

    // Four travelling sines stand in for a normal map: cheap, endless, and a
    // pure function of position and time. All four run before the wind, two
    // straight down it and two off to either side, so the sea has a grain and
    // the grain has a direction.
    vec2  run   = vec2(dot(at, WIND), dot(at, vec2(-WIND.y, WIND.x)));
    float along = sin(run.x * 0.35 - uTime * 0.9) + sin((run.x * 0.98 + run.y * 0.21) * 0.43 - uTime * 1.1);
    float aside = sin((run.x * 0.82 + run.y * 0.57) * 0.27 - uTime * 0.7) - sin((run.x * 0.87 - run.y * 0.5) * 0.21 - uTime * 0.5);

    // The gusts the grass bends to cross the water too, as patches where it
    // is ruffled. A patch narrower than a pixel is only shimmer, so far off
    // they even out to the average.
    float gust = windGust(at);

    gust = mix(gust, 0.5, smoothstep(0.08, 0.4, fwidth(gust)));

    // Far away a ripple is smaller than a pixel and turns into a moire of the
    // sampling grid, so the waves flatten out with distance.
    float calm = (0.03 + 0.04 * gust) / (1.0 + distance(cameraPosition, vWorld) * 0.012);

    vec3 normal = normalize(vec3((WIND.x * along - WIND.y * aside) * calm, 1.0, (WIND.y * along + WIND.x * aside) * calm));
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
    // Its own colours are what the day shows of it: the hour leaves less of
    // them, and what the surface gives back is the sky of that hour.
    vec3  body    = mix(uShallow, uDeep, murk);
    vec3  colour  = mix(mix(body, uDeep, RUFFLE * gust) * uSeaTint, uSeaSky, fresnel * SHEEN);

    // Under a cloud the sea is duller and the light has nothing to glint off.
    // The glint is the sun's by day and the moon's at night.
    float light   = cloudLight(vCloudUv);
    vec3  halfway = normalize(uLightDirection + view);

    colour *= mix(1.0 - GLOOM, 1.0, light);
    colour += uSeaGlint * pow(max(dot(normal, halfway), 0.0), 220.0) * 0.9 * light * light;

    // The sea has no edge of its own: it thins over the last of the sand until
    // the sand is all there is. Over a couple of pixels at least, so the edge
    // stays soft from across the bay. The other way it closes early, at half
    // its darkness: a slanting look through the shallows runs on under the
    // deep water, where the terrain has built no floor to find.
    float veil  = max(fresnel, min(murk * 2.0, 1.0));
    float alpha = mix(1.0 - CLEAR, 1.0, veil) * smoothstep(0.0, SHALLOWS + pixel * 2.0, depth);

    // Which shore this is. Where the bottom is deeper upwind, the wind is
    // bringing the sea in; where it is shallower, the land is in the way and
    // the water lies in its lee. Looked up only near the land.
    float upwind   = depth < WAVELET_START * 2.0 ? -textureLod(uGround, (at - WIND * FETCH) * uGroundScale + 0.5, 0.0).r : depth;
    float windward = clamp(0.5 + (upwind - depth) / SHELVE * 0.5, 0.0, 1.0);

    // Foam where it runs out, reaching further and whiter where the swell is
    // up or a gust is behind it, further still on the windward shore, and all
    // but gone in the lee. Never thinner than a pixel or so, so from a distance
    // the island still has a drawn shoreline all the way round.
    float swell = (along + aside) * 0.25 + (gust - 0.5) * 0.5;
    float reach = RIM * (1.0 + 0.6 * swell) * mix(0.6, 1.5, windward) + pixel * 1.5;
    float foam  = (1.0 - smoothstep(reach * 0.5, reach, depth)) * clamp(0.65 + 0.5 * swell, 0.0, 1.0);

    // One wavelet behind it: a fainter line that drifts in and dies on the rim.
    // Where a pixel spans more than the gap between two lines there is nothing
    // to draw but moire, so it fades out with distance.
    float crest   = smoothstep(0.8, 1.0, sin(depth * WAVELET_DENSITY + uTime * WAVELET_SPEED + swell));
    float wavelet = crest * (1.0 - smoothstep(RIM, WAVELET_START, depth)) * (1.0 - smoothstep(0.4, 1.6, pixel * WAVELET_DENSITY));

    foam = max(foam, wavelet * mix(0.25, 0.75, windward));

    gl_FragColor = vec4(mix(colour, uFoam * uSeaTint, foam), mix(alpha, 1.0, foam));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>

    // The haze by hand: the same fog as the land's, but into the sky's colour
    // in the direction looked in, so toward a low sun the far sea takes the
    // glow that is on the horizon over it and the two still meet as one.
    #ifdef USE_FOG
      float fogged = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);

      gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(uHorizon + skyGlow(-view), 1.0)).rgb, fogged);
    #endif
  }
`

/**
 * The sea: one plane at the water level, pale over the shelf and dark past it,
 * thinning to foam where the land comes up through it. Its ripples run before
 * the wind, gusts cross it as darker patches, the foam is widest on the shore
 * the wind blows onto, and the clouds lay their shadows on it. It keeps the
 * hour: darker as the light goes, glinting under the sun and then the moon,
 * and fading far out into whatever the sky is doing on that side.
 */
export function createWater (world: World): Feature {
  let mesh: THREE.Mesh | null               = null
  let material: THREE.ShaderMaterial | null = null
  let ground: THREE.DataTexture | null      = null

  return {
    name: 'water',

    build ({ scene }) {
      const heights = createHeightMap(world.ground, world.grid)

      const { uSeaTint, uSeaSky, uSeaGlint, uLightDirection, uHorizon, uSunDirection, uGlow } = world.day.uniforms

      ground   = heights.texture
      material = new THREE.ShaderMaterial({
        name:           'water',
        vertexShader:   VERTEX,
        fragmentShader: FRAGMENT,
        transparent:    true,
        fog:            true,

        // The wind's drift, the clouds' shadow and the hour are the world's
        // own uniform objects, shared by reference, so they are spread in
        // and not cloned.
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          ...world.wind.uniforms,
          ...world.clouds.uniforms,
          uSeaTint,
          uSeaSky,
          uSeaGlint,
          uLightDirection,
          uHorizon,
          uSunDirection,
          uGlow,
          uTime:        { value: 0 },
          uDeep:        { value: new THREE.Color(PALETTE.waterDeep) },
          uShallow:     { value: new THREE.Color(PALETTE.waterShallow) },
          uFoam:        { value: new THREE.Color(PALETTE.foam) },
          uGround:      { value: ground },
          uGroundScale: { value: heights.scale },
        },
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
      ground?.dispose()
      mesh?.removeFromParent()
      mesh     = null
      material = null
      ground   = null
    },
  }
}

// perf: cheap — one draw call, two triangles, one small height texture. The
// fragment shader is a dozen trig calls and two lookups (the land under it and
// the clouds over it), with a third only within a few units of the shore. It
// covers a lot of screen, so keep it that small.
