// src/world/features/waymarks/index.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { keepOutOfMirror } from '../../shared/mirror.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import type { Ground } from '../../shared/ground.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Path, Waypoint } from '../../shared/path.ts'
import { SQUAT, createStoneGeometry } from '../../shared/stone.ts'
import { inWorld, stone } from '../../shared/surface.ts'
import { waterline } from '../../shared/wash.ts'
import type { Wash } from '../../shared/wash.ts'
import type { Feature, World } from '../../world.ts'


/** Distance along the path from the waterline to the first waymark, and from each to the next. */
const FIRST = 11
const GAP   = 15

/** No waymark this close to the top of the path: the cairn is the last one. */
const LAST = 9

/** How far from the middle of the path a waymark stands. */
const ASIDE = 2.7

/** Stones in a waymark's stack under its cap, and the radius of the lowest and the highest. */
const COURSES     = 4
const BASE_RADIUS = 1.15
const TOP_RADIUS  = 0.55

/** Half the clear width of the landing, between its two rows of stones. */
const SLIP = 2.5

/** The rows run from this far up the beach to this far out into the water, a stone every so often. */
const SLIP_UP   = 6.5
const SLIP_OUT  = 5.5
const SLIP_STEP = 1.5

/** Stones in the two rows, and the two stood on end at their head. */
const SLIP_STONES = (Math.floor((SLIP_UP + SLIP_OUT) / SLIP_STEP) + 1) * 2 + 2

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** What laying a stone needs: the mesh it goes into, where the next one goes, and the land under it. */
interface Mason {
  mesh:   THREE.InstancedMesh
  laid:   number
  ground: Ground
  lay:    SeededRng
}

/** Put the stone that `dummy` describes into the mesh. */
function set (mason: Mason, lightness: number): void {
  dummy.updateMatrix()
  mason.mesh.setMatrixAt(mason.laid, dummy.matrix)
  mason.mesh.setColorAt(mason.laid, tint.set(PALETTE.cairn).offsetHSL(0, 0, lightness))
  mason.laid += 1
}

/** A waymark: the summit cairn in small, four flat stones and one stood on end, chest high. */
function stack (mason: Mason, { x, z }: Waypoint): void {
  const { ground, lay } = mason

  // Sunk a little, so the base course meets the ground all round on a slope.
  let top = ground.heightAt(x, z) - 0.2

  for (let course = 0; course < COURSES; course += 1) {
    const radius = THREE.MathUtils.lerp(BASE_RADIUS, TOP_RADIUS, course / (COURSES - 1))
    const thick  = radius * lay.range(0.42, 0.55)
    const wander = radius * 0.14

    dummy.position.set(x + lay.range(-wander, wander), top + thick * 0.6, z + lay.range(-wander, wander))
    dummy.rotation.set(lay.range(-0.08, 0.08), lay.range(0, Math.PI * 2), lay.range(-0.08, 0.08))
    dummy.scale.set(radius, thick, radius * lay.range(0.85, 1.05))
    set(mason, lay.range(-0.05, 0.05))

    top += thick * 1.05
  }

  dummy.position.set(x, top + 0.46, z)
  dummy.rotation.set(0.06, lay.range(0, Math.PI * 2), -0.05)
  dummy.scale.set(0.33, 1.05, 0.26)
  set(mason, 0.04)
}

/**
 * Where the waymark `distance` along the path stands: beside it, on whichever
 * side is clear of the path's other legs, and the lower one where both are.
 */
function standBeside (path: Path, ground: Ground, distance: number): Waypoint {
  const { x, z, ahead } = path.at(distance)
  const left            = { x: x - ahead[1] * ASIDE, z: z + ahead[0] * ASIDE }
  const right           = { x: x + ahead[1] * ASIDE, z: z - ahead[0] * ASIDE }
  const clearer         = path.distanceTo(left.x, left.z) - path.distanceTo(right.x, right.z)

  if (Math.abs(clearer) > 0.3)
    return clearer > 0 ? left : right

  return ground.heightAt(left.x, left.z) < ground.heightAt(right.x, right.z) ? left : right
}

