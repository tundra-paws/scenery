// src/world/features/hearth/house.ts
import * as THREE from 'three'

import { Interior } from '../../shared/hearth.ts'
import type { Source } from '../../shared/hearth.ts'
import { PALETTE } from '../../shared/palette.ts'
import { ROOM_HALF_DEEP, ROOM_HALF_LONG } from '../../shared/shelter.ts'
import { DOOR_EASE, DOOR_HALF, DOOR_TOP, HALF_DEEP, HALF_LONG, RIDGE, WINDOW, underRoof } from '../shelter/plan.ts'

/** Half the room, across and along, and the height of its ceiling at the wall and under the ridge. */
const DEEP     = ROOM_HALF_DEEP
const LONG     = ROOM_HALF_LONG
const EAVE     = underRoof(DEEP) - 0.12
const RIDGE_IN = RIDGE - 0.14

/** How far past the room's own gable the floor runs into the doorway, to where the land outside begins (`CUT` in the terrain). */
export const SILL = 0.16

/** The fire: on the hearthstone against the gable away from the door. Where its heart is, and how big. */
export const FIRE = [ 0, 0.14, -LONG + 0.68 ] as const

/** What lights the room: the fire, and the day at the door and at the window. */
const FIRES: readonly Source[] = [{ at: [ FIRE[0], FIRE[1] + 0.45, FIRE[2] + 0.1 ], gain: 3.5, reach: 1.9 }]
const DOORS: readonly Source[] = [
  { at: [ 0, 1.35, LONG + 0.4 ], gain: 1.15, reach: 1.9 },
  { at: [ DEEP + 0.25, (WINDOW.sill + WINDOW.head) / 2, (WINDOW.from + WINDOW.to) / 2 ], gain: 0.55, reach: 1.2 },
]

/** What the room is made of: the house's stone, its soot, flags, sawn wood old and older, iron, peat, and the flock's wool. */
const STONE   = new THREE.Color(PALETTE.cairn)
const SOOT    = new THREE.Color(PALETTE.rock).multiplyScalar(0.34)
const FLAG    = new THREE.Color(PALETTE.rock).lerp(new THREE.Color(PALETTE.cairn), 0.45)
const TIMBER  = new THREE.Color(PALETTE.timber)
const OLD     = new THREE.Color(PALETTE.timber).multiplyScalar(0.6)
const IRON    = new THREE.Color(PALETTE.face)
const PEAT    = new THREE.Color(PALETTE.face).lerp(new THREE.Color(PALETTE.moorit), 0.4)
const WOOL    = new THREE.Color(PALETTE.fleece)
const BLANKET = new THREE.Color(PALETTE.moorit).lerp(new THREE.Color(PALETTE.fleece), 0.25)

