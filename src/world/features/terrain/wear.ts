// src/world/features/terrain/wear.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { PALETTE } from '../../shared/palette.ts'
import { distanceToSpan } from '../../shared/path.ts'
import type { Path } from '../../shared/path.ts'


/** Texels along the longer side of the picture of the path. */
const SIDE: Record<QualityTier, number> = { mobile: 160, desktop: 256, highEnd: 384 }

/** Half the width of the bare ground, in world units, and how far that wanders along the way. */
const HALF_WIDTH = 1.35
const WANDER     = 0.28

/** How far from the path the picture still knows the distance, in half-widths. Past that it is plain ground. */
const REACH = 4

/** Where the yellowed grass beside the path ends, in half-widths, and how much of the ground's own colour it takes. */
const VERGE      = 2.8
const VERGE_TINT = 0.55

/** How much of the ground's own colour the bare path replaces: not all, so the beach and the rock still show through. */
const BARE = 0.92

/** Height over the water between which grass takes over from sand: only grass has a verge to yellow. */
const TURF = [ 0.7, 2.4 ] as const

const WEAR_VERTEX = /* glsl */ `
  vec3 pathAt = (modelMatrix * vec4(transformed, 1.0)).xyz;

  vPathAt = vec3((pathAt.xz - uPathFrame.xy) * uPathFrame.zw, pathAt.y);
`

/**
 * The path, laid over the ground's own colour.
 *
 * The picture holds distance from the path, not the path, so the edge is
 * found between texels the way a distance-field font's is and stays clean
 * however coarse the terrain's own grid is on this tier.
 */
const WEAR_FRAGMENT = /* glsl */ `
  float pathAway = (1.0 - texture2D(uPathWear, vPathAt.xy).r) * ${REACH.toFixed(1)};
  float pathEdge = max(fwidth(pathAway), 0.05);
  float pathTurf = smoothstep(${TURF[0]}, ${TURF[1]}, vPathAt.z);

  diffuseColor.rgb = mix(diffuseColor.rgb, uPathVerge, ${VERGE_TINT} * pathTurf * (1.0 - smoothstep(1.0, ${VERGE}, pathAway)));
  diffuseColor.rgb = mix(diffuseColor.rgb, uPathBare, ${BARE} * (1.0 - smoothstep(1.0 - pathEdge, 1.0 + pathEdge, pathAway)));
`

/** The path as something the terrain's shader can look up. */
export interface PathWear {

  /** One channel: 255 on the middle of the path, 0 from `REACH` half-widths away. */
  texture: THREE.DataTexture

  /** World position to texture coordinate: `uv = (xz - frame.xy) * frame.zw`. */
  frame: THREE.Vector4
}

/** How wide the bare ground is at a distance along the path: two slow waves, so no stretch is ruled. */
function halfWidthAt (along: number): number {
  return HALF_WIDTH * (1 + WANDER * (0.6 * Math.sin(along * 0.31) + 0.4 * Math.sin(along * 0.113 + 1.7)))
}

/**
 * Paint distance from the path into a picture of the ground it crosses.
 *
 * Each span of the path is stamped into the texels around it, as the nearest
 * it comes in units of its own half-width there, so a wider stretch is simply
 * a stretch whose edge lies further out. The picture covers the path's own
 * bounds and a margin; everything outside reads as its edge, which is zero.
 */
export function createPathWear (path: Path, tier: QualityTier): PathWear {
  const { points } = path
  const pad        = REACH * HALF_WIDTH * (1 + WANDER) + 2
  const minX       = Math.min(...points.map(point => point.x)) - pad
  const minZ       = Math.min(...points.map(point => point.z)) - pad
  const spanX      = Math.max(...points.map(point => point.x)) + pad - minX
  const spanZ      = Math.max(...points.map(point => point.z)) + pad - minZ
  const texel      = Math.max(spanX, spanZ) / SIDE[tier]
  const columns    = Math.ceil(spanX / texel)
  const rows       = Math.ceil(spanZ / texel)
  const data       = new Uint8Array(columns * rows)

  for (let index = 1; index < points.length; index += 1) {
    const from  = points[index - 1]!
    const to    = points[index]!
    const half  = halfWidthAt(index * path.spacing)
    const reach = Math.ceil(REACH * half / texel) + 1
    const left  = Math.max(0, Math.floor((Math.min(from.x, to.x) - minX) / texel) - reach)
    const right = Math.min(columns - 1, Math.floor((Math.max(from.x, to.x) - minX) / texel) + reach)
    const near  = Math.max(0, Math.floor((Math.min(from.z, to.z) - minZ) / texel) - reach)
    const far   = Math.min(rows - 1, Math.floor((Math.max(from.z, to.z) - minZ) / texel) + reach)

    for (let row = near; row <= far; row += 1)
      for (let column = left; column <= right; column += 1) {
        const away  = distanceToSpan(minX + (column + 0.5) * texel, minZ + (row + 0.5) * texel, from, to) / half
        const value = Math.round(255 * (1 - away / REACH))

        data[row * columns + column] = Math.max(data[row * columns + column]!, value)
      }
  }

  const texture = new THREE.DataTexture(data, columns, rows, THREE.RedFormat, THREE.UnsignedByteType)

  texture.name        = 'path-wear'
  texture.magFilter   = THREE.LinearFilter
  texture.minFilter   = THREE.LinearFilter
  texture.needsUpdate = true

  return { texture, frame: new THREE.Vector4(minX, minZ, 1 / (columns * texel), 1 / (rows * texel)) }
}

/** Let a ground material show the path: bare earth down its middle, yellowed grass beside it. */
export function wearPath (material: THREE.Material, wear: PathWear): void {
  const uniforms = {
    uPathWear:  { value: wear.texture },
    uPathFrame: { value: wear.frame },
    uPathBare:  { value: new THREE.Color(PALETTE.path) },
    uPathVerge: { value: new THREE.Color(PALETTE.grassDry) },
  }

  amendShader(material, 'path-wear', shader => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', 'uniform vec4 uPathFrame;\nvarying vec3 vPathAt;'),
      '#include <project_vertex>',
      WEAR_VERTEX,
    )

    shader.fragmentShader = insertAfter(
      insertAfter(shader.fragmentShader, '#include <common>', 'uniform sampler2D uPathWear;\nuniform vec3 uPathBare;\nuniform vec3 uPathVerge;\nvarying vec3 vPathAt;'),
      '#include <color_fragment>',
      WEAR_FRAGMENT,
    )
  })
}

// perf: cheap — one single-channel texture of at most 160, 256 or 384 texels a
// side (26 KB to 147 KB), painted once from the path's hundred-odd spans, and
// one lookup a fragment of the terrain. Nothing per frame.
