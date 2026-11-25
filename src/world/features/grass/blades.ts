// src/world/features/grass/blades.ts
import * as THREE from 'three'
import { cameraViewMatrix, clamp, cos, dot, float, length, mix, mx_noise_float, positionGeometry, sin, smoothstep, step, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl'
import type { Node } from 'three/webgpu'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import type { LitMaterial } from '../../shared/lit.ts'
import { vec4Attribute } from '../../shared/nodes.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Wind } from '../../shared/wind.ts'
import type { Sward } from './sward.ts'

/** Blades of grass, on each tier: all of them drawn wherever grass grows near the camera, none where it does not. */
export const BLADES: Record<QualityTier, number> = { mobile: 14_000, desktop: 46_000, highEnd: 90_000 }

/** Edge of the square of ground the blades are spread over, which goes with the camera. */
export const PATCH: Record<QualityTier, number> = { mobile: 30, desktop: 42, highEnd: 52 }

/** How far ahead of the camera the patch's middle is, as a part of its edge: grass behind the eye is grass nobody sees. */
const AHEAD = 0.3

/** The patch's rim: the parts of half its edge between which a blade shrinks to nothing, so none appears or goes at full height. */
const RIM = [ 0.62, 0.98 ] as const

/** How far from the patch's middle a blade can stand at all, on each tier. */
export const REACH: Record<QualityTier, number> = { mobile: RIM[1] * PATCH.mobile / 2, desktop: RIM[1] * PATCH.desktop / 2, highEnd: RIM[1] * PATCH.highEnd / 2 }

/** A blade: half its width at the root, and its height, from and to. */
const HALF_WIDTH = 0.055
const TALL       = [ 0.26, 0.74 ] as const

/** How far a blade's tip stands off its root by itself, as a part of its height, each way. */
const SPLAY = 0.38

/**
 * How far a blade's tip goes downwind, as a part of its height: what it
 * keeps even in a lull, what a full gust adds, and the shiver on top of both.
 * The tufts' own numbers, so the two lean as one.
 */
const LEAN   = 0.16
const SWAY   = 0.5
const SHIVER = 0.08

/** How dark a blade is at its root: down among the others, where little light gets. */
const ROOT = 0.68

/** What the blades are made from: the map of the land and the grass on it, the wind, and where they are gathered. */
interface BladeOptions {
  sward: Sward
  wind:  Wind
  tier:  QualityTier

  /** The middle of the patch on the ground, set before each draw. */
  centre: THREE.Vector2
}

/**
 * Every blade, as one mesh of single triangles.
 *
 * A blade's three corners all carry the same place, a spot in a square of
 * ground `PATCH` wide: the shader moves that square with the camera. What
 * tells the corners apart is `aBlade`: which side of the root (-1, 1) or the
 * tip (0), whether it is the tip, and two numbers of the blade's own, for
 * how thick the grass must be for it to grow, and its height and turn.
 */
export function createBladeGeometry (tier: QualityTier, rng: SeededRng): THREE.BufferGeometry {
  const count    = BLADES[tier]
  const position = new Float32Array(count * 9)
  const blade    = new Float32Array(count * 12)
  const normal   = new Float32Array(count * 9)

  for (let index = 0; index < count; index += 1) {
    const x    = rng.range(0, PATCH[tier])
    const z    = rng.range(0, PATCH[tier])
    const grow = rng.next()
    const own  = rng.next()

    for (let corner = 0; corner < 3; corner += 1) {
      position.set([ x, 0, z ], index * 9 + corner * 3)

      // Lit like the ground it stands on: a blade's own facing would make
      // half a meadow dark.
      normal.set([ 0, 1, 0 ], index * 9 + corner * 3)
      blade.set([ corner === 2 ? 0 : corner * 2 - 1, corner === 2 ? 1 : 0, grow, own ], index * 12 + corner * 4)
    }
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  geometry.setAttribute('aBlade', new THREE.BufferAttribute(blade, 4))

  // Where the shader puts them is nowhere near where they are stored.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity)

  return geometry
}

/**
 * Grow the grass: put every blade where it belongs and colour it.
 *
 * The square of ground the blades were scattered over is laid, like a tile,
 * over the whole world, and each blade stands in whichever copy of its spot
 * is nearest the middle of the patch: so a blade never moves as the camera
 * does, only gives way at the rim to the same blade a patch further on. The
 * land's height and the grass's thickness come from the sward's map. A blade
 * grows where the grass is thicker than its own number, taller in thick
 * grass, shrunk to nothing at the rim; it stands a little off true, and
 * leans and shivers in the wind as a tuft does, from the root up.
 */
export function growGrass (material: LitMaterial, { sward, wind, tier, centre }: BladeOptions): void {
  const patch  = PATCH[tier]
  const middle = uniform(centre)
  const blade  = vec4Attribute('aBlade')
  const tip    = blade.y
  const own    = blade.w

  // The copy of this blade's spot nearest the middle of the patch.
  const root = positionGeometry.xz.sub(middle).div(patch)
    .add(0.5)
    .fract()
    .sub(0.5)
    .mul(patch)
    .add(middle)

  const land   = texture(sward.texture, root.mul(sward.scale).add(0.5), float(0))
  const thick  = land.g
  const rim    = smoothstep(RIM[0] * patch / 2, RIM[1] * patch / 2, length(root.sub(middle))).oneMinus()
  const grown  = step(blade.z.mul(0.92).add(0.04), thick).mul(rim)
  const height = mix(TALL[0], TALL[1], own).mul(thick.mul(0.5).add(0.5))
    .mul(grown)

  // Which way it faces and which way it stands off true: its own.
  const turn  = own.mul(61.7)
  const face  = vec3(cos(turn), 0, sin(turn))
  const splay = vec3(sin(turn.mul(1.7)), 0, cos(turn.mul(2.3))).mul(SPLAY)

  const gust   = wind.nodes.gust(root)
  const shiver = sin(dot(wind.nodes.frame(root), vec2(149, -113)).add(own.mul(6.3)))
  const lean   = gust.mul(SWAY).add(LEAN)
    .add(shiver.mul(SHIVER).mul(gust.mul(0.6).add(0.4)))

  material.positionNode = vec3(root.x, land.r.sub(0.03), root.y)
    .add(face.mul(blade.x).mul(HALF_WIDTH)
      .mul(grown))
    .add(vec3(wind.direction[0], 0, wind.direction[1]).mul(lean)
      .add(splay)
      .add(vec3(0, lean.mul(lean).mul(-0.35)
        .add(1), 0))
      .mul(tip)
      .mul(height))

  // The meadow's two greens, in the land's own patches (the same noise at
  // the same pitch as `terrain/land.ts`), dark at the root and each blade a
  // little its own.
  const grass   = uniform(new THREE.Color(PALETTE.grass)) as unknown as Node<'vec3'>
  const straw   = uniform(new THREE.Color(PALETTE.grassDry)) as unknown as Node<'vec3'>
  const patches = mx_noise_float(vec3(root.x, land.r, root.y).mul(0.17))
  const tone    = varying(vec3(clamp(patches.mul(1.3).add(0.2)
    .add(own.sub(0.5).mul(0.5)), 0, 1).mul(0.6), mix(ROOT, own.mul(0.3).add(0.95), tip), 0))

  material.dye(() => mix(grass, straw, tone.x).mul(tone.y))

  // Lit like the ground it stands in, whichever side of it is seen: a
  // blade's own facing, or the back of one, would make half a meadow dark.
  material.normalNode = cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz
}

/** Where the patch's middle is for a camera: on the ground ahead of it, the way it looks. Into `out`. */
export function patchCentre (camera: THREE.Camera, tier: QualityTier, forward: THREE.Vector3, out: THREE.Vector2): THREE.Vector2 {
  camera.getWorldDirection(forward)

  const level = Math.hypot(forward.x, forward.z) || 1

  // Looking straight down there is no ahead: the patch stays under the camera.
  const reach = PATCH[tier] * AHEAD * Math.min(1, level * 1.5)

  return out.set(camera.matrixWorld.elements[12]! + forward.x / level * reach, camera.matrixWorld.elements[14]! + forward.z / level * reach)
}

// perf: one draw call, no shadow pass, not in the sea's mirror: a triangle a
// blade, 14k on a phone, 46k on desktop. One lookup, one noise and the gust's
// three sines a vertex; a fragment is the lit material's own. Nothing on the
// CPU a frame but the patch's middle, two numbers.
