// src/world/features/shelter/body.ts
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createNoise3D } from 'threejs-scenes/primitives'

import { PALETTE } from '../../shared/palette.ts'
import { CHIMNEY, EAVE, EAVES, HALF_DEEP, HALF_LONG, INSET, RIDGE, TURF, VERGE, underRoof } from './plan.ts'


/** The pitch of the roof, from level. */
const PITCH = Math.atan2(RIDGE - EAVE, HALF_DEEP)

/** How far a sod stands proud of its neighbours, at most. */
const LUMP = 0.09

const GRASS = new THREE.Color(PALETTE.grass)
const DRY   = new THREE.Color(PALETTE.grassDry)

/** What shows between the stones of a dry wall: no light. The rock's own grey, most of the way to black. */
const DARK = new THREE.Color(PALETTE.rock).multiplyScalar(0.2)

/** The cut edge of a sod: the earth under the grass. */
const EARTH = new THREE.Color(PALETTE.groundFill).lerp(new THREE.Color(PALETTE.path), 0.35)

/** Module-scope scratch. */
const scratch = new THREE.Color()
const at      = new THREE.Vector3()
const facing  = new THREE.Vector3()

/**
 * Give every vertex of a geometry a colour, from where it is and which way its
 * face looks, and drop the attributes the body's material does not read.
 */
function paint (geometry: THREE.BufferGeometry, colourAt: (at: THREE.Vector3, facing: THREE.Vector3) => THREE.Color): THREE.BufferGeometry {
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
 * The inside, seen from outside: a house-shaped block just within the walls'
 * line, from under the ground to under the roof. It is what is dark between
 * the stones, and what keeps the hill from showing through them.
 */
function createCore (foot: number): THREE.BufferGeometry {
  const half  = HALF_DEEP - INSET
  const eave  = underRoof(half) - 0.04
  const shape = new THREE.Shape()

  shape.moveTo(-half, foot)
  shape.lineTo(half, foot)
  shape.lineTo(half, eave)
  shape.lineTo(0, RIDGE - 0.04)
  shape.lineTo(-half, eave)
  shape.closePath()

  const core = new THREE.ExtrudeGeometry(shape, { depth: (HALF_LONG - INSET) * 2, bevelEnabled: false })

  core.translate(0, 0, INSET - HALF_LONG)

  return paint(core, () => DARK)
}

/** The flue: a dark post up the middle of the chimney's stones, to just under their top. */
function createFlue (): THREE.BufferGeometry {
  const half = CHIMNEY.half - 0.2
  const flue = new THREE.BoxGeometry(half * 2, CHIMNEY.over + 0.5, half * 2)

  flue.translate(0, RIDGE + CHIMNEY.over / 2 - 0.35, CHIMNEY.along)

  return paint(flue, () => DARK)
}

/**
 * One side of the roof: a slab of turf from the ridge down past the wall.
 *
 * Grass on top, in sods that do not quite lie level with each other, and the
 * earth showing at its cut edges. `side` is -1 for the uphill slope, 1 for
 * the downhill one.
 */
function createSlope (side: number, noise: ReturnType<typeof createNoise3D>): THREE.BufferGeometry {
  // Past the ridge by enough that the two slopes' top edges meet over it.
  const over   = TURF * Math.tan(PITCH)
  const length = (HALF_DEEP + EAVES) / Math.cos(PITCH) + over
  const slab   = new THREE.BoxGeometry(length, TURF, (HALF_LONG + VERGE) * 2, 4, 1, 6)
  const place  = slab.getAttribute('position')

  // A lump is keyed on where a vertex is, so the corners the box's faces
  // share move together and the slab stays closed.
  for (let index = 0; index < place.count; index += 1)
    if (place.getY(index) > 0)
      place.setY(index, place.getY(index) + noise.sample(place.getX(index) * 1.1, side * 3.3, place.getZ(index) * 1.1) * LUMP)

  const turf = paint(slab, ({ x, z }, { y }) => y > 0.5 ? scratch.copy(GRASS).lerp(DRY, 0.5 + 0.5 * noise.sample(x * 0.7, side * 5.1, z * 0.7)) : EARTH)

  // Laid with its underside on the line from the ridge to the wall's top.
  turf.translate(length / 2 - over, TURF / 2, 0)
  turf.rotateZ(-PITCH)
  turf.translate(0, RIDGE, 0)

  if (side < 0)
    turf.rotateY(Math.PI)

  return turf
}

/**
 * Everything of the shelter that is not a stone, as one geometry in the
 * shelter's own frame: the dark inside, the flue, and the turf roof. Coloured
 * per vertex. `foot` is how far under the floor the lowest ground is.
 */
export function createBodyGeometry (seed: number, foot: number): THREE.BufferGeometry {
  const noise = createNoise3D(seed)
  const parts = [ createCore(foot), createFlue(), createSlope(-1, noise), createSlope(1, noise) ]
  const body  = mergeGeometries(parts)

  for (const part of parts)
    part.dispose()

  body.computeBoundingBox()
  body.computeBoundingSphere()

  return body
}

// perf: cheap — some 250 triangles, built once.
