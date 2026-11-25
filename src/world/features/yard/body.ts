// src/world/features/yard/body.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { SeededRng } from 'threejs-scenes'
import { createNoise3D } from 'threejs-scenes/primitives'

import type { Ground } from '../../shared/ground.ts'
import { PALETTE } from '../../shared/palette.ts'
import { DARK, paint } from '../../shared/roof.ts'
import { SHEAF_TALL, createSheafGeometry } from '../../shared/sheaf.ts'
import type { Kiln, Stack, Yard } from '../../shared/yard.ts'
import { HOOP, INSET, KILN, KILN_WALL, ROPES, STACK, THATCH } from './plan.ts'

/** How far a stack's side or a sod of the kiln's roof stands out of true, as a part of its radius. */
const LUMP = 0.045

/** Bound straw, its butts outward: the stooks' colour. Weathered where it thatches; darker where it is twisted into rope. */
const STRAW    = new THREE.Color(PALETTE.barley).offsetHSL(0, -0.06, 0.05)
const THATCHED = new THREE.Color(PALETTE.barley).lerp(new THREE.Color(PALETTE.groundFill), 0.5)
const ROPE     = new THREE.Color(PALETTE.barley).lerp(new THREE.Color(PALETTE.groundFill), 0.9)
  .multiplyScalar(0.72)

/** The kiln's turf: the roofs' two greens, and the earth of its cut edge. */
const GRASS = new THREE.Color(PALETTE.grass)
const DRY   = new THREE.Color(PALETTE.grassDry)
const EARTH = new THREE.Color(PALETTE.groundFill).lerp(new THREE.Color(PALETTE.path), 0.35)

/** Sheaves thrown down by the stack that is building: how far out from its foot, from and to. */
const THROWN = [ 0.5, 1.5 ] as const

/** Module-scope scratch. */
const scratch = new THREE.Color()
const spot    = new THREE.Vector3()
const up      = new THREE.Vector3(0, 1, 0)
const lie     = new THREE.Quaternion()

type Noise = ReturnType<typeof createNoise3D>

/** Something turned about the vertical from a profile of radius and height, its sides pushed a little out of round. */
function turn (profile: readonly (readonly [number, number])[], sides: number, noise: Noise, key: number): THREE.BufferGeometry {
  const turned = new THREE.LatheGeometry(profile.map(([ radius, height ]) => new THREE.Vector2(Math.max(radius, 0.001), height)), sides)
  const place  = turned.getAttribute('position')

  // Keyed on where a vertex is, so the seam's two copies of one corner move together.
  for (let index = 0; index < place.count; index += 1) {
    const lump = 1 + noise.sample(place.getX(index) * 1.7 + key, place.getY(index) * 1.3, place.getZ(index) * 1.7) * LUMP

    place.setX(index, place.getX(index) * lump)
    place.setZ(index, place.getZ(index) * lump)
  }

  return turned
}

/** A rope from one place to another: a thin square bar. */
function rope (from: THREE.Vector3, to: THREE.Vector3): THREE.BufferGeometry {
  const bar = new THREE.BoxGeometry(0.055, from.distanceTo(to), 0.055)

  bar.applyQuaternion(lie.setFromUnitVectors(up, spot.copy(to).sub(from)
    .normalize()))
  bar.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)

  return paint(bar, () => ROPE)
}

/**
 * One stack, about the middle of its base: sheaves laid in rings, butts
 * out, widening to the eaves; over them a head of thatch, rounded like a
 * beehive, its edge hanging clear, roped down; and a knot of straw on the
 * point. Under it all, the dark between the stones of its base, down to
 * `foot`.
 */
function createStack (stack: Stack, foot: number, noise: Noise, ropes: boolean, key: number): THREE.BufferGeometry[] {
  const { foot: wide, eave, high, apex, sides } = STACK
  const top                                     = high * stack.raised
  const shoulder                                = wide + (eave - wide) * stack.raised
  const under                                   = paint(new THREE.CylinderGeometry(wide - 0.3, wide - 0.3, -foot, sides, 1, true).translate(0, foot / 2, 0), () => DARK)
  const sheaves                                 = paint(turn([[ wide, 0 ], [ wide + (shoulder - wide) * 0.4, top * 0.34 ], [ wide + (shoulder - wide) * 0.8, top * 0.7 ], [ shoulder, top ]], sides, noise, key), ({ y }) => scratch.copy(STRAW).offsetHSL(0, 0, 0.04 * noise.sample(key, y * 2.3, 0.5)))

  // Still building: its lower rings, heaped in the middle to shed the rain.
  if (stack.raised < 1)
    return [ under, sheaves, paint(turn([[ shoulder, top ], [ shoulder * 0.86, top + 0.3 ], [ shoulder * 0.5, top + 0.52 ], [ 0, top + 0.6 ]], sides, noise, key + 3), () => scratch.copy(STRAW).offsetHSL(0, 0, 0.05)) ]

  const parts = [
    under,
    sheaves,
    paint(turn([[ eave, high ], ...THATCH ], sides, noise, key + 3), ({ y }) => scratch.copy(THATCHED).offsetHSL(0, 0, 0.05 * noise.sample(key, y * 1.9, 4.5))),
    paint(new THREE.ConeGeometry(0.2, 0.55, 5).translate(0, apex + 0.16, 0), () => ROPE),
  ]

  if (ropes)
    parts.push(...net())

  return parts
}

/**
 * The ropes over a stack's thatch: each from the knot down to the eaves,
 * where its stone hangs, and one round them all to keep them from slipping.
 */
