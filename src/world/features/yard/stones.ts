// src/world/features/yard/stones.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import type { Ground } from '../../shared/ground.ts'
import { commitInstances } from '../../shared/instances.ts'
import { setStone } from '../../shared/masonry.ts'
import type { Mason } from '../../shared/masonry.ts'
import type { Kiln, Stack, Yard } from '../../shared/yard.ts'
import { COURSE, KILN, ROPES, STACK, STEDDLE, ringed } from './plan.ts'

/** Length of wall a stone takes up, more or less: the house's. */
const STONE = 0.95

/** Stones the mesh has room for. Half as many again as this yard lays on this land. */
const ROOM = 420

/** The turn that lays a stone's length round a ring, where the ring is at `angle`. */
function round (angle: number): number {
  return Math.PI / 2 - angle
}

/**
 * The kiln's wall: courses laid in rings, each a little smaller than the
 * one under it, the joints of one over the stones of the next. They start
 * where the hill is, so the low side stands a storey and the back is dug
 * in; and they leave the mouth open under one long stone.
 */
function raiseKiln (mason: Mason, kiln: Kiln, ground: Ground): void {
  const { lay } = mason
  let lowest    = 0

  for (let step = 0; step < 16; step += 1) {
    const [ x, z ] = ringed(kiln, KILN.radius, step * Math.PI / 8)

    lowest = Math.min(lowest, ground.heightAt(x, z) - kiln.floor)
  }

  for (let course = Math.floor((lowest - 0.3) / COURSE); course < KILN.courses; course += 1) {
    const base   = kiln.floor + course * COURSE
    const radius = KILN.radius - KILN.batter * Math.max(0, course)
    const count  = Math.round(Math.PI * 2 * radius / STONE)
    const gape   = Math.asin(KILN.mouthHalf / radius) + 0.5 * Math.PI / count
    const open   = course >= 0 && course * COURSE < KILN.mouthTop - 0.01

    for (let stone = 0; stone < count; stone += 1) {
      const from     = (stone + (course & 1) * 0.5 + lay.range(-0.08, 0.08)) / count * Math.PI * 2
      const half     = Math.PI * radius / count * lay.range(1.1, 1.3)
      const angle    = kiln.bearing + from
      const [ x, z ] = ringed(kiln, radius, angle)
      const buried   = base + COURSE < ground.heightAt(x, z) - 0.1
      const mouth    = open && Math.min(from, Math.PI * 2 - from) < gape

      // Left out after its draws are taken, so the rest of the ring stays where it was.
      if (!buried && !mouth)
        setStone(mason, { at: [ x, z ], base, half, turn: round(angle) })
    }
  }

  // The long stone over the mouth, the flat one before it, and a few round
  // the vent to hold the turf down.
  setStone(mason, { at: ringed(kiln, KILN.radius - KILN.batter * 3 + 0.06, kiln.bearing), base: kiln.floor + KILN.mouthTop - 0.06, half: KILN.mouthHalf + 0.5, turn: round(kiln.bearing), thick: 0.36, depth: 0.5 })

  const sill = ringed(kiln, KILN.radius + 0.75, kiln.bearing)

  setStone(mason, { at: sill, base: Math.min(kiln.floor, ground.heightAt(...sill)) - 0.1, half: 0.8, turn: round(kiln.bearing), thick: 0.2, depth: 0.5 })

  for (let stone = 0; stone < 5; stone += 1) {
    const angle = stone * Math.PI * 2 / 5 + lay.range(-0.2, 0.2)

    setStone(mason, { at: ringed(kiln, KILN.vent + 0.3, angle), base: kiln.floor + KILN.apex - 0.42, half: 0.3, turn: round(angle), thick: 0.2, depth: 0.2 })
  }
}

/**
 * A stack's base: a ring of stones to keep the sheaves off the wet, its top
 * level, and under it as many more as the fall of the ground asks for.
 * And, on a stack that is thatched, a stone on the end of every rope.
 */
function found (mason: Mason, stack: Stack, ground: Ground): void {
  const { lay } = mason
  const radius  = STACK.foot * stack.size - 0.06
  const turned  = lay.range(0, Math.PI * 2)

  for (let course = 0; course < 6; course += 1) {
    const base = stack.base - STEDDLE.thick * (course + 1)

    for (let stone = 0; stone < STEDDLE.round; stone += 1) {
      const angle    = turned + (stone + (course & 1) * 0.5 + lay.range(-0.1, 0.1)) / STEDDLE.round * Math.PI * 2
      const half     = Math.PI * radius / STEDDLE.round * lay.range(1.15, 1.35)
      const [ x, z ] = ringed(stack, radius, angle)

      if (base + STEDDLE.thick > ground.heightAt(x, z) - 0.12)
        setStone(mason, { at: [ x, z ], base, half, turn: round(angle), thick: STEDDLE.thick, depth: 0.34 })
    }
  }

  if (stack.raised < 1)
    return

  for (let rope = 0; rope < ROPES; rope += 1) {
    const angle = turned + (rope + 0.5) / ROPES * Math.PI * 2

    setStone(mason, { at: ringed(stack, STACK.drip[0] * stack.size + 0.05, angle), base: stack.base + (STACK.drip[1] - 0.46) * stack.size, half: 0.15, turn: round(angle), thick: 0.2, depth: 0.13 })
  }
}

/**
 * Every stone of the yard as one instanced mesh, in the world's own frame:
 * the kiln's wall, the stacks' bases, and the weights on their ropes.
 *
 * The house's stone, the cairn's paler grey, twenty facets a stone on every
 * tier as the dykes are. A ring is laid like a wall that comes round to its
 * own beginning.
 */
export function layStones (geometry: THREE.BufferGeometry, material: THREE.Material, lay: SeededRng, ground: Ground, yard: Yard): THREE.InstancedMesh {
  const mesh  = new THREE.InstancedMesh(geometry, material, ROOM)
  const mason = { mesh, laid: 0, lay, course: COURSE, ground: (x: number, z: number): number => ground.heightAt(x, z) }

  raiseKiln(mason, yard.kiln, ground)

  for (const stack of yard.stacks)
    found(mason, stack, ground)

  mesh.name          = 'yard-stones'
  mesh.count         = mason.laid
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass). Some 250 stones of
// 20 triangles: 5k on every tier. Laid once; nothing per frame.
