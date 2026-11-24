// src/world/features/tufts/heather.ts
import * as THREE from 'three'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { commitInstances, tellReach } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { MOOR_FOOT } from '../../shared/moor.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import type { World } from '../../world.ts'


/** Bushes tried for, by tier. Fewer stand: each is kept by the heather's share where it falls. */
const COUNT: Record<QualityTier, number> = { mobile: 1000, desktop: 3000, highEnd: 4400 }

/** Corners round a bush, and how high its shoulder and its crown stand on a unit width. */
const SIDES    = 5
const SHOULDER = { up: 0.3, out: 0.86 } as const
const CROWN    = 0.44

/**
 * How much of a facet's own lean its light keeps: the rest is straight up, so
 * a bush is lit nearly like the hill under it and reads as a lump in it, not
 * as a dark stone.
 */
const FACETED = 0.3

/** How far a bush keeps from the path, the house and the way to its door, the walls, and the cairn. */
const OFF_PATH  = 2.2
const OFF_HOUSE = 1.4
const OFF_DYKE  = 0.8
const OFF_CAIRN = 5

/** A bush's width, from the smallest to the largest. */
const WIDTH = [ 0.6, 1.25 ] as const

/** Module-scope scratch, so placing a bush allocates nothing. */
const dummy  = new THREE.Object3D()
const tint   = new THREE.Color()
const dark   = new THREE.Color(PALETTE.face)
const straw  = new THREE.Color(PALETTE.grassDry)
const corner = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ]
const edge   = [ new THREE.Vector3(), new THREE.Vector3() ]

/** Lay one triangle into `out`, turned so it faces away from the bush's middle. */
function facet (out: number[], a: readonly number[], b: readonly number[], c: readonly number[]): void {
  corner[0]!.fromArray(a)
  corner[1]!.fromArray(b)
  corner[2]!.fromArray(c)
  edge[0]!.subVectors(corner[1]!, corner[0]!)
  edge[1]!.subVectors(corner[2]!, corner[0]!)

  const facing = edge[0]!.cross(edge[1]!).dot(corner[0]!.add(corner[1]!).add(corner[2]!)
    .setY(0.01))

  out.push(...a, ...facing < 0 ? c : b, ...facing < 0 ? b : c)
}

/**
 * One bush of heather: a low faceted dome, five corners round its foot, five
 * round its shoulder turned half a side, and a crown. Fifteen triangles.
 */
export function createBushGeometry (): THREE.BufferGeometry {
  const foot: number[][]     = []
  const shoulder: number[][] = []
  const crown                = [ 0, CROWN, 0 ]
  const corners: number[]    = []

  for (let side = 0; side < SIDES; side += 1) {
    const angle = side / SIDES * Math.PI * 2
    const half  = angle + Math.PI / SIDES

    foot.push([ Math.cos(angle) * 0.5, -0.05, Math.sin(angle) * 0.5 ])
    shoulder.push([ Math.cos(half) * 0.5 * SHOULDER.out, SHOULDER.up, Math.sin(half) * 0.5 * SHOULDER.out ])
  }

  for (let side = 0; side < SIDES; side += 1) {
    const next = (side + 1) % SIDES

    facet(corners, foot[side]!, foot[next]!, shoulder[side]!)
    facet(corners, shoulder[side]!, foot[next]!, shoulder[next]!)
    facet(corners, shoulder[side]!, shoulder[next]!, crown)
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  geometry.computeVertexNormals()

  const normal = geometry.getAttribute('normal')

  for (let index = 0; index < normal.count; index += 1) {
    corner[0]!.set(normal.getX(index) * FACETED, normal.getY(index) * FACETED + 1 - FACETED, normal.getZ(index) * FACETED).normalize()
    normal.setXYZ(index, corner[0]!.x, corner[0]!.y, corner[0]!.z)
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/** Whether a bush may stand here: off every way and wall, and clear of the cairn. */
function clear (world: World, x: number, z: number): boolean {
  const { path, shelter, infield, summit } = world

  return path.distanceTo(x, z) > OFF_PATH &&
    shelter.distanceTo(x, z) > OFF_HOUSE &&
    shelter.distanceToSpur(x, z) > OFF_HOUSE &&
    infield.distanceTo(x, z) > OFF_DYKE &&
    !infield.inField(x, z) &&
    Math.hypot(x - summit.x, z - summit.z) > OFF_CAIRN
}

/** Pick the colour of one bush: the bloom, browned or darkened by its age. */
function bloom (rng: SeededRng, out: THREE.Color): THREE.Color {
  return out.set(PALETTE.heather)
    .lerp(dark, rng.range(0, 0.15))
    .lerp(straw, rng.next() < 0.25 ? rng.range(0.2, 0.5) : 0)
    .offsetHSL(0, 0, rng.range(0, 0.08))
}

/**
 * The heather on the hill as one instanced mesh, in the grass's material so
 * the two are one program and lean in one wind.
 *
 * Bushes stand where the moor's rule says heather grows, thickest where it
 * has the hill to itself, and only on the open hill: never on a way, under a
 * wall, in the field or on the cairn's spill.
 */
export function plantHeather (world: World, rng: SeededRng, material: THREE.Material): THREE.InstancedMesh {
  const { ground, moor } = world
  const place            = rng.fork('heather:place')
  const keep             = rng.fork('heather:keep')

  const spots = scatterOnGround({
    ground,
    rng:   place,
    count: COUNT[world.quality.tier],

    accept (spot) {
      return (spot.height - ground.waterLevel) / ground.relief > MOOR_FOOT &&
        moor.heatherAt(spot.x, spot.z, spot.height, spot.slope) > keep.next()
    },
  })

  const mesh = new THREE.InstancedMesh(createBushGeometry(), material, spots.length)
  let kept   = 0

  for (const spot of spots) {
    const width = place.range(WIDTH[0], WIDTH[1])

    dummy.position.set(spot.x, spot.height - 0.04, spot.z)
    dummy.rotation.set(place.range(-0.12, 0.12), place.range(0, Math.PI * 2), place.range(-0.12, 0.12))
    dummy.scale.set(width, width * place.range(0.5, 0.8), width * place.range(0.8, 1.1))
    dummy.updateMatrix()
    bloom(place, tint)

    if (!clear(world, spot.x, spot.z))
      continue

    mesh.setMatrixAt(kept, dummy.matrix)
    mesh.setColorAt(kept, tint)
    kept += 1
  }

  mesh.count         = kept
  mesh.name          = 'heather'
  mesh.receiveShadow = true

  // A few thousand knee-high bushes: the sea gives back the hill's bloom
  // from the land's own colour under them.
  keepOutOfMirror(mesh)
  tellReach(mesh)
  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call, no shadow pass, in the grass's program.
// Fifteen triangles a bush: some 1.8k bushes and 27k triangles on desktop,
// 600 and 9k on the phone. Placed once; the lean is the grass's own shader.
