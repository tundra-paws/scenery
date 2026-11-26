// src/world/features/pier/tower.ts
import * as THREE from 'three'

import { board } from '../../shared/boards.ts'
import { setStone } from '../../shared/masonry.ts'
import type { Mason } from '../../shared/masonry.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Pier } from '../../shared/pier.ts'
import { DARK, paint } from '../../shared/roof.ts'
import { COURSE, LANTERN, TOWER } from './plan.ts'

/** Length of the round a stone of the tower takes up, more or less: shorter than a straight wall's, so the round stays round. */
const STONE = 0.7

/** How far in from the outer line a stone's middle is, and half its depth through the wall. */
const SET_IN = 0.13
const DEPTH  = 0.3

/** How far the corbels under the gallery stand out past the top course, and how thick the gallery's slabs are. */
const CORBEL = 0.16
const SLAB   = 0.2

/** Iron, tarred against the salt: the boat's tarred timber, which is what the eye takes it for. And the glass, by day: the sky's grey in it, darkened. */
const IRON   = new THREE.Color(PALETTE.timber).multiplyScalar(0.3)
const GLASS  = new THREE.Color(PALETTE.rock).multiplyScalar(0.42)
const PLINTH = new THREE.Color(PALETTE.cairn).multiplyScalar(0.82)

/** Where the tower stands, how high its top course's top is, and the height of the lantern's floor, its glazing's foot and head. */
export interface Tower {
  x:     number
  z:     number
  foot:  number
  top:   number
  floor: number
  glass: number
  head:  number

  /** The lamp's place: the middle of the glazing. */
  lamp: THREE.Vector3
}

/** A geometry all of one colour. */
function dyed (geometry: THREE.BufferGeometry, colour: THREE.Color): THREE.BufferGeometry {
  return paint(geometry, () => colour)
}

/** The turn about the upright that lays a stone's length along the round at `angle`. */
function along (angle: number): number {
  return Math.atan2(-Math.cos(angle), -Math.sin(angle))
}

/** The outer line of the tower `course` courses up: it narrows as it rises. */
function radiusAt (course: number): number {
  return THREE.MathUtils.lerp(TOWER.foot, TOWER.top, course / (TOWER.courses - 1))
}

/** Where the light stands and how high each part of it is. */
export function placeTower (pier: Pier): Tower {
  const { x, z } = pier.place(pier.jetty.length - TOWER.back, 0)
  const foot     = pier.jetty.deck
  const top      = foot + TOWER.courses * COURSE
  const floor    = top + SLAB
  const glass    = floor + LANTERN.plinth
  const head     = glass + LANTERN.glazed

  return { x, z, foot, top, floor, glass, head, lamp: new THREE.Vector3(x, (glass + head) / 2, z) }
}

/**
 * The tower's stones, into the pier's own mesh: courses laid round, each
 * begun half a stone over from the one under it, narrowing as they rise;
 * the doorway left in the first courses on the side that looks back along
 * the pier; a ring of corbels at the top, and the gallery's slabs on them.
 */
export function raiseTower (mason: Mason, pier: Pier, tower: Tower): void {
  const door = Math.atan2(-pier.seaward[1], -pier.seaward[0])

  for (let course = 0; course < TOWER.courses; course += 1) {
    const radius = radiusAt(course) - SET_IN
    const count  = Math.round(Math.PI * 2 * radius / STONE)

    for (let stone = 0; stone < count; stone += 1) {
      const angle = (stone + (course & 1) * 0.5 + mason.lay.range(-0.06, 0.06)) / count * Math.PI * 2
      const gap   = Math.abs(Math.atan2(Math.sin(angle - door), Math.cos(angle - door)))

      if (course < TOWER.doorway && gap < TOWER.door)
        continue

      setStone(mason, { at: [ tower.x + Math.cos(angle) * radius, tower.z + Math.sin(angle) * radius ], base: tower.foot + course * COURSE, half: Math.PI * 2 * radius / count * mason.lay.range(0.6, 0.66), turn: along(angle), depth: DEPTH })
    }
  }

  const ledge = radiusAt(TOWER.courses - 1) + CORBEL - SET_IN
  const ring  = Math.round(Math.PI * 2 * ledge / STONE)

  for (let stone = 0; stone < ring; stone += 1) {
    const angle = (stone + 0.25) / ring * Math.PI * 2
    const at    = [ tower.x + Math.cos(angle) * (ledge - 0.08), tower.z + Math.sin(angle) * (ledge - 0.08) ] as const

    setStone(mason, { at, base: tower.top - COURSE * 0.55, half: Math.PI * 2 * ledge / ring * 0.6, turn: along(angle), thick: COURSE * 0.55, depth: DEPTH + 0.06 })
    setStone(mason, { at: [ tower.x + Math.cos(angle) * (ledge - 0.22), tower.z + Math.sin(angle) * (ledge - 0.22) ], base: tower.top, half: Math.PI * 2 * ledge / ring * 0.62, turn: along(angle), thick: SLAB, depth: 0.5 })
  }
}

