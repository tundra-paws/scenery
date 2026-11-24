// src/world/features/infield/barley.ts
import * as THREE from 'three'
import { clamp, dot, mix, positionGeometry, sin, smoothstep, varyingProperty, vec2, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { commitInstances, tellReach } from '../../shared/instances.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { displaceInstances, floatAttribute } from '../../shared/nodes.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Wind } from '../../shared/wind.ts'


/** Of the ears a tier is offered, how many it keeps. A phone gets the field's colour and fewer stalks. */
const KEEP: Record<QualityTier, number> = { mobile: 0.4, desktop: 1, highEnd: 1 }

/** Height of a stalk before it is scaled, and the most a whole ear leans over in a full bow. */
const STALK = 0.62
const BOW   = 0.32

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/**
 * How barley bows in the wind at a place on the ground: the gust where it
 * stands, and on top of it a ripple carried at the wind's own speed. Where
 * the ripple is, the ears bow and show their paler side, which is how wind
 * is seen on a field from a long way off. 0 standing, 1 bowed right over.
 */
export function cropBow (wind: Wind, at: Node<'vec2'>): Node<'float'> {
  const ripple = sin(dot(wind.nodes.frame(at), vec2(170, -120))).mul(0.5)
    .add(0.5)

  return wind.nodes.gust(at).mul(ripple.mul(0.65).add(0.35))
}

/** A colour a little paler where a crop bows by `amount`. */
export function sheen (colour: Node<'vec3'>, amount: Node<'float'>): Node<'vec3'> {
  return mix(colour, colour.mul(1.22).add(0.035), smoothstep(0.2, 0.85, amount))
}

/**
 * Let the barley's material lean and bow: a stalk is only moved and scaled
 * when placed, never turned, so the push is the wind's own way, as far as
 * the stalk was stretched (`aReach`).
 */
function bowInWind (material: LitMaterial, wind: Wind): void {
  // How far this vertex of the stalk has bowed, for the sheen: worked out
  // where the lean is, once the stalk has been placed, and handed on.
  const paled = varyingProperty('float', 'vBarleyBow') as Node<'float'>

  displaceInstances(material, placed => {
    const bowed = cropBow(wind, placed.xz)
    const up    = clamp(positionGeometry.y.div(STALK), 0, 1)
    const reach = up.mul(up).mul(floatAttribute('aReach'))

    paled.assign(bowed.mul(up))

    return placed
      .add(vec3(wind.direction[0], 0, wind.direction[1]).mul(bowed.mul(BOW).add(0.06))
        .mul(reach))
      .sub(vec3(0, bowed.mul(bowed).mul(reach)
        .mul(0.25), 0))
  })

  material.dye(colour => sheen(colour, paled))
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
export function sowBarley (ears: readonly number[], material: LitMaterial, lay: SeededRng, tier: QualityTier, wind: Wind): THREE.InstancedMesh {
  const keep: number[] = []

  for (let index = 0; index < ears.length; index += 3)
    if (lay.next() < KEEP[tier])
      keep.push(index)

  bowInWind(material, wind)

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

  tellReach(mesh)
  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call, no shadow pass. Nine triangles a clump, some
// eight hundred on desktop and a third of that on the phone: 7k and 3k
// triangles. The bow is the gust's three sines and one more a vertex.
