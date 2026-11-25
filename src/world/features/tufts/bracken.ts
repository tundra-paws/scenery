// src/world/features/tufts/bracken.ts
import * as THREE from 'three'
import type { QualityTier, SeededRng } from 'threejs-scenes'

import { commitInstances, tellReach } from '../../shared/instances.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { scatterOnGround } from '../../shared/scatter.ts'
import type { World } from '../../world.ts'


/** Clumps tried for, by tier. Fewer stand: each is kept by the bracken's share where it falls. */
const COUNT: Record<QualityTier, number> = { mobile: 900, desktop: 2400, highEnd: 3400 }

/** How far round from the last each frond of a clump is set: the golden angle, so none stand over another. */
const ROUND = 2.4

/**
 * A frond, on a unit clump: where its blade starts on the stalk, and its
 * tip, as `[out, up]`; and how far out its wings spread widest, how wide,
 * and how high, over the line from foot to tip, so each blade is folded
 * along its rib and droops at the end, as a dying frond does.
 */
const STALK = [ 0.12, 0.72 ] as const
const TIP   = [ 1.02, 0.52 ] as const
const WING  = { out: 0.48, wide: 0.3, up: 0.84 } as const

/** Fronds in a clump, by tier: a phone's clumps are fewer-fronded, and the bed's rust on the land carries the rest. */
const FRONDS: Record<QualityTier, number> = { mobile: 3, desktop: 5, highEnd: 5 }

/** How much of a facet's own lean its light keeps; the rest is straight up, so a bed reads as the slope it covers. */
const FACETED = 0.4

/** How far a clump keeps from the house, the mill, the yard and their ways, and from the cairn. */
const OFF_HOUSE = 1.6
const OFF_CAIRN = 5

/** A clump's spread, from the smallest to the largest, and its height against that. */
const WIDTH = [ 0.75, 1.35 ] as const
const RISE  = [ 0.7, 1.05 ] as const

/** Module-scope scratch, so placing a clump allocates nothing. */
const dummy  = new THREE.Object3D()
const tint   = new THREE.Color()
const dark   = new THREE.Color(PALETTE.face)
const gold   = new THREE.Color(PALETTE.barley)
const green  = new THREE.Color(PALETTE.grassDry)
const normal = new THREE.Vector3()

/**
 * One clump of bracken: a few fronds round a crown, each a blade folded
 * along its rib, held out and drooping at the tip. Two triangles a frond,
 * ten a clump on desktop.
 */
export function createFrondGeometry (fronds: number): THREE.BufferGeometry {
  const corners: number[] = []

  for (let frond = 0; frond < fronds; frond += 1) {
    const angle = frond * ROUND
    const along = [ Math.cos(angle), Math.sin(angle) ] as const
    const aside = [ -along[1], along[0] ] as const
    const reach = 0.85 + 0.15 * Math.sin(frond * 1.7)

    const at = (out: number, up: number, side = 0): number[] => [
      along[0] * out * reach + aside[0] * side,
      up,
      along[1] * out * reach + aside[1] * side,
    ]

    const foot  = at(STALK[0], STALK[1])
    const tip   = at(TIP[0], TIP[1])
    const left  = at(WING.out, WING.up, WING.wide)
    const right = at(WING.out, WING.up, -WING.wide)

    // The stalk is left to the eye: the blades are held over the bed's own
    // rust on the land, and from any distance a stalk is under a pixel.
    corners.push(...foot, ...left, ...tip, ...foot, ...tip, ...right)
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
  geometry.computeVertexNormals()

  const normals = geometry.getAttribute('normal')

  for (let index = 0; index < normals.count; index += 1) {
    normal.set(normals.getX(index), normals.getY(index), normals.getZ(index))

    // Either face of a blade may be the one seen: keep the one turned up.
    if (normal.y < 0)
      normal.negate()

    normal.multiplyScalar(FACETED).setY(normal.y + 1 - FACETED)
      .normalize()
    normals.setXYZ(index, normal.x, normal.y, normal.z)
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return geometry
}

/** Whether a clump may stand here: off the buildings, the yard and the ways to their doors, and clear of the cairn. */
function clear (world: World, x: number, z: number): boolean {
  const { shelter, summit, mill, yard } = world

  return shelter.distanceTo(x, z) > OFF_HOUSE &&
    shelter.distanceToSpur(x, z) > OFF_HOUSE &&
    mill.distanceTo(x, z) > OFF_HOUSE &&
    mill.distanceToSpur(x, z) > OFF_HOUSE &&
    yard.distanceTo(x, z) > OFF_HOUSE &&
    yard.distanceToSpur(x, z) > OFF_HOUSE &&
    Math.hypot(x - summit.x, z - summit.z) > OFF_CAIRN
}

/** The colour of one clump: rust, some of it browner, some still going over from the yellow, a few the barley's gold. */
function turned (rng: SeededRng, out: THREE.Color): THREE.Color {
  const late = rng.next()

  out.set(PALETTE.bracken)

  if (late < 0.18)
    out.lerp(green, rng.range(0.35, 0.6))
  else if (late < 0.34)
    out.lerp(gold, rng.range(0.3, 0.55))
  else
    out.lerp(dark, rng.range(0, 0.25))

  return out.offsetHSL(0, rng.range(-0.04, 0.04), rng.range(-0.03, 0.06))
}

/**
 * The bracken on the lower hill as one instanced mesh, in the grass's
 * material, so it is the same program and leans in the same wind.
 *
 * Clumps stand where the bracken's rule says it grows, thickest in the
 * middle of a bed, and the land under them is the same rust
 * (`terrain/land.ts`), so a bed reads from across the sound.
 */
export function plantBracken (world: World, rng: SeededRng, material: THREE.Material): THREE.InstancedMesh {
  const { ground, bracken } = world
  const place               = rng.fork('bracken:place')
  const keep                = rng.fork('bracken:keep')

  const spots = scatterOnGround({
    ground,
    rng:   place,
    count: COUNT[world.quality.tier],

    accept (spot) {
      return bracken.brackenAt(spot.x, spot.z, spot.height, spot.slope) > keep.next()
    },
  })

  const mesh = new THREE.InstancedMesh(createFrondGeometry(FRONDS[world.quality.tier]), material, spots.length)
  let kept   = 0

  for (const spot of spots) {
    const width = place.range(WIDTH[0], WIDTH[1])

    dummy.position.set(spot.x, spot.height - 0.05, spot.z)
    dummy.rotation.set(place.range(-0.1, 0.1), place.range(0, Math.PI * 2), place.range(-0.1, 0.1))
    dummy.scale.set(width, width * place.range(RISE[0], RISE[1]), width)
    dummy.updateMatrix()
    turned(place, tint)

    if (!clear(world, spot.x, spot.z))
      continue

    mesh.setMatrixAt(kept, dummy.matrix)
    mesh.setColorAt(kept, tint)
    kept += 1
  }

  mesh.count         = kept
  mesh.name          = 'bracken'
  mesh.receiveShadow = true

  // Knee-high fronds by the thousand: the sea gives back the beds from the
  // land's own rust under them.
  keepOutOfMirror(mesh)
  tellReach(mesh)
  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call, no shadow pass, in the grass's program.
// Ten triangles a clump on desktop, six on a phone: 2.4k clumps and 24k
// triangles on desktop, 900 and 5k on a phone. Placed once; the lean is the grass's own
// shader.
