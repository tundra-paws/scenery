// src/world/features/infield/dyke.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import type { Ground } from '../../shared/ground.ts'
import type { Infield } from '../../shared/infield.ts'
import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Waypoint } from '../../shared/path.ts'


/**
 * The courses of a field dyke, from the ground up: half a stone's length
 * along the wall, its height, and half its depth through the wall. Each a
 * little smaller than the one it sits on, so the wall narrows as it rises.
 */
const COURSES = [
  { half: 0.5, thick: 0.42, depth: 0.4 },
  { half: 0.44, thick: 0.36, depth: 0.34 },
  { half: 0.38, thick: 0.32, depth: 0.29 },
] as const

/** The cope: slabs set on edge across the top, close as books on a shelf. */
const COPE = { half: 0.13, thick: 0.42, depth: 0.3, every: 0.32 } as const

/** How far the lowest course is sunk into the land. */
const SINK = 0.22

/** A post: one long stone stood on end. */
const POST = { half: 0.26, thick: 1.9, depth: 0.26 } as const

/** How much of the rock's darker grey a stone may have in it: some were picked off the field, some came off the hill. */
const PICKED = 0.45

/** Module-scope scratch, so laying a stone allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()
const rock  = new THREE.Color(PALETTE.rock)

/** A place on a line of wall, and the turn that lays a stone's length along it there. */
interface Station extends Waypoint {
  turn: number
}

/** A stone's size: half its length along the wall, its height, and half its depth through it. */
interface Size {
  half:  number
  thick: number
  depth: number
}

/** A stone, ready for the mesh. */
interface Laid {
  matrix: THREE.Matrix4
  colour: THREE.Color
}

/** What laying a stone needs: where they all go, the hand that sets them out of true, and the land. */
interface Waller {
  laid:   Laid[]
  lay:    SeededRng
  ground: Ground
}

/** Lengths along a line of wall at each of its points, from its start. */
function measure (line: readonly Waypoint[]): number[] {
  const lengths = [ 0 ]

  for (let index = 1; index < line.length; index += 1)
    lengths.push(lengths[index - 1]! + Math.hypot(line[index]!.x - line[index - 1]!.x, line[index]!.z - line[index - 1]!.z))

  return lengths
}

/** The place a distance along a line of wall, and the way it runs there. */
function stationAt (line: readonly Waypoint[], lengths: readonly number[], distance: number): Station {
  let index = 1

  while (index < line.length - 1 && lengths[index]! < distance)
    index += 1

  const from = line[index - 1]!
  const to   = line[index]!
  const span = lengths[index]! - lengths[index - 1]! || 1
  const t    = Math.min(1, Math.max(0, (distance - lengths[index - 1]!) / span))

  return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, turn: Math.atan2(from.z - to.z, to.x - from.x) }
}

/** Set one stone, a little out of true, the way a hand leaves it. */
function set (waller: Waller, at: Station, base: number, size: Size): void {
  const { lay } = waller

  dummy.position.set(at.x + lay.range(-0.04, 0.04), base + size.thick * 0.55, at.z + lay.range(-0.04, 0.04))
  dummy.rotation.set(lay.range(-0.08, 0.08), at.turn + lay.range(-0.12, 0.12), lay.range(-0.08, 0.08))
  dummy.scale.set(size.half, size.thick / 1.05, size.depth * lay.range(0.9, 1.12))
  dummy.updateMatrix()

  tint.set(PALETTE.cairn).lerp(rock, lay.range(0, PICKED))
    .offsetHSL(0, 0, lay.range(-0.05, 0.04))
  waller.laid.push({ matrix: dummy.matrix.clone(), colour: tint.clone() })
}

/**
 * One line of wall: its courses stone by stone, each course's joints
 * between the joints of the one under it, and the cope along the top. Every
 * stone stands on the land where it is, so the wall rides over the hill the
 * way a dyke does, not in level courses like a house.
 */
function raise (waller: Waller, line: readonly Waypoint[]): void {
  const lengths = measure(line)
  const length  = lengths.at(-1)!
  const land    = (at: Waypoint): number => waller.ground.heightAt(at.x, at.z) - SINK

  COURSES.forEach((size, course) => {
    const count = Math.max(1, Math.round(length / (size.half * 2)) - (course & 1))
    const below = COURSES.slice(0, course).reduce((sum, under) => sum + under.thick, 0)

    for (let stone = 0; stone < count; stone += 1) {
      const at = stationAt(line, lengths, (stone + 0.5 + (course & 1) * 0.5 + waller.lay.range(-0.08, 0.08)) * length / (count + (course & 1)))

      set(waller, at, land(at) + below * 0.92, size)
    }
  })

  const top = COURSES.reduce((sum, size) => sum + size.thick, 0) * 0.92 - 0.06

  for (let distance = COPE.every / 2; distance < length; distance += COPE.every * waller.lay.range(0.92, 1.1)) {
    const at = stationAt(line, lengths, distance)

    set(waller, at, land(at) + top, { half: COPE.half, thick: COPE.thick * waller.lay.range(0.85, 1.1), depth: COPE.depth })
  }
}

/**
 * Every wall of the infield as one instanced mesh: the field's dyke, the
 * fold, the head-dyke, and the posts at their gaps and ends.
 *
 * Dry stone in the boulders' shape, the cairn's paler grey with some of the
 * rock's in it. The same stones on every tier; a phone gets them cut with
 * fewer facets (`geometry`).
 */
export function layDyke (geometry: THREE.BufferGeometry, material: THREE.Material, lay: SeededRng, ground: Ground, { runs, posts }: Pick<Infield, 'runs' | 'posts'>): THREE.InstancedMesh {
  const waller: Waller = { laid: [], lay, ground }

  for (const run of runs)
    raise(waller, run)

  for (const post of posts)
    set(waller, { ...post }, ground.heightAt(post.x, post.z) - 0.5, POST)

  const mesh = new THREE.InstancedMesh(geometry, material, waller.laid.length)

  waller.laid.forEach((stone, index) => {
    mesh.setMatrixAt(index, stone.matrix)
    mesh.setColorAt(index, stone.colour)
  })

  mesh.name          = 'infield-dyke'
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass). Some five hundred
// stones: 80 triangles each on desktop, 20 on the phone. Laid once; nothing
// per frame.