/** The shell: four walls, the underside of the roof, the floor, and what lines the doorway and the window through the thickness of the wall. */
function raise (room: Interior, land: (across: number, along: number) => number, grain: number): void {
  const rise  = RIDGE_IN - EAVE
  const slope = Math.hypot(DEEP, rise)
  const door  = DOOR_HALF + DOOR_EASE
  const head  = DOOR_TOP + 0.05
  const out   = HALF_LONG + 0.25
  const wide  = HALF_DEEP + 0.25

  // The long walls, the one downhill with the window in it.
  room.sheet([ -LONG, 0, LONG, EAVE ], (across, up) => [ -DEEP, up, -across ], STONE, grain)
  room.pierced([ -LONG, 0, LONG, EAVE ], [ WINDOW.from, WINDOW.sill, WINDOW.to, WINDOW.head ], (across, up) => [ DEEP, up, across ], STONE, grain)

  // The gables, the one at +z with the door in it, and their points under the ridge.
  room.sheet([ -DEEP, 0, DEEP, EAVE ], (across, up) => [ across, up, -LONG ], STONE, grain)
  room.pierced([ -DEEP, 0, DEEP, EAVE ], [ -door, 0, door, head ], (across, up) => [ -across, up, LONG ], STONE, grain)
  room.triangle([ -DEEP, EAVE, -LONG ], [ DEEP, EAVE, -LONG ], [ 0, RIDGE_IN, -LONG ], SOOT)
  room.triangle([ DEEP, EAVE, LONG ], [ -DEEP, EAVE, LONG ], [ 0, RIDGE_IN, LONG ], SOOT)

  // The underside of the roof, black with a lifetime of peat smoke.
  room.sheet([ -LONG, 0, LONG, slope ], (across, up) => [ -DEEP + DEEP * up / slope, EAVE + rise * up / slope, -across ], SOOT, grain * 1.7)
  room.sheet([ -LONG, 0, LONG, slope ], (across, up) => [ DEEP - DEEP * up / slope, EAVE + rise * up / slope, across ], SOOT, grain * 1.7)

  // The floor: flags, out into the doorway as far as the step up to the land.
  room.sheet([ -DEEP, -LONG - SILL, DEEP, LONG ], (across, up) => [ across, 0, -up ], FLAG, grain * 1.5)

  // The step: as high across the doorway as the land outside stands.
  for (let piece = 0; piece < 4; piece += 1) {
    const from = door - piece * door / 2
    const to   = door - (piece + 1) * door / 2

    room.quad([ from, 0, LONG + SILL ], [ to, 0, LONG + SILL ], [ to, Math.max(0, land(to, LONG + SILL + 0.1)) + 0.04, LONG + SILL ], [ from, Math.max(0, land(from, LONG + SILL + 0.1)) + 0.04, LONG + SILL ], FLAG)
  }

  // The doorway's cheeks and its head, through the wall.
  room.quad([ -door, 0, out ], [ -door, 0, LONG ], [ -door, head, LONG ], [ -door, head, out ], STONE)
  room.quad([ door, 0, LONG ], [ door, 0, out ], [ door, head, out ], [ door, head, LONG ], STONE)
  room.quad([ -door, head, LONG ], [ door, head, LONG ], [ door, head, out ], [ -door, head, out ], STONE)

  // The window's, and a bar across it.
  const { from, to, sill, head: top } = WINDOW

  room.quad([ DEEP, sill, from ], [ wide, sill, from ], [ wide, top, from ], [ DEEP, top, from ], STONE)
  room.quad([ wide, sill, to ], [ DEEP, sill, to ], [ DEEP, top, to ], [ wide, top, to ], STONE)
  room.quad([ DEEP, sill, to ], [ wide, sill, to ], [ wide, sill, from ], [ DEEP, sill, from ], STONE)
  room.quad([ DEEP, top, from ], [ wide, top, from ], [ wide, top, to ], [ DEEP, top, to ], STONE)
  room.box([ 0.07, top - sill, 0.07 ], [ HALF_DEEP - 0.1, (sill + top) / 2, (from + to) / 2 ], OLD)
}

/** The roof's timbers: couples from wall to ridge, each with a tie across it. */
function frame (room: Interior, couples: readonly number[]): void {
  const rise  = RIDGE_IN - EAVE
  const pitch = Math.atan2(rise, DEEP)
  const long  = Math.hypot(DEEP, rise)

  for (const along of couples) {
    room.box([ long, 0.17, 0.14 ], [ -DEEP / 2, EAVE + rise / 2 - 0.1, along ], OLD, 0, 0, pitch)
    room.box([ long, 0.17, 0.14 ], [ DEEP / 2, EAVE + rise / 2 - 0.1, along ], OLD, 0, 0, -pitch)
    room.box([ DEEP * 0.95, 0.12, 0.1 ], [ 0, EAVE + rise * 0.52, along ], OLD)
  }
}

