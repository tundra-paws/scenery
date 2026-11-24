// src/world/shared/cirrus.ts
import { ALOFT } from './wind.ts'

/**
 * How high the high cloud is laid, in world units over the sea. Only the
 * ratio to its features' sizes matters to the eye: it is drawn on the dome,
 * as far off as the sky, and never comes nearer as the camera moves.
 */
const HEIGHT = 900

/** A ripple's spacing across the wind, and a streak's length along it, in world units on that layer. */
const RIPPLE = 90
const STREAK = 1100

/** How much of the sky it covers, and how thick it is where it does: never more than a veil. */
const COVER   = 0.06
const OPACITY = 0.75

/**
 * The high cloud: a thin layer combed into streaks by the wind aloft, and
 * rippled across them, a mackerel sky. For a shader: `cirrusCover(direction)`
 * is how much of the sky that way it veils, from 0 to `OPACITY`, and
 * `cirrusColour(direction)` the colour it takes from the hour.
 *
 * It lies on the dome, so it costs no draw call and no triangle: the sky and
 * the stars both ask it, the sky to draw it and the stars to be dimmed by
 * it. It needs `uWindAloft` (`shared/wind.ts`) and the hour's cloud colours.
 */
export const CIRRUS_GLSL = /* glsl */ `
  #ifndef CIRRUS_GLSL
  #define CIRRUS_GLSL

  uniform vec2 uWindAloft;

  const vec2 CIRRUS_ALONG = vec2(${ALOFT[0]}, ${ALOFT[1]});

  float cirrusHash (vec2 at) {
    vec3 p = fract(vec3(at.xyx) * 0.1031);

    p += dot(p, p.yzx + 33.33);

    return fract((p.x + p.y) * p.z);
  }

  float cirrusNoise (vec2 at) {
    vec2 cell = floor(at);
    vec2 part = fract(at);
    vec2 ease = part * part * (3.0 - 2.0 * part);

    return mix(
      mix(cirrusHash(cell), cirrusHash(cell + vec2(1.0, 0.0)), ease.x),
      mix(cirrusHash(cell + vec2(0.0, 1.0)), cirrusHash(cell + vec2(1.0, 1.0)), ease.x),
      ease.y
    );
  }

  float cirrusCover (vec3 direction) {
    if (direction.y <= 0.0)
      return 0.0;

    // Where this way meets the layer, carried by the wind aloft, and turned
    // into its frame: along the streaks, and across them.
    vec2 at     = direction.xz / (direction.y + 0.06) * ${HEIGHT.toFixed(1)} - uWindAloft;
    vec2 combed = vec2(dot(at, CIRRUS_ALONG), dot(at, vec2(-CIRRUS_ALONG.y, CIRRUS_ALONG.x)));

    // Long bands of it, and the bands broken across into a fish's scales.
    float bands  = cirrusNoise(combed / vec2(${STREAK.toFixed(1)}, ${(RIPPLE * 4).toFixed(1)})) * 0.65 +
      cirrusNoise(combed / vec2(${(STREAK * 0.45).toFixed(1)}, ${(RIPPLE * 1.7).toFixed(1)}) + 17.0) * 0.35;
    float ripple = 0.5 + 0.5 * sin(combed.y / ${RIPPLE.toFixed(1)} * 6.2832 + cirrusNoise(combed / ${(RIPPLE * 2.5).toFixed(1)}) * 6.0);
    float lumps  = cirrusNoise(combed / vec2(${(RIPPLE * 0.9).toFixed(1)}, ${(RIPPLE * 0.6).toFixed(1)}) + 5.0);
    float scales = smoothstep(0.25, 0.85, ripple) * smoothstep(0.2, 0.7, lumps);

    float cover = smoothstep(${(0.5 - COVER).toFixed(3)}, ${(0.78 - COVER).toFixed(3)}, bands) * mix(0.3, 1.0, scales);

    // Thinned toward the horizon, where its ripples would crowd into noise,
    // and the haze would take it anyway.
    return cover * smoothstep(0.03, 0.22, direction.y) * ${OPACITY};
  }

  // Its colour: the low cloud's own two, lit side and shaded side, and the
  // lit side nearer the light. High up it catches the light longer.
  vec3 cirrusColour (vec3 direction, vec3 lit, vec3 shade, vec3 body) {
    float toward = pow(max(dot(direction, body), 0.0), 3.0);

    return mix(shade, lit, 0.7 + 0.3 * toward);
  }

  #endif
`

// perf: two value noises, and two more for the ripples, a fragment of the
// sky and a vertex of the stars. No draw call, no triangle, no texture.
