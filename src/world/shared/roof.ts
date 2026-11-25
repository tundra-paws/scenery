// src/world/shared/roof.ts
import * as THREE from 'three'
import type { createNoise3D } from 'threejs-scenes/primitives'

import { PALETTE } from './palette.ts'

/** How far a sod stands proud of its neighbours, at most. */
const LUMP = 0.09

const GRASS = new THREE.Color(PALETTE.grass)
const DRY   = new THREE.Color(PALETTE.grassDry)

/** What shows between the stones of a dry wall: no light. The rock's own grey, most of the way to black. */
export const DARK = new THREE.Color(PALETTE.rock).multiplyScalar(0.2)

/** The cut edge of a sod: the earth under the grass. */
const EARTH = new THREE.Color(PALETTE.groundFill).lerp(new THREE.Color(PALETTE.path), 0.35)

/** Module-scope scratch. */
const scratch = new THREE.Color()
const at      = new THREE.Vector3()
const facing  = new THREE.Vector3()

/**
 * A turf roof's measures, in its building's own frame (x across the ridge,
 * y up from the floor, z along the ridge): half the walls' outer line each
 * way, the height of the long walls' top and of the ridge, the thickness of
 * the turf square to the roof, and how far it oversails the walls at the
 * eaves and at the gables.
 */
export interface RoofPlan {
  halfDeep: number
  halfLong: number
  eave:     number
  ridge:    number
  turf:     number
  eaves:    number
  verge:    number
}

/**
 * Give every vertex of a geometry a colour, from where it is and which way its
 * face looks, and drop the attributes a building's body does not read.
 */
export function paint (geometry: THREE.BufferGeometry, colourAt: (at: THREE.Vector3, facing: THREE.Vector3) => THREE.Color): THREE.BufferGeometry {
  const plain    = geometry.index ? geometry.toNonIndexed() : geometry
  const position = plain.getAttribute('position')
  const normal   = plain.getAttribute('normal')
  const colours  = new Float32Array(position.count * 3)

  for (let index = 0; index < position.count; index += 1)
    colourAt(at.fromBufferAttribute(position, index), facing.fromBufferAttribute(normal, index)).toArray(colours, index * 3)

  plain.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  plain.deleteAttribute('uv')

  if (plain !== geometry)
    geometry.dispose()

  return plain
}

/**
 * One side of a turf roof: a slab of turf from the ridge down past the wall.
 *
 * Grass on top, in sods that do not quite lie level with each other, and the
 * earth showing at its cut edges. `side` is -1 for the slope toward -x, 1
 * for the one toward +x.
 */
export function createTurfSlope ({ halfDeep, halfLong, eave, ridge, turf, eaves, verge }: RoofPlan, side: number, noise: ReturnType<typeof createNoise3D>): THREE.BufferGeometry {
  const pitch = Math.atan2(ridge - eave, halfDeep)

  // Past the ridge by enough that the two slopes' top edges meet over it.
  const over   = turf * Math.tan(pitch)
  const length = (halfDeep + eaves) / Math.cos(pitch) + over
  const slab   = new THREE.BoxGeometry(length, turf, (halfLong + verge) * 2, 4, 1, 6)
  const place  = slab.getAttribute('position')

  // A lump is keyed on where a vertex is, so the corners the box's faces
  // share move together and the slab stays closed.
  for (let index = 0; index < place.count; index += 1)
    if (place.getY(index) > 0)
      place.setY(index, place.getY(index) + noise.sample(place.getX(index) * 1.1, side * 3.3, place.getZ(index) * 1.1) * LUMP)

  const sods = paint(slab, ({ x, z }, { y }) => y > 0.5 ? scratch.copy(GRASS).lerp(DRY, 0.5 + 0.5 * noise.sample(x * 0.7, side * 5.1, z * 0.7)) : EARTH)

  // Laid with its underside on the line from the ridge to the wall's top.
  sods.translate(length / 2 - over, turf / 2, 0)
  sods.rotateZ(-pitch)
  sods.translate(0, ridge, 0)

  if (side < 0)
    sods.rotateY(Math.PI)

  return sods
}

// perf: trivial — a slab of some hundred triangles, built once.