/** The dark inside the tower, so none of the light shows between its stones, and in the doorway. */
function core (tower: Tower): THREE.BufferGeometry {
  const high = tower.top - tower.foot + 0.1

  return dyed(new THREE.CylinderGeometry(TOWER.top - 0.3, TOWER.foot - 0.3, high, 10).translate(tower.x, tower.foot + high / 2 - 0.15, tower.z), DARK)
}

/** The lantern: a plinth, eight panes of glass and the bars between them, a roof of eight, and a ball on it to let the lamp's smoke out. */
function lantern (tower: Tower): THREE.BufferGeometry[] {
  const { radius, glazed, plinth, roof, eaves } = LANTERN
  const { x, z }                                = tower
  const parts                                   = [
    dyed(new THREE.CylinderGeometry(radius + 0.04, radius + 0.1, plinth, 8).translate(x, tower.floor + plinth / 2, z), PLINTH),
    dyed(new THREE.CylinderGeometry(radius, radius, glazed, 8, 1, true).translate(x, tower.glass + glazed / 2, z), GLASS),
    dyed(new THREE.CylinderGeometry(radius + 0.03, radius + 0.03, 0.07, 8).translate(x, tower.glass + 0.035, z), IRON),
    dyed(new THREE.CylinderGeometry(eaves, radius + 0.03, 0.08, 8).translate(x, tower.head + 0.04, z), IRON),
    dyed(new THREE.ConeGeometry(eaves, roof, 8).translate(x, tower.head + 0.08 + roof / 2, z), IRON),
    dyed(new THREE.IcosahedronGeometry(0.11).translate(x, tower.head + 0.08 + roof + 0.06, z), IRON),
  ]

  for (let corner = 0; corner < 8; corner += 1) {
    const angle = corner / 8 * Math.PI * 2

    parts.push(dyed(new THREE.BoxGeometry(0.05, glazed, 0.05).rotateY(angle)
      .translate(x + Math.sin(angle) * (radius + 0.01), tower.glass + glazed / 2, z + Math.cos(angle) * (radius + 0.01)), IRON))
  }

  return parts
}

/** The rail round the gallery: a post at each of eight places and a bar between their heads. */
function rail (tower: Tower): THREE.BufferGeometry[] {
  const out   = TOWER.top + CORBEL + LANTERN.rail - 0.12
  const parts = [] as THREE.BufferGeometry[]
  const head  = (post: number): THREE.Vector3 => {
    const angle = post / 8 * Math.PI * 2 + Math.PI / 8

    return new THREE.Vector3(tower.x + Math.cos(angle) * out, tower.floor + LANTERN.railHigh, tower.z + Math.sin(angle) * out)
  }

  for (let post = 0; post < 8; post += 1) {
    const top = head(post)

    parts.push(dyed(new THREE.BoxGeometry(0.04, LANTERN.railHigh, 0.04).translate(top.x, tower.floor + LANTERN.railHigh / 2, top.z), IRON))
    parts.push(dyed(board(top, head(post + 1), 0.04, 0.04), IRON))
  }

  return parts
}

/** Everything of the light that is not stone or flame, in the gear's colours: the dark within, the lantern and the rail. */
export function createTowerGear (tower: Tower): THREE.BufferGeometry[] {
  return [ core(tower), ...lantern(tower), ...rail(tower) ]
}

// perf: trivial — some 90 stones into the pier's mesh, and some 300
// triangles of ironwork and glass into its gear: no draw call of its own.
// Built once; nothing per frame.
