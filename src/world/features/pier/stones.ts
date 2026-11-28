// src/world/features/pier/stones.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import type { Ground } from '../../shared/ground.ts'
import { commitInstances } from '../../shared/instances.ts'
import { runCourse, setStone } from '../../shared/masonry.ts'
import type { Mason, Spot } from '../../shared/masonry.ts'
import type { Pier } from '../../shared/pier.ts'
import { RANGE } from '../../shared/tide.ts'
import type { Wash } from '../../shared/wash.ts'
import { COURSE, DECK, WALL } from './plan.ts'
import { raiseTower } from './tower.ts'
import type { Tower } from './tower.ts'

/** Stones the mesh has room for. A fifth as many again as this pier and its light lay on this shore. */
const ROOM = 640

/** Courses between high water and low, which the ebb shows. */
const TIDAL = Math.ceil(RANGE / COURSE)

/** How far apart along the pier the sea is told of it, and how far under the water the bed must be for it to break there. */
const TOLD  = 1
const AWASH = 0.05

/** Where the stones are laid, what is told of them, and how many courses of the pier's faces go under low water: a phone lays one, which is all its sea shows. */
interface Site {
  ground: Ground
  pier:   Pier
  wash:   Wash
  under:  number
  tower:  Tower
}

/**
 * The pier's four faces: courses laid dry from under low water to the deck,
 * each a little inside the one below, the corners turned by the sides on one
 * course and by the ends on the next. A stone the beach has buried is not laid.
 */
function raiseWalls (mason: Mason, pier: Pier, under: number): void {
  const { jetty } = pier
  const run       = Math.atan2(-pier.seaward[1], pier.seaward[0])
  const at        = (along: number, across: number): Spot => {
    const { x, z } = pier.place(along, across)

    return [ x, z ]
  }

  for (let course = -under - TIDAL; course < WALL.over; course += 1) {
    const base  = jetty.deck - (WALL.over - course) * COURSE
    const half  = jetty.half + WALL.batter * (WALL.over - 1 - course) - 0.3
    const from  = 0.3 - WALL.batter * (WALL.over - 1 - course)
    const to    = jetty.length - from
    const sides = course & 1 ? WALL.quoin : 0
    const ends  = course & 1 ? 0 : WALL.quoin

    for (const hand of [ -1, 1 ])
      runCourse(mason, at(from + sides, hand * half), at(to - sides, hand * half), base)

    for (const end of [ from, to ])
      runCourse(mason, at(end, -half + ends), at(end, half - ends), base)

    // A big stone on each corner, turned to face both ways, so no dark shows where two faces meet.
    for (const end of [ from, to ])
      for (const hand of [ -1, 1 ]) {
        const [ x, z ] = at(end + Math.sign(jetty.length / 2 - end) * 0.08, hand * (half - 0.08))

        if (base + COURSE > mason.ground(x, z) - 0.1)
          setStone(mason, { at: [ x, z ], base, half: 0.5, turn: run + (course & 1 ? Math.PI / 2 : 0), depth: 0.48 })
      }
  }
}

/**
 * The deck: flat stones across it in rows, every other row begun half a
 * stone over, so no joint runs the length of the pier. And two broad ones
 * at the root, a step up from the sand.
 */
function pave (mason: Mason, pier: Pier, ground: Ground): void {
  const { jetty } = pier
  const { lay }   = mason
  const rows      = Math.round((jetty.length - 0.5) / DECK.row)
  const across    = Math.atan2(-pier.lee[1], pier.lee[0])
  const wide      = (jetty.half * 2 - 0.5) / DECK.across

  for (let row = 0; row < rows; row += 1) {
    const along = 0.25 + (row + 0.5) * (jetty.length - 0.5) / rows
    const count = DECK.across + (row & 1)

    for (let stone = 0; stone < count; stone += 1) {
      const off      = (stone + 0.5 - count / 2) * wide * DECK.across / count
      const { x, z } = pier.place(along + lay.range(-0.05, 0.05), off)

      setStone(mason, { at: [ x, z ], base: jetty.deck - DECK.thick + lay.range(-0.03, 0.02), half: wide * DECK.across / count * lay.range(0.5, 0.56), turn: across, thick: DECK.thick, depth: DECK.row * 0.52 })
    }
  }

  for (const [ back, down ] of [[ 0.55, 0.4 ], [ 1.3, 0.8 ]] as const) {
    const { x, z } = pier.place(-back, lay.range(-0.15, 0.15))

    setStone(mason, { at: [ x, z ], base: Math.max(ground.heightAt(x, z) - 0.12, jetty.deck - down - 0.3), half: 1.05, turn: across, thick: 0.3, depth: 0.5 })
  }
}

/** A few stones heaped round the foot of everything stood in the beach: each net pole, and each leg of the rack. */
function wedge (mason: Mason, pier: Pier, ground: Ground): void {
  const { lay }  = mason
  const { rack } = pier
  const feet     = [
    ...pier.poles,
    ...[ -1, 1 ].map(end => ({ x: rack.x + rack.run[0] * rack.half * end, z: rack.z + rack.run[1] * rack.half * end })),
  ]

  for (const foot of feet)
    for (let stone = 0; stone < 3; stone += 1) {
      const angle = lay.range(0, Math.PI * 2)
      const x     = foot.x + Math.cos(angle) * 0.3
      const z     = foot.z + Math.sin(angle) * 0.3

      setStone(mason, { at: [ x, z ], base: ground.heightAt(x, z) - 0.1, half: lay.range(0.24, 0.36), turn: lay.range(0, Math.PI), thick: lay.range(0.22, 0.32), depth: 0.26 })
    }
}

/**
 * Every stone of the pier as one instanced mesh, in the world's own frame:
 * its faces, its deck, the step at its root, the stones wedged round the
 * feet of the net poles and the rack, and the light's tower on its head. And the sea is told where the pier
 * stands in it, so it breaks white along both faces and round the head.
 *
 * The house's stone, the cairn's paler grey, twenty facets a stone on every
 * tier as the dykes are.
 */
export function layStones (geometry: THREE.BufferGeometry, material: THREE.Material, lay: SeededRng, { ground, pier, wash, under, tower }: Site): THREE.InstancedMesh {
  const mesh  = new THREE.InstancedMesh(geometry, material, ROOM)
  const mason = { mesh, laid: 0, lay, course: COURSE, ground: (x: number, z: number): number => ground.heightAt(x, z) }

  raiseWalls(mason, pier, under)
  pave(mason, pier, ground)
  wedge(mason, pier, ground)
  raiseTower(mason, pier, tower)

  for (let along = 0; along <= pier.jetty.length; along += TOLD) {
    const { x, z } = pier.place(along, 0)

    const bed   = ground.heightAt(x, z)
    const stood = (level: number): number => bed < level - AWASH ? pier.jetty.half : 0

    wash.stand(x, z, stood(ground.waterLevel), stood(ground.waterLevel - RANGE))
  }

  mesh.name          = 'pier-stones'
  mesh.count         = mason.laid
  mesh.castShadow    = true
  mesh.receiveShadow = true

  commitInstances(mesh)

  return mesh
}

// perf: cheap — one draw call (two with its shadow pass, three in the
// mirror). Some 350 stones of 20 triangles: 7k on every tier. Laid once;
// nothing per frame.
