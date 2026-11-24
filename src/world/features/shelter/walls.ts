// src/world/features/shelter/walls.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { commitInstances } from '../../shared/instances.ts'
import { PALETTE } from '../../shared/palette.ts'
import { CHIMNEY, COURSE, DOOR_HALF, DOOR_TOP, EAVE, HALF_DEEP, HALF_LONG, RIDGE, TURF, WINDOW } from './plan.ts'


/** Length of wall a stone takes up, more or less. */
const STONE = 0.95

/** How far a wall's stones stop short of a corner on the courses where the other wall turns it. */
const QUOIN = 0.5

/** Stones the mesh has room for. Half as many again as this plan lays on this land. */
const ROOM = 320

/** Module-scope scratch, so placing an instance allocates nothing. */
const dummy = new THREE.Object3D()
const tint  = new THREE.Color()

/** A place in the shelter's own frame: across the ridge, and along it. */
type Spot = readonly [number, number]

/** What laying a stone needs: the mesh it goes into, where the next one goes, and the land under it. */
interface Mason {
  mesh: THREE.InstancedMesh
  laid: number
  lay:  SeededRng

  /** Height of the ground over the floor, at a place in the shelter's own frame. */
  ground: (across: number, along: number) => number
}

/** One stone, by where its foot is and how big it is. */
interface Stone {
  at:   Spot
  base: number

  /** Half its length, its height in the wall, and half its depth through the wall. */
  half:   number
  thick?: number
  depth?: number

  /** The turn that lays its length along the wall. */
  turn: number
}

/** Lay one stone, a little out of true, the way a hand leaves it. */
function set (mason: Mason, { at, base, half, turn, thick = COURSE, depth = 0.4 }: Stone): void {
  const { lay } = mason

  // On other land the hill may stand lower against the walls and ask for more
  // courses than there is room for: the last stones are then left off.
  if (mason.laid >= ROOM)
    return

  dummy.position.set(at[0] + lay.range(-0.05, 0.05), base + thick * 0.55, at[1] + lay.range(-0.05, 0.05))
  dummy.rotation.set(lay.range(-0.07, 0.07), turn + lay.range(-0.1, 0.1), lay.range(-0.07, 0.07))
  dummy.scale.set(half, thick / 1.05, depth * lay.range(0.9, 1.12))
  dummy.updateMatrix()

  mason.mesh.setMatrixAt(mason.laid, dummy.matrix)
  mason.mesh.setColorAt(mason.laid, tint.set(PALETTE.cairn).offsetHSL(0, 0, lay.range(-0.06, 0.05)))
  mason.laid += 1
}

/**
 * One course of one stretch of wall: stones end to end from `from` to `to`,
 * one more of them on every other course so no joint stands over another.
 * A stone that would lie wholly under the ground is not laid.
 */
function run (mason: Mason, from: Spot, to: Spot, base: number): void {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])

  if (length < 0.3)
    return

  const count = Math.max(1, Math.round(length / STONE) + (Math.round(base / COURSE) & 1))
  const turn  = Math.atan2(from[1] - to[1], to[0] - from[0])

  for (let stone = 0; stone < count; stone += 1) {
    const along  = (stone + 0.5 + mason.lay.range(-0.1, 0.1)) / count
    const at     = [ from[0] + (to[0] - from[0]) * along, from[1] + (to[1] - from[1]) * along ] as const
    const half   = length / count * mason.lay.range(0.56, 0.66)
    const buried = base + COURSE < mason.ground(at[0], at[1]) - 0.1

    if (!buried)
      set(mason, { at, base, half, turn })
  }
}

/** The stretches of one wall line on one course, less an opening where the course crosses one. */
function around (mason: Mason, from: Spot, to: Spot, base: number, opening: readonly [Spot, Spot] | null): void {
  if (opening) {
    run(mason, from, opening[0], base)
    run(mason, opening[1], to, base)
  }
  else
    run(mason, from, to, base)
}