/**
 * The landing: two rows of stones from the top of the beach down into the
 * water, with the sand between them cleared for a keel, and a stone stood on
 * end at the head of each row. The sea is told which stand in it.
 */
function layLanding (mason: Mason, path: Path, wash: Wash): void {
  const { ground, lay }               = mason
  const { x, z, seaward: [ dx, dz ] } = path.landing

  for (const side of [ -1, 1 ]) {
    for (let out = -SLIP_UP; out <= SLIP_OUT; out += SLIP_STEP) {
      const aside = side * (SLIP + lay.range(-0.2, 0.2))
      const along = out + lay.range(-0.25, 0.25)
      const size  = lay.range(0.55, 0.95)
      const sx    = x + dx * along - dz * aside
      const sz    = z + dz * along + dx * aside

      // In the water a stone sits on the bottom, but never wholly under it.
      dummy.position.set(sx, Math.max(ground.heightAt(sx, sz), ground.waterLevel - size * 0.35) + size * 0.12, sz)
      dummy.rotation.set(lay.range(-0.25, 0.25), lay.range(0, Math.PI * 2), lay.range(-0.25, 0.25))
      dummy.scale.set(size, size * lay.range(0.7, 0.95), size * lay.range(0.85, 1.15))
      set(mason, lay.range(-0.08, 0.03))

      // Those out in the water break it.
      wash.stand(sx, sz, waterline(dummy.position.y, size, dummy.scale.y * SQUAT, ground.waterLevel))
    }

    const hx = x - dx * (SLIP_UP + 1.4) - dz * side * SLIP
    const hz = z - dz * (SLIP_UP + 1.4) + dx * side * SLIP

    dummy.position.set(hx, ground.heightAt(hx, hz) + 1.1, hz)
    dummy.rotation.set(lay.range(-0.07, 0.07), lay.range(0, Math.PI * 2), lay.range(-0.07, 0.07))
    dummy.scale.set(0.6, 2.1, 0.46)
    set(mason, 0.03)
  }
}

/**
 * What marks the way: a landing on the shore where the path begins, and small
 * cairns beside the path so it can be followed up to the big one.
 *
 * Placed stone, all of it: the boulders' own shape in the cairn's paler grey,
 * one instanced mesh, the same stones on every tier because each is a sign.
 */
export function createWaymarks (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null

  return {
    name: 'waymarks',

    build ({ scene, rng }) {
      const { ground, path } = world
      const marks: number[]  = []

      for (let distance = FIRST; distance < path.length - LAST; distance += GAP)
        marks.push(distance)

      // A phone cuts them with a quarter of the facets, as it does every wall:
      // the stone's grain carries them, and they are drawn three times.
      const geometry = createStoneGeometry(rng.fork('waymarks:shape').int(1, 1_000_000), world.quality.tier === 'mobile' ? 0 : 1)
      const material = createLitMaterial(world, { name: 'waymark' })

      material.finish(stone(inWorld(world.quality.tier)))

      mesh = new THREE.InstancedMesh(geometry, material, marks.length * (COURSES + 1) + SLIP_STONES)
      mesh.name          = 'waymarks'
      mesh.castShadow    = true
      mesh.receiveShadow = true

      const mason = { mesh, laid: 0, ground, lay: rng.fork('waymarks:lay') }

      for (const distance of marks)
        stack(mason, standBeside(path, ground, distance))

      layLanding(mason, path, world.wash)

      mesh.count = mason.laid

      // A phone's sea gives back none of them, as it gives back no wall:
      // small stones on the hill, and the landing's few at the water's edge.
      if (world.quality.tier === 'mobile')
        keepOutOfMirror(mesh)

      commitInstances(mesh)
      scene.add(mesh)
    },

    dispose () {
      disposeInstances(mesh)
      mesh = null
    },
  }
}

// perf: cheap — one draw call (two with its shadow pass). Five waymarks of
// five stones and a landing of twenty: 3.6k triangles, 0.9k on a phone. Built
// once; nothing per frame.