/** The hearth at the gable: its stone, the breast over it, the peats burning on it, the pot on its chain, and the peats stacked to hand. */
function kindle (room: Interior, spare: boolean): void {
  const back = -LONG

  room.box([ 2, 0.1, 1.3 ], [ 0, 0.05, back + 0.65 ], FLAG)
  room.box([ 1.5, 1.5, 0.14 ], [ 0, 0.75, back + 0.07 ], SOOT)
  room.box([ 0.32, 1.3, 0.85 ], [ -0.86, 0.65, back + 0.42 ], STONE)
  room.box([ 0.32, 1.3, 0.85 ], [ 0.86, 0.65, back + 0.42 ], STONE)
  room.box([ 2.2, 0.18, 0.36 ], [ 0, 1.42, back + 0.86 ], OLD)
  room.box([ 2.04, 1.1, 1 ], [ 0, 2.06, back + 0.5 ], STONE)
  room.box([ 1.5, 2.4, 0.9 ], [ 0, 3.8, back + 0.45 ], STONE)

  // The fire itself: a glowing heap, peats leaned on it, and the flames.
  room.embers(FIRE, 0.8, 0.26)

  for (let peat = 0; peat < 5; peat += 1) {
    const round = peat / 5 * Math.PI * 2 + 0.3

    room.box([ 0.46, 0.11, 0.17 ], [ FIRE[0] + Math.cos(round) * 0.3, FIRE[1] + 0.1, FIRE[2] + Math.sin(round) * 0.3 ], PEAT, -round, 0, 0.75)
  }

  for (const [ aside, along, tall, turn ] of [[ 0, 0, 0.78, 0.2 ], [ -0.2, 0.08, 0.5, 1.3 ], [ 0.19, -0.06, 0.58, 2.2 ], [ 0.04, 0.2, 0.4, 0.9 ]] as const)
    room.tongue([ FIRE[0] + aside, FIRE[1] + 0.12, FIRE[2] + along ], 0.24, tall, turn)

  // The pot, hung over it on a chain from the beam.
  room.box([ 0.035, 0.42, 0.035 ], [ 0.02, 1.13, FIRE[2] ], IRON)
  room.box([ 0.38, 0.27, 0.38 ], [ 0.02, 0.79, FIRE[2] ], IRON, 0.5)

  if (spare)
    return

  // Peats to hand, stacked against the wall the hill is behind.
  for (let peat = 0; peat < 8; peat += 1)
    room.box([ 0.5, 0.12, 0.2 ], [ -DEEP + 0.36 + (peat & 1) * 0.06, 0.07 + Math.floor(peat / 2) * 0.13, back + 0.5 + (peat & 1) * 0.3 ], PEAT, 1.57 + (peat % 3 - 1) * 0.12)
}