/** The four walls up to the eaves, with the doorway and the window left out of them. */
function raiseWalls (mason: Mason, lowest: number): void {
  for (let base = Math.floor(lowest / COURSE) * COURSE; base < EAVE - 0.01; base += COURSE) {
    // The corners are turned by the long walls on one course and by the
    // gables on the next, so they lock, as a dry wall's must.
    const long  = Math.round(base / COURSE) & 1 ? HALF_LONG - QUOIN : HALF_LONG
    const deep  = Math.round(base / COURSE) & 1 ? HALF_DEEP : HALF_DEEP - QUOIN
    const light = base + COURSE > WINDOW.sill && base < WINDOW.head
    const door  = base + COURSE > 0 && base < DOOR_TOP

    around(mason, [ -HALF_DEEP, -long ], [ -HALF_DEEP, long ], base, null)
    around(mason, [ HALF_DEEP, -long ], [ HALF_DEEP, long ], base, light ? [[ HALF_DEEP, WINDOW.from ], [ HALF_DEEP, WINDOW.to ]] : null)
    around(mason, [ -deep, -HALF_LONG ], [ deep, -HALF_LONG ], base, null)
    around(mason, [ -deep, HALF_LONG ], [ deep, HALF_LONG ], base, door ? [[ -DOOR_HALF, HALF_LONG ], [ DOOR_HALF, HALF_LONG ]] : null)
  }
}

/** The two gables, from the eaves up under the roof, each course shorter than the one it sits on. */
function raiseGables (mason: Mason): void {
  for (let base = EAVE; base < RIDGE - COURSE * 0.5; base += COURSE) {
    const half = HALF_DEEP * (1 - (base + COURSE * 0.7 - EAVE) / (RIDGE - EAVE))

    for (const along of [ -HALF_LONG, HALF_LONG ])
      if (half > 0.5)
        run(mason, [ -half, along ], [ half, along ], base)
      else
        set(mason, { at: [ 0, along ], base, half: 0.5, turn: 0, thick: COURSE * 0.8 })
  }
}

/** The stones that are not wall: a lintel and a threshold for the door, the chimney, and a row along the ridge to hold the turf. */
function dress (mason: Mason): void {
  const { lay, ground } = mason
  const ridge           = RIDGE + TURF * 1.1

  set(mason, { at: [ 0, HALF_LONG + 0.05 ], base: DOOR_TOP - 0.08, half: DOOR_HALF + 0.55, turn: 0, thick: 0.36, depth: 0.56 })
  set(mason, { at: [ 0, HALF_LONG + 0.7 ], base: ground(0, HALF_LONG + 0.7) - 0.08, half: 1, turn: 0, thick: 0.2, depth: 0.7 })

  // Two stones a course, laid across the two under them, round a flue.
  for (let course = 0; course * COURSE < CHIMNEY.over + 0.6; course += 1)
    for (const side of [ -1, 1 ]) {
      const off = side * (CHIMNEY.half - 0.26)
      const at  = course & 1 ? [ off, CHIMNEY.along ] as const : [ 0, CHIMNEY.along + off ] as const

      set(mason, { at, base: RIDGE - 0.6 + course * COURSE, half: CHIMNEY.half, turn: course & 1 ? Math.PI / 2 : 0, depth: 0.34 })
    }

  for (let along = CHIMNEY.along + CHIMNEY.half + 0.75; along < HALF_LONG + 0.3; along += lay.range(1, 1.25))
    set(mason, { at: [ 0, along ], base: ridge, half: lay.range(0.42, 0.54), turn: Math.PI / 2, thick: 0.2, depth: 0.36 })
}

/**
 * The shelter's stonework, in its own frame: four walls and two gables laid
 * dry in level courses, the boulders' own shape in the cairn's paler grey.
 *
 * One instanced mesh, the same on every tier: a wall with half its stones is
 * not a wall. `ground` says how high the land stands against it, so the
 * courses start where the hill does on each side.
 */
export function layWalls (geometry: THREE.BufferGeometry, material: THREE.Material, lay: SeededRng, ground: Mason['ground']): THREE.InstancedMesh {
  const mesh  = new THREE.InstancedMesh(geometry, material, ROOM)
  const mason = { mesh, laid: 0, lay, ground }

  let lowest = 0

  for (const across of [ -HALF_DEEP, HALF_DEEP ])
    for (let along = -HALF_LONG; along <= HALF_LONG; along += 1)
      lowest = Math.min(lowest, ground(across, along))

  raiseWalls(mason, lowest - 0.3)
  raiseGables(mason)
  dress(mason)

  mesh.name          = 'shelter-walls'
  mesh.count         = mason.laid
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass). 209 stones of 80
// triangles: 17k on every tier. Laid once; nothing per frame.
