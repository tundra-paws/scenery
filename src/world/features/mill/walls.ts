// src/world/features/mill/walls.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { commitInstances } from '../../shared/instances.ts'
import { runAround, runCourse, setStone } from '../../shared/masonry.ts'
import type { Mason, Spot } from '../../shared/masonry.ts'
import { SQUAT } from '../../shared/stone.ts'
import { COURSE, DOOR, DOOR_HALF, DOOR_TOP, EAVE, HALF_DEEP, HALF_LONG, INLET_HALF, OUTLET_HALF, RACE, RIDGE, ROOF, UNDER } from './plan.ts'

/** How far a wall's stones stop short of a corner on the courses where the other wall turns it. */
const QUOIN = 0.5

/** Stones the mesh has room for. Half as many again as this plan lays on this land. */
const ROOM = 330

/** A slab of the bridge: half its width, its thickness, and how far the two lie from the middle of the way. */
const SLAB = { wide: 0.5, thick: 0.24, apart: 0.47 } as const

/** A worn-out millstone, left leaning on the wall by the door: half its width, its thickness, and where along the wall it leans. */
const WORN = { half: 0.62, thick: 0.2, along: DOOR + 1.5 } as const

/** Something laid outside the mill's walls, given in its own frame. */
export interface Slab {

  /** Where its middle is, across and along, and the height of its foot over the floor. */
  at:   Spot
  base: number

  /** Half its length, and the turn about the vertical that lays its length. */
  half: number
  turn: number
}

/** The four walls up to the eaves, with the door and the two holes the water goes by left out of them. */
function raiseWalls (mason: Mason, lowest: number): void {
  for (let base = Math.floor(lowest / COURSE) * COURSE; base < EAVE - 0.01; base += COURSE) {
    // The corners are turned by the long walls on one course and by the
    // gables on the next, so they lock, as a dry wall's must.
    const odd  = Math.round(base / COURSE) & 1
    const long = odd ? HALF_LONG - QUOIN : HALF_LONG
    const deep = odd ? HALF_DEEP : HALF_DEEP - QUOIN

    // Under the floor the water's holes; over it, the door.
    const wet  = base < -UNDER
    const door = base > -0.01 && base < DOOR_TOP - 0.01
    const into = wet ? [[ -HALF_DEEP, RACE - INLET_HALF ], [ -HALF_DEEP, RACE + INLET_HALF ]] as const : null
    const way  = door ? [[ -HALF_DEEP, DOOR - DOOR_HALF ], [ -HALF_DEEP, DOOR + DOOR_HALF ]] as const : null

    runAround(mason, [ -HALF_DEEP, -long ], [ -HALF_DEEP, long ], base, into ?? way)
    runAround(mason, [ HALF_DEEP, -long ], [ HALF_DEEP, long ], base, wet ? [[ HALF_DEEP, RACE - OUTLET_HALF ], [ HALF_DEEP, RACE + OUTLET_HALF ]] : null)
    runCourse(mason, [ -deep, -HALF_LONG ], [ deep, -HALF_LONG ], base)
    runCourse(mason, [ -deep, HALF_LONG ], [ deep, HALF_LONG ], base)
  }
}

/** The two gables, from the eaves up under the roof, each course shorter than the one it sits on. */
function raiseGables (mason: Mason): void {
  for (let base = EAVE; base < RIDGE - COURSE * 0.5; base += COURSE) {
    const half = HALF_DEEP * (1 - (base + COURSE * 0.7 - EAVE) / (RIDGE - EAVE))

    for (const along of [ -HALF_LONG, HALF_LONG ])
      if (half > 0.5)
        runCourse(mason, [ -half, along ], [ half, along ], base)
      else
        setStone(mason, { at: [ 0, along ], base, half: 0.5, turn: 0, thick: COURSE * 0.8 })
  }
}

/**
 * The stones that are not wall: a long one over each of the three openings,
 * a step at the door, a row along the ridge to hold the turf, and the old
 * millstone, worn too thin to grind, leaning where it was rolled out.
 */
function dress (mason: Mason): void {
  const { lay, ground } = mason
  const across          = Math.PI / 2
  const sill            = ground(-HALF_DEEP - 0.62, DOOR)

  setStone(mason, { at: [ -HALF_DEEP - 0.04, DOOR ], base: DOOR_TOP - 0.06, half: DOOR_HALF + 0.5, turn: across, thick: 0.34, depth: 0.52 })
  setStone(mason, { at: [ -HALF_DEEP - 0.04, RACE ], base: -UNDER - 0.04, half: INLET_HALF + 0.5, turn: across, thick: 0.34, depth: 0.52 })
  setStone(mason, { at: [ HALF_DEEP + 0.04, RACE ], base: -UNDER - 0.1, half: OUTLET_HALF + 0.55, turn: across, thick: 0.42, depth: 0.54 })

  // The step, and under it another where the ground lies lower than a stride.
  setStone(mason, { at: [ -HALF_DEEP - 0.62, DOOR ], base: Math.max(sill, -0.3) - 0.08, half: 0.8, turn: across, thick: 0.22, depth: 0.52 })

  for (let along = -HALF_LONG - 0.1; along < HALF_LONG + 0.3; along += lay.range(0.95, 1.2))
    setStone(mason, { at: [ 0, along ], base: RIDGE + ROOF.turf * 1.1, half: lay.range(0.4, 0.5), turn: across, thick: 0.2, depth: 0.34 })

  // The millstone: one stone flattened to a disc and stood on its edge against the wall.
  const foot = ground(-HALF_DEEP - 0.5, WORN.along)

  setStone(mason, { at: [ -HALF_DEEP - 0.5, WORN.along ], base: foot + 0.1, half: WORN.half, turn: across, thick: WORN.half * 1.05 / SQUAT, depth: WORN.thick })
}

/**
 * The mill's stonework, in its own frame: four walls and two gables laid dry
 * in level courses, as the house's are, and whatever `slabs` lie outside
 * them (the bridge over the burn above it).
 *
 * One instanced mesh, the same on every tier: a wall with half its stones is
 * not a wall. `ground` says how high the land stands against it, so the
 * courses start where the hill does on each side: three under the door, and
 * a dozen under the eaves where the water leaves.
 */
export function layWalls (geometry: THREE.BufferGeometry, material: THREE.Material, lay: SeededRng, ground: Mason['ground'], slabs: readonly Slab[]): THREE.InstancedMesh {
  const mesh  = new THREE.InstancedMesh(geometry, material, ROOM)
  const mason = { mesh, laid: 0, lay, ground, course: COURSE }

  let lowest = 0

  for (const across of [ -HALF_DEEP, HALF_DEEP ])
    for (let along = -HALF_LONG; along <= HALF_LONG; along += 0.8)
      lowest = Math.min(lowest, ground(across, along))

  raiseWalls(mason, lowest - 0.3)
  raiseGables(mason)
  dress(mason)

  // Two slabs side by side make a way a stride wide.
  for (const { at, base, half, turn } of slabs)
    for (const side of [ -1, 1 ])
      setStone(mason, { at: [ at[0] + Math.sin(turn) * side * SLAB.apart, at[1] + Math.cos(turn) * side * SLAB.apart ], base, half, turn, thick: SLAB.thick, depth: SLAB.wide })

  mesh.name          = 'mill-walls'
  mesh.count         = mason.laid
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass, three with the
// sea's). Some 230 stones of 20 triangles: under 5k on every tier. Laid
// once; nothing per frame.