/** What the room is lived in with: a settle by the fire, a kist under the window, a stool, a bed built in by the door, and the door itself, stood open. */
function furnish (room: Interior, spare: boolean): void {
  // The settle, its back to the hill, and a blanket folded on it.
  room.box([ 0.56, 0.08, 1.9 ], [ -DEEP + 0.34, 0.55, -1 ], TIMBER)
  room.box([ 0.07, 1, 1.9 ], [ -DEEP + 0.09, 1, -1 ], TIMBER)
  room.box([ 0.56, 0.8, 0.07 ], [ -DEEP + 0.34, 0.4, -1.95 ], TIMBER)
  room.box([ 0.56, 0.8, 0.07 ], [ -DEEP + 0.34, 0.4, -0.05 ], TIMBER)
  room.box([ 0.42, 0.1, 0.5 ], [ -DEEP + 0.36, 0.64, -0.45 ], BLANKET, 0.08)

  // The kist under the window, and a bowl left on its lid.
  room.box([ 0.6, 0.56, 1.2 ], [ DEEP - 0.36, 0.28, -1.65 ], OLD)
  room.box([ 0.66, 0.05, 1.26 ], [ DEEP - 0.36, 0.585, -1.65 ], TIMBER)
  room.box([ 0.24, 0.09, 0.24 ], [ DEEP - 0.4, 0.655, -1.4 ], WOOL, 0.6)

  // A creepie by the fire.
  room.box([ 0.4, 0.06, 0.34 ], [ 1.05, 0.42, -LONG + 1.75 ], TIMBER, 0.5)

  for (const [ aside, along ] of [[ -0.13, -0.1 ], [ 0.13, -0.1 ], [ 0, 0.12 ]] as const)
    room.box([ 0.05, 0.4, 0.05 ], [ 1.05 + aside, 0.2, -LONG + 1.75 + along ], TIMBER)

  // The bed, boxed in against the draught, in the corner by the door.
  room.box([ 1.3, 0.06, 2.1 ], [ -DEEP + 0.66, 1.95, 2.2 ], TIMBER)
  room.box([ 1.3, 1.95, 0.06 ], [ -DEEP + 0.66, 0.975, 1.15 ], TIMBER)
  room.box([ 0.06, 0.55, 2.1 ], [ -DEEP + 1.3, 0.275, 2.2 ], TIMBER)
  room.box([ 0.06, 0.5, 2.1 ], [ -DEEP + 1.3, 1.7, 2.2 ], TIMBER)
  room.box([ 0.06, 1, 0.5 ], [ -DEEP + 1.3, 1, 3 ], TIMBER)
  room.box([ 1.2, 0.16, 2 ], [ -DEEP + 0.64, 0.6, 2.2 ], WOOL)
  room.box([ 1.22, 0.07, 1.25 ], [ -DEEP + 0.64, 0.71, 2.5 ], BLANKET)

  // The door: boards on two battens, swung in against the gable.
  room.box([ 0.07, 2.36, 1.46 ], [ DOOR_HALF + 0.42, 1.19, LONG - 0.82 ], TIMBER, 0.2)

  if (spare)
    return

  for (const up of [ 0.6, 1.8 ])
    room.box([ 0.05, 0.14, 1.3 ], [ DOOR_HALF + 0.36, up, LONG - 0.83 ], OLD, 0.2)

  // The wheel by the window, wool on its distaff: cloth here is the flock's own.
  const hub = [ 1.25, 0.95, 0.35 ] as const

  room.box([ 0.2, 0.06, 0.95 ], [ hub[0], 0.5, hub[2] + 0.2 ], TIMBER, 0, 0.14)

  for (const [ aside, along ] of [[ -0.12, -0.2 ], [ 0.12, -0.2 ], [ 0, 0.6 ]] as const)
    room.box([ 0.05, 0.5, 0.05 ], [ hub[0] + aside, 0.25, hub[2] + along ], TIMBER)

  for (let spoke = 0; spoke < 8; spoke += 1) {
    const round = spoke / 8 * Math.PI * 2

    room.box([ 0.04, 0.05, 0.33 ], [ hub[0], hub[1] + Math.sin(round) * 0.4, hub[2] + Math.cos(round) * 0.4 ], TIMBER, 0, -round - Math.PI / 2)

    if (spoke < 4)
      room.box([ 0.025, 0.03, 0.8 ], hub, OLD, 0, -round)
  }

  room.box([ 0.04, 0.9, 0.04 ], [ hub[0], 0.95, hub[2] + 0.72 ], TIMBER)
  room.box([ 0.17, 0.24, 0.17 ], [ hub[0], 1.42, hub[2] + 0.72 ], WOOL, 0.6)
}

/**
 * The room inside the house, in the shelter's own frame (x across the ridge
 * and downhill, y up from the floor, z along the ridge and out of the door).
 *
 * One room under the bare underside of the roof. The fire is on a
 * hearthstone at the gable away from the door, a pot hung over it; a settle
 * with its back to the hill, a kist under the window, the wheel beside it,
 * a bed boxed in by the door, and the door itself swung in against the
 * wall. Nobody is in it. `land` is how high the ground stands over the
 * floor, so the step at the door is as high as the land outside it; a phone
 * gets the room in bigger stones and without the small things.
 */
export function createRoom (land: (across: number, along: number) => number, phone: boolean): THREE.BufferGeometry {
  const room = new Interior(FIRES, DOORS)

  raise(room, land, phone ? 1.6 : 1)
  frame(room, phone ? [ 0.4 ] : [ -1.5, 0.4, 2.3 ])
  kindle(room, phone)
  furnish(room, phone)

  return room.build()
}

// perf: built once: some 1.4k triangles on desktop, 700 on a phone.
