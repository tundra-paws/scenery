// src/world/features/infield/barley.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import type { Wind } from '../../shared/wind.ts'


/**
 * How barley bows in the wind, for a shader that has `WIND_GLSL` already:
 * the gust where it stands, and on top of it a ripple carried at the wind's
 * own speed. Where the ripple is, the ears bow and show their paler side,
 * which is how wind is seen on a field from a long way off. 0 standing, 1
 * bowed right over.
 */
export const BOW_GLSL = /* glsl */ `
  #ifndef BOW_GLSL
  #define BOW_GLSL

  float cropBow (vec2 at) {
    float ripple = 0.5 + 0.5 * sin(dot(windFrame(at), vec2(170.0, -120.0)));

    return windGust(at) * (0.35 + 0.65 * ripple);
  }

  #endif
`

/** Of the ears a tier is offered, how many it keeps. A phone gets the field's colour and fewer stalks. */
const KEEP: Record<QualityTier, number> = { mobile: 0.4, desktop: 1, highEnd: 1 }

/** Height of a stalk before it is scaled, and the most a whole ear leans over in a full bow. */
const STALK = 0.62
const BOW   = 0.32

/** A stalk, leaning and bowing, in its own space: only moved and scaled when placed, never turned. */
const EAR_VERTEX = /* glsl */ `
  #ifdef USE_INSTANCING
    vec2  earRoot = instanceMatrix[3].xz;
    float earBow  = cropBow(earRoot);
    float earUp   = clamp(transformed.y / ${STALK}, 0.0, 1.0);

    transformed.xz += WIND * (0.06 + ${BOW} * earBow) * earUp * earUp;
    transformed.y  -= 0.25 * earBow * earBow * earUp * earUp;
    vEarSheen       = earBow * earUp;
  #endif
`

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** A colour a little paler where a crop bows, for a fragment shader: the expression, of the varying named. */
export function SHEEN (varying: string): string {
  return `mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + 0.035, smoothstep(0.2, 0.85, ${varying}))`
}

/** One stalk's clump: three thin open cones, nearly upright. Nine triangles, lit like the ground under them. */
function createEarGeometry (): THREE.BufferGeometry {
  const stalks = [ -0.16, 0.05, 0.2 ].map((lean, index) => {
    const stalk = new THREE.ConeGeometry(0.05, STALK, 3, 1, true)

    stalk.translate(0, STALK / 2, 0)
    stalk.rotateZ(lean)
    stalk.rotateY(index * 2.1)

    return stalk.deleteAttribute('uv')
  })

  const merged = mergeGeometries(stalks)

  for (const stalk of stalks)
    stalk.dispose()

  const normal = merged.getAttribute('normal')

  for (let index = 0; index < normal.count; index += 1)
    normal.setXYZ(index, 0, 1, 0)

  merged.computeBoundingSphere()

  return merged
}

/**
 * The barley standing on its rigs, one clump of stalks at each place it was
 * offered, as one instanced mesh that bows with the rigs under it.
 */
export function sowBarley (ears: readonly number[], material: THREE.MeshStandardMaterial, lay: SeededRng, tier: QualityTier, wind: Wind): THREE.InstancedMesh {
  const keep: number[] = []

  for (let index = 0; index < ears.length; index += 3)
    if (lay.next() < KEEP[tier])
      keep.push(index)

  amendShader(material, 'barley-bow', shader => {
    Object.assign(shader.uniforms, wind.uniforms)

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', `${WIND_GLSL}\n${BOW_GLSL}\nvarying float vEarSheen;`),
      '#include <begin_vertex>',
      EAR_VERTEX,
    )

    shader.fragmentShader = insertAfter(
      insertAfter(shader.fragmentShader, '#include <common>', 'varying float vEarSheen;'),
      '#include <color_fragment>',
      `diffuseColor.rgb = ${SHEEN('vEarSheen')};`,
    )
  })

  const mesh = new THREE.InstancedMesh(createEarGeometry(), material, keep.length)

  keep.forEach((at, index) => {
    const size = lay.range(0.75, 1.15)

    dummy.position.set(ears[at]! + lay.range(-0.1, 0.1), ears[at + 1]!, ears[at + 2]! + lay.range(-0.1, 0.1))
    dummy.scale.setScalar(size)
    dummy.updateMatrix()

    mesh.setMatrixAt(index, dummy.matrix)
    mesh.setColorAt(index, tint.set(PALETTE.barley).offsetHSL(0, 0, lay.range(-0.03, 0.07)))
  })

  mesh.name          = 'infield-barley'
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call, no shadow pass. Nine triangles a clump, some
// eight hundred on desktop and a third of that on the phone: 7k and 3k
// triangles. The bow is the gust's three sines and one more a vertex.
