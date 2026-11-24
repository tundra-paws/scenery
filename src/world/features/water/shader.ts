// src/world/features/water/shader.ts
import { CLOUD_SHADOW_GLSL } from '../../shared/cloud-shadow.ts'
import { SKY_GLOW_GLSL } from '../../shared/daylight.ts'
import { DEEP_WATER } from '../../shared/ground.ts'
import { SWELL_GLSL } from '../../shared/swell.ts'
import { WIND_GLSL } from '../../shared/wind.ts'


export const VERTEX = /* glsl */ `
  ${WIND_GLSL}
  ${CLOUD_SHADOW_GLSL}

  uniform mat4 uMirrorMatrix;

  varying vec3 vWorld;
  varying vec2 vCloudUv;
  varying vec4 vMirror;

  #include <fog_pars_vertex>

  void main () {
    vec4 world      = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * world;

    vWorld      = world.xyz;
    vCloudUv    = cloudShadowUv(world.xyz);
    vMirror     = uMirrorMatrix * world;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

export const FRAGMENT = /* glsl */ `
  ${WIND_GLSL}
  ${SWELL_GLSL}
  ${CLOUD_SHADOW_GLSL}
  ${SKY_GLOW_GLSL}

  uniform float     uTime;
  uniform vec3      uDeep;
  uniform vec3      uShallow;
  uniform vec3      uFoam;
  uniform vec3      uSeaTint;
  uniform vec3      uSeaGlint;
  uniform vec3      uLightDirection;
  uniform vec3      uHorizon;
  uniform sampler2D uGround;
  uniform float     uGroundScale;
  uniform sampler2D uMirror;
  uniform sampler2D uWash;
  uniform float     uWashScale;
  uniform vec4      uBoat;
  uniform vec2      uBoatHull;
  uniform vec2      uBoatShade;

  varying vec3 vWorld;
  varying vec2 vCloudUv;
  varying vec4 vMirror;

  // Depth of water, in world units, over which the sea thins out to nothing
  // on the sand.
  const float SHALLOWS = 0.9;

  // Depth down to which the sea keeps all of its pale colour, and the depth
  // from which it is its darkest and hides whatever is under it.
  const float PALE = 0.3;
  const float DEEP = ${DEEP_WATER.toFixed(1)};

  // How much of what is under the shallows shows when looking straight down.
  const float CLEAR = 0.18;

  // How much of the world the surface gives back at most, how far its
  // ripples shake the picture in it, and how much less a gust leaves of it.
  const float MIRROR = 1.0;
  const float WOBBLE = 0.25;
  const float BREAK  = 0.3;

  // Depth the foam on the waterline reaches out to when the swell is level.
  const float RIM = 0.18;

  // The surf behind the rim, where the swell stands up and breaks: its lines
  // per unit of depth, how fast they run in (one every few seconds, and one
  // breaking at the tenth second, when the postcards are taken), the depth
  // they first break at, and how much of the foam a broken line leaves behind.
  const float SURF_DENSITY = 5.5;
  const float SURF_SPEED   = 2.4;
  const float SURF_START   = 1.8;
  const float SURF_TRAIL   = 0.45;

  // Round what stands in the sea: how far its foam reaches, and the rings
  // that run out from it, their lines per unit and how far they carry.
  const float LAP        = 0.45;
  const float HULL_LAP   = 0.22;
  const float RING       = 3.2;
  const float RING_SPEED = 1.5;
  const float RING_REACH = 2.4;

  // How far upwind to feel for the bottom, to tell a shore the wind blows onto
  // from one it blows off, and the drop in depth over that reach that makes a
  // shore fully one or the other.
  const float FETCH  = 3.0;
  const float SHELVE = 0.35;

  // How much darker a gust ruffles the water, and how much of its light the
  // sea loses under a cloud.
  const float RUFFLE = 0.13;
  const float GLOOM  = 0.5;

  // The boat on the water: how much of the sea's own colour its shadow
  // takes, and how long the calm it leaves in its lee is.
  const float SHADE = 0.45;
  const float LEE   = 16.0;

  #include <fog_pars_fragment>

  // Distance from the boat's waterline, in world units, negative inside it,
  // with the point in the boat's own frame (x to the bow).
  float hullDistance (vec2 local) {
    vec2  q = local / uBoatHull;
    float e = length(q);

    return (e - 1.0) * e / max(length(q / uBoatHull), 1e-3);
  }

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

    // The boat, in its own frame, and the calm it makes downwind of itself:
    // a slick the length of a few boats where the gusts do not reach.
    vec2  boat  = at - uBoat.xy;
    vec2  local = vec2(dot(boat, uBoat.zw), dot(boat, vec2(-uBoat.w, uBoat.z)));
    float lee   = (1.0 - smoothstep(uBoatHull.y, uBoatHull.y * 3.0, abs(local.y))) * smoothstep(uBoatHull.x * 0.5, -uBoatHull.x, local.x) * (1.0 - smoothstep(LEE * 0.4, LEE, -local.x));

    gust *= 1.0 - 0.8 * lee;

    // How much water lies over the land here. The map is on the terrain's own
    // grid, so zero is where the mesh breaks the surface.
    float depth = -texture2D(uGround, at * uGroundScale + 0.5).r;
    float pixel = fwidth(depth);

    // Far away a ripple is smaller than a pixel and turns into a moire of the
    // sampling grid, so the waves flatten out with distance.
    float calm = (0.03 + 0.04 * gust) / (1.0 + distance(cameraPosition, vWorld) * 0.012) * (1.0 - 0.6 * lee);

    // Under the ripples, the swell: long low backs that tilt the whole
    // picture in the water one way and then the other as they pass. It
    // stands up and is spent in the shallows, and far off it is finer than a
    // pixel and lies flat.
    vec3  swell  = swellAt(at, uTime);
    float heave  = smoothstep(0.0, SURF_START * 1.5, depth) * (1.0 - smoothstep(1.5, 4.0, length(fwidth(at))));
    vec2  slope  = swell.yz * heave;

    vec3 normal = normalize(vec3((WIND.x * along - WIND.y * aside) * calm - slope.x, 1.0, (WIND.y * along + WIND.x * aside) * calm - slope.y));
    vec3 view   = normalize(cameraPosition - vWorld);

    // The sea's own colour is how much of it there is to look through: pale
    // over the shelf, where the sand is close under it, and dark past the
    // drop. The hour leaves less of it as the light goes.
    float murk   = smoothstep(PALE, DEEP, depth);
    float facing = max(dot(normal, view), 0.0);
    vec3  body   = mix(uShallow, uDeep, murk);
    vec3  colour = mix(body, uDeep, RUFFLE * gust) * uSeaTint;

    // Under a cloud, or in the boat's shadow, the water is duller: its own
    // colour is light that went into it and came back out.
    float light  = cloudLight(vCloudUv);
    float shaded = 1.0 - smoothstep(-0.3, 0.4, hullDistance(local - uBoatShade));

    colour *= mix(1.0 - GLOOM, 1.0, light) * (1.0 - SHADE * shaded * light);

    // On top of that it gives back the world: the sky, the land, whatever
    // stands over it, upside down, more of it the flatter it is looked across
    // (Schlick's fresnel) and less where a gust has roughened it. The ripples
    // shake the picture, and the sun's or the moon's glint is on top.
    vec2  mirrorUv    = vMirror.xy / vMirror.w + normal.xz * WOBBLE;
    vec3  mirrored    = texture2D(uMirror, mirrorUv).rgb;
    float reflectance = (0.06 + 0.94 * pow(1.0 - facing, 3.0)) * MIRROR * (1.0 - BREAK * gust);
    vec3  halfway     = normalize(uLightDirection + view);

    colour  = mix(colour, mirrored, reflectance);
    colour += uSeaGlint * pow(max(dot(normal, halfway), 0.0), 220.0) * 0.9 * light * light;

    // The sea has no edge of its own: it thins over the last of the sand until
    // the sand is all there is. Over a couple of pixels at least, so the edge
    // stays soft from across the bay. The other way it closes early, at half
    // its darkness: a slanting look through the shallows runs on under the
    // deep water, where the terrain has built no floor to find. What it gives
    // back it gives back over the sand too.
    float veil  = max(reflectance, min(murk * 2.0, 1.0));
    float alpha = mix(1.0 - CLEAR, 1.0, veil) * smoothstep(0.0, SHALLOWS + pixel * 2.0, depth);

    // Which shore this is. Where the bottom is deeper upwind, the wind is
    // bringing the sea in; where it is shallower, the land is in the way and
    // the water lies in its lee. Looked up only near the land.
    float upwind   = depth < SURF_START * 1.5 ? -textureLod(uGround, (at - WIND * FETCH) * uGroundScale + 0.5, 0.0).r : depth;
    float windward = clamp(0.5 + (upwind - depth) / SHELVE * 0.5, 0.0, 1.0);

    // Foam where it runs out, reaching further and whiter where the swell is
    // up or a gust is behind it, further still on the windward shore, and all
    // but gone in the lee. Never thinner than a pixel or so, so from a distance
    // the island still has a drawn shoreline all the way round.
    float rise  = (along + aside) * 0.25 + (gust - 0.5) * 0.5 + swell.x * 4.0;
    float reach = RIM * (1.0 + 0.6 * rise) * mix(0.6, 1.5, windward) + pixel * 1.5;
    float foam  = (1.0 - smoothstep(reach * 0.5, reach, depth)) * clamp(0.65 + 0.5 * rise, 0.0, 1.0);

    // The surf: the swell stands up over the shelf and breaks, a line of
    // white with a sharp shoreward edge that runs in over the shallows and
    // leaves its foam spread behind it, two or three at a time on the shore
    // the wind blows onto and one, thin, in the lee. Where a pixel spans more
    // than the gap between two lines there is nothing to draw but moire, so
    // it fades out with distance.
    float surge   = fract((depth * SURF_DENSITY + uTime * SURF_SPEED + swell.x * 6.0 + rise) / 6.2832);
    float breaker = smoothstep(0.0, 0.04, surge) * (1.0 - smoothstep(0.04, SURF_TRAIL, surge));
    float surf    = breaker * smoothstep(SURF_START, SURF_START * 0.45, depth) * smoothstep(RIM * 0.5, RIM * 2.0, depth) * (1.0 - smoothstep(0.4, 1.6, pixel * SURF_DENSITY));

    foam = max(foam, surf * mix(0.3, 0.9, windward));

    // What stands in the sea breaks it: a stone, the dyke's foot, the boat.
    // The map holds how far each point is from the nearest thing standing in
    // the water (\`wash.ts\`); the boat is worked out here, since it moves.
    // Foam laps the side the sea comes from, and rings run out from them all.
    // The side the sea comes onto is the side where a step upwind leads
    // away from the thing: the boat's own frame turns the wind with it.
    float washed = texture2D(uWash, at * uWashScale + 0.5).r;
    float hull   = hullDistance(local);
    float stand  = min(washed, hull);

    if (stand < RING_REACH) {
      vec2  drift   = WIND * 0.6;
      float further = min(texture2D(uWash, (at - drift) * uWashScale + 0.5).r, hullDistance(local - vec2(dot(drift, uBoat.zw), dot(drift, vec2(-uBoat.w, uBoat.z)))));
      float onto    = clamp(0.5 + (further - stand) * 1.2, 0.0, 1.0);
      float edge    = fwidth(stand);
      float lap     = (hull < washed ? HULL_LAP : LAP) * (1.0 + 0.7 * rise) * mix(0.5, 1.4, onto) + edge * 1.5;
      float ring    = smoothstep(0.88, 1.0, sin(stand * RING - uTime * RING_SPEED + rise)) * (1.0 - smoothstep(lap, RING_REACH, stand));

      ring *= 1.0 - smoothstep(0.4, 1.4, edge * RING);
      foam  = max(foam, max((1.0 - smoothstep(lap * 0.35, lap, stand)) * clamp(0.7 + 0.5 * rise, 0.0, 1.0), ring * mix(0.08, 0.35, onto)));
    }

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