function net (): THREE.BufferGeometry[] {
  const bars = [] as THREE.BufferGeometry[]
  const on   = ([ radius, height ]: readonly [number, number], angle: number): THREE.Vector3 => new THREE.Vector3(Math.cos(angle) * (radius + 0.05), height + 0.03, Math.sin(angle) * (radius + 0.05))

  for (let index = 0; index < ROPES; index += 1) {
    const angle = (index + 0.5) / ROPES * Math.PI * 2
    const half  = Math.PI / ROPES

    for (let knot = THATCH.length - 2; knot > 0; knot -= 1)
      bars.push(rope(on(THATCH[knot]!, angle), on(THATCH[knot - 1]!, angle)))

    bars.push(
      rope(on(THATCH[0], angle), on([ THATCH[0][0], THATCH[0][1] - 0.3 ], angle)),
      rope(on(THATCH[HOOP], angle), on(THATCH[HOOP], angle + half)),
      rope(on(THATCH[HOOP], angle + half), on(THATCH[HOOP], angle + half * 2)),
    )
  }

  return bars
}

/**
 * The kiln's own body: the dark within its ring of stones, from under the
 * ground to the top of the wall, and over it the roof, a cone of turf with
 * its sods' cut edge showing at the eaves and a black hole at the top.
 */
function createKiln (foot: number, noise: Noise): THREE.BufferGeometry[] {
  const { radius, batter, courses, eaves, turf, apex, vent } = KILN
  const top                                                  = radius - batter * courses
  const dark                                                 = new THREE.CylinderGeometry(top - INSET, radius - INSET, KILN_WALL - foot, 12)
  const edge                                                 = top + eaves
  const roof                                                 = turn([[ edge - 0.12, KILN_WALL - 0.14 ], [ edge, KILN_WALL - 0.14 + turf ], [ edge * 0.6, KILN_WALL + (apex - KILN_WALL) * 0.52 ], [ vent, apex ], [ vent - 0.1, apex - 0.16 ]], 12, noise, 7)
  const hole                                                 = new THREE.CircleGeometry(vent, 8).rotateX(-Math.PI / 2)
    .translate(0, apex - 0.14, 0)

  dark.translate(0, (KILN_WALL + foot) / 2, 0)

  return [
    paint(dark, () => DARK),
    paint(roof, ({ x, y, z }) => y < KILN_WALL || Math.hypot(x, z) < vent ? EARTH : scratch.copy(GRASS).lerp(DRY, 0.5 + 0.5 * noise.sample(x * 0.7, y * 0.7, z * 0.7))),
    paint(hole, () => DARK),
  ]
}

/** Sheaves thrown down by a stack: lying on their sides on the land, butts every way. */
function strew (stack: Stack, ground: Ground, lay: SeededRng, count: number): THREE.BufferGeometry[] {
  return Array.from({ length: count }, () => {
    const angle = lay.range(0, Math.PI * 2)
    const away  = STACK.eave * stack.size + lay.range(THROWN[0], THROWN[1])
    const x     = stack.x + Math.cos(angle) * away
    const z     = stack.z + Math.sin(angle) * away
    const sheaf = createSheafGeometry()

    sheaf.translate(0, -SHEAF_TALL / 2, 0)
    sheaf.rotateZ(Math.PI / 2 + lay.range(-0.12, 0.12))
    sheaf.rotateY(lay.range(0, Math.PI * 2))
    sheaf.translate(x, ground.heightAt(x, z) + 0.15, z)

    return paint(sheaf, () => scratch.copy(STRAW).offsetHSL(0, 0, lay.range(0, 0.06)))
  })
}

/**
 * Everything of the yard that is not a stone or a board, as one geometry in
 * the world's frame, coloured per vertex: the stacks and their thatch, the
 * sheaves thrown down by the one that is building, `loads` more wherever
 * they were set down (on the sledge), and the kiln's dark and its roof.
 * `ropes` is whether this tier draws the ropes over the thatch.
 */
export function createBodyGeometry (yard: Yard, ground: Ground, lay: SeededRng, ropes: boolean, loads: readonly THREE.Matrix4[]): THREE.BufferGeometry {
  const noise = createNoise3D(lay.int(1, 1_000_000))
  const parts = [] as THREE.BufferGeometry[]
  const low   = (middle: Kiln | Stack, radius: number, level: number): number => {
    let lowest = 0

    for (let step = 0; step < 12; step += 1)
      lowest = Math.min(lowest, ground.heightAt(middle.x + Math.cos(step * Math.PI / 6) * radius, middle.z + Math.sin(step * Math.PI / 6) * radius) - level)

    return lowest - 0.6
  }

  yard.stacks.forEach((stack, index) => {
    const built  = createStack(stack, low(stack, STACK.foot * stack.size, stack.base) / stack.size, noise, ropes, index * 11.3)
    const turned = lay.range(0, Math.PI * 2)

    for (const part of built)
      parts.push(part.rotateY(turned).scale(stack.size, stack.size, stack.size)
        .translate(stack.x, stack.base, stack.z))

    if (stack.raised < 1)
      parts.push(...strew(stack, ground, lay, 5))
  })

  for (const load of loads)
    parts.push(paint(createSheafGeometry().applyMatrix4(load), () => scratch.copy(STRAW).offsetHSL(0, 0, lay.range(0, 0.06))))

  for (const part of createKiln(low(yard.kiln, KILN.radius, yard.kiln.floor), noise))
    parts.push(part.translate(yard.kiln.x, yard.kiln.floor, yard.kiln.z))

  const body = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

  body.computeVertexNormals()
  body.computeBoundingBox()
  body.computeBoundingSphere()

  return body
}

// perf: cheap — a stack is some 140 triangles and its ropes 290 more; the
// kiln's body 150; a sheaf 30. Under 2k on desktop and 1k on a phone, which
// has no ropes. Built once.
