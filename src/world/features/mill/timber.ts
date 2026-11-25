// src/world/features/mill/timber.ts
import * as THREE from 'three'

import { board, join } from '../../shared/boards.ts'
import type { WaterGate } from '../../shared/mill.ts'
import { DOOR, DOOR_HALF, DOOR_TOP, HALF_DEEP, RACE, ROOM_BACK, TIRL, UNDER } from './plan.ts'

/** The water-gate's poles: how far apart they hang, how thick, and how far their feet swing clear of the water. */
const POLES = { every: 0.3, thick: 0.07, clear: 0.16 } as const

/** How high over the land at its ends the water-gate's spar lies: on the top of the dyke's two posts. */
const SPAR = 1.42

/**
 * The wheel, about its own shaft: a round post from the bed to the floor
 * and flat blades let into its foot, each a board on edge. `depth` is how
 * far under the floor the bed lies where it stands.
 */
export function createTirlGeometry (depth: number): THREE.BufferGeometry {
  const foot  = -depth + TIRL.clear
  const shaft = new THREE.CylinderGeometry(0.11, 0.15, depth - UNDER, 6)

  shaft.translate(0, -(depth + UNDER) / 2, 0)

  const blades = Array.from({ length: TIRL.blades }, (_, blade) => {
    const turn = Math.PI * 2 * blade / TIRL.blades
    const vane = new THREE.BoxGeometry(TIRL.radius - 0.1, TIRL.tall, 0.06)

    // Each leans back from the way it turns, to cup the water: from the
    // side they are eight facets in different lights, not one band.
    vane.rotateX(0.62)
    vane.translate((TIRL.radius + 0.1) / 2, foot + TIRL.tall / 2, 0)
    vane.rotateY(turn)

    return vane
  })

  // The hub the blades are let into.
  const hub = new THREE.CylinderGeometry(0.26, 0.26, TIRL.tall * 0.8, 8)

  hub.translate(0, foot + TIRL.tall / 2, 0)

  return join([ shaft, hub, ...blades ])
}

/** The door: four planks and two ledges, shut. And the trough that throws the water at the wheel. */
function createJoinery (depth: number): THREE.BufferGeometry[] {
  const face   = -HALF_DEEP - 0.06
  const planks = Array.from({ length: 4 }, (_, plank) => {
    const along = DOOR - DOOR_HALF + (plank + 0.5) * DOOR_HALF / 2

    return board(new THREE.Vector3(face, 0.02, along), new THREE.Vector3(face + 0.01 * (plank & 1), DOOR_TOP - 0.04, along), 0.07, DOOR_HALF / 2 - 0.02)
  })
  const ledges = [ 0.4, DOOR_TOP - 0.42 ].map(height => board(new THREE.Vector3(face - 0.06, height, DOOR - DOOR_HALF + 0.06), new THREE.Vector3(face - 0.06, height, DOOR + DOOR_HALF - 0.06), 0.14, 0.05))

  // The trough: a floor and two sides, from the dark at the back of the
  // wheel's room down to the blades on the side they are driven from.
  const head   = new THREE.Vector3(ROOM_BACK - 0.3, -UNDER - 0.25, RACE + 0.42)
  const lip    = new THREE.Vector3(TIRL.across - 0.2, -depth + TIRL.clear + TIRL.tall + 0.12, RACE + 0.42)
  const trough = [
    board(head, lip, 0.05, 0.46),
    ...[ -1, 1 ].map(side => board(head.clone().add(new THREE.Vector3(0, 0.13, side * 0.23)), lip.clone().add(new THREE.Vector3(0, 0.13, side * 0.23)), 0.26, 0.05)),
  ]

  return [ ...planks, ...ledges, ...trough ]
}

/**
 * The water-gate, where the burn goes under the head-dyke: a spar from post
 * to post across the gap, and poles hung from it down to the water, so the
 * burn goes through and the flock does not. In the world's frame.
 */
function createYett (gate: WaterGate, land: (x: number, z: number) => number): THREE.BufferGeometry[] {
  const end  = (side: number): THREE.Vector3 => {
    const x = gate.x + gate.along[0] * side * (gate.half + 0.3)
    const z = gate.z + gate.along[1] * side * (gate.half + 0.3)

    return new THREE.Vector3(x, land(x, z) + SPAR, z)
  }
  const from = end(-1)
  const to   = end(1)
  const spar = board(from, to, 0.13, 0.13)
  const hung = [] as THREE.BufferGeometry[]

  for (let along = POLES.every * 0.8; along < gate.half * 2 + 0.6 - POLES.every * 0.5; along += POLES.every) {
    const top  = from.clone().lerp(to, along / (gate.half * 2 + 0.6))
    const foot = land(top.x, top.z) + POLES.clear

    if (top.y - foot > 0.3)
      hung.push(board(top, new THREE.Vector3(top.x, foot, top.z), POLES.thick, POLES.thick))
  }

  return [ spar, ...hung ]
}

/**
 * Everything of the mill that is a board and does not move, as one geometry
 * in the mill's own frame: its door, the trough under its floor, and the
 * water-gate down the burn, which `intoFrame` brings in from the world's.
 */
export function createTimberGeometry (depth: number, gate: WaterGate, land: (x: number, z: number) => number, intoFrame: THREE.Matrix4): THREE.BufferGeometry {
  const yett = createYett(gate, land)

  for (const part of yett)
    part.applyMatrix4(intoFrame)

  return join([ ...createJoinery(depth), ...yett ])
}

// perf: trivial — some forty boxes and two posts, under 600 triangles, built
// once. The wheel is turned as a whole, by its mesh.
