// src/world/features/shelter/walls.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import { commitInstances } from '../../shared/instances.ts'
import { runAround, runCourse, setStone } from '../../shared/masonry.ts'
import type { Mason } from '../../shared/masonry.ts'
import { CHIMNEY, COURSE, DOOR_HALF, DOOR_TOP, EAVE, HALF_DEEP, HALF_LONG, RIDGE, TURF, WINDOW } from './plan.ts'


/** How far a wall's stones stop short of a corner on the courses where the other wall turns it. */
const QUOIN = 0.5

/** Stones the mesh has room for. Half as many again as this plan lays on this land. */
const ROOM = 320

/** The four walls up to the eaves, with the doorway and the window left out of them. */
function raiseWalls (mason: Mason, lowest: number): void {
  for (let base = Math.floor(lowest / COURSE) * COURSE; base < EAVE - 0.01; base += COURSE) {
    // The corners are turned by the long walls on one course and by the
    // gables on the next, so they lock, as a dry wall's must.
    const long  = Math.round(base / COURSE) & 1 ? HALF_LONG - QUOIN : HALF_LONG
    const deep  = Math.round(base / COURSE) & 1 ? HALF_DEEP : HALF_DEEP - QUOIN
    const light = base + COURSE > WINDOW.sill && base < WINDOW.head
    const door  = base + COURSE > 0 && base < DOOR_TOP

    runAround(mason, [ -HALF_DEEP, -long ], [ -HALF_DEEP, long ], base, null)
    runAround(mason, [ HALF_DEEP, -long ], [ HALF_DEEP, long ], base, light ? [[ HALF_DEEP, WINDOW.from ], [ HALF_DEEP, WINDOW.to ]] : null)
    runAround(mason, [ -deep, -HALF_LONG ], [ deep, -HALF_LONG ], base, null)
    runAround(mason, [ -deep, HALF_LONG ], [ deep, HALF_LONG ], base, door ? [[ -DOOR_HALF, HALF_LONG ], [ DOOR_HALF, HALF_LONG ]] : null)
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

/** The stones that are not wall: a lintel and a threshold for the door, the chimney, and a row along the ridge to hold the turf. */
function dress (mason: Mason): void {
  const { lay, ground } = mason
  const ridge           = RIDGE + TURF * 1.1

  setStone(mason, { at: [ 0, HALF_LONG + 0.05 ], base: DOOR_TOP - 0.08, half: DOOR_HALF + 0.55, turn: 0, thick: 0.36, depth: 0.56 })
  setStone(mason, { at: [ 0, HALF_LONG + 0.7 ], base: ground(0, HALF_LONG + 0.7) - 0.08, half: 1, turn: 0, thick: 0.2, depth: 0.7 })

  // Two stones a course, laid across the two under them, round a flue.
  for (let course = 0; course * COURSE < CHIMNEY.over + 0.6; course += 1)
    for (const side of [ -1, 1 ]) {
      const off = side * (CHIMNEY.half - 0.26)
      const at  = course & 1 ? [ off, CHIMNEY.along ] as const : [ 0, CHIMNEY.along + off ] as const

      setStone(mason, { at, base: RIDGE - 0.6 + course * COURSE, half: CHIMNEY.half, turn: course & 1 ? Math.PI / 2 : 0, depth: 0.34 })
    }

  for (let along = CHIMNEY.along + CHIMNEY.half + 0.75; along < HALF_LONG + 0.3; along += lay.range(1, 1.25))
    setStone(mason, { at: [ 0, along ], base: ridge, half: lay.range(0.42, 0.54), turn: Math.PI / 2, thick: 0.2, depth: 0.36 })
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
  const mason = { mesh, laid: 0, lay, ground, course: COURSE }

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
