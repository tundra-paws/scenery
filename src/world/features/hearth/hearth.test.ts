// src/world/features/hearth/hearth.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { createGround } from '../../shared/ground.ts'
import { Interior, fireLevel } from '../../shared/hearth.ts'
import { createPath } from '../../shared/path.ts'
import { ROOM_HALF_DEEP, ROOM_HALF_LONG, SHELTER_DEEP, SHELTER_LONG, createShelter } from '../../shared/shelter.ts'
import { createYard } from '../../shared/yard.ts'
import { findView, resolveView } from '../../views.ts'
import { WORLD_SEED } from '../../world.ts'
import { DOOR_HALF, DOOR_TOP, HALF_LONG, INSET, RIDGE, underRoof } from '../shelter/plan.ts'
import { KILN, KILN_WALL } from '../yard/plan.ts'
import { FIRE, createRoom } from './house.ts'
import { createKilnFire } from './kiln.ts'


const GREY = new THREE.Color(0.5, 0.5, 0.5)

/** The brightest of a geometry's three numbers a corner, by name. */
function brightest (geometry: THREE.BufferGeometry, name: string): number {
  return Math.max(...geometry.getAttribute(name).array)
}


describe('an inside', () => {
  test('is lit by its fire: more the nearer, and less where a face is turned from it', () => {
    const fires = [{ at: [ 0, 1, 0 ], gain: 2, reach: 2 }] as const
    const lit   = (y: number, up: boolean): number => {
      const room = new Interior(fires, [])

      // A flag on the floor under the fire, facing it or turned away.
      if (up)
        room.quad([ -1, y, 1 ], [ 1, y, 1 ], [ 1, y, -1 ], [ -1, y, -1 ], GREY)
      else
        room.quad([ -1, y, -1 ], [ 1, y, -1 ], [ 1, y, 1 ], [ -1, y, 1 ], GREY)

      return brightest(room.build(), 'color')
    }

    expect(lit(0, true)).toBeGreaterThan(lit(-3, true) * 2)
    expect(lit(0, true)).toBeGreaterThan(lit(0, false) * 2)
    expect(lit(0, false)).toBeGreaterThan(0)
  })

  test('is lit by the day only where a door is, and never quite black', () => {
    const room = new Interior([], [{ at: [ 0, 1, 5 ], gain: 1, reach: 2 }])

    room.quad([ -1, 0, 5 ], [ 1, 0, 5 ], [ 1, 0, 3 ], [ -1, 0, 3 ], GREY)
    room.quad([ -1, 0, -20 ], [ 1, 0, -20 ], [ 1, 0, -22 ], [ -1, 0, -22 ], GREY)

    const day = room.build().getAttribute('aDay')

    expect(day.getX(0)).toBeGreaterThan(day.getX(6) * 4)
    expect(day.getX(6)).toBeGreaterThan(0)
    expect(brightest(room.build(), 'color')).toBe(0)
  })

  test('builds a closed box, and a flame whose tip alone strays', () => {
    const room = new Interior([], [])

    room.box([ 1, 2, 3 ], [ 0, 0, 0 ], GREY)

    const box = room.build()

    expect(box.getAttribute('position').count).toBe(36)
    box.computeBoundingBox()
    expect(box.boundingBox!.max.toArray()).toEqual([ 0.5, 1, 1.5 ])

    room.tongue([ 0, 0, 0 ], 0.2, 0.7, 0)

    const flame = room.build().getAttribute('aFlame')
    const tips  = Array.from(flame.array).filter(weight => weight > 0)

    expect(flame.count).toBe(36 + 9)
    expect(tips.length).toBe(3)

    for (const tip of tips)
      expect(tip).toBeCloseTo(0.7, 5)
  })

  test('has a fire that wavers and never goes out', () => {
    for (let time = 0; time < 400; time += 0.37) {
      expect(fireLevel(time, 0)).toBeGreaterThan(0.85)
      expect(fireLevel(time, 0)).toBeLessThan(1.15)
      expect(fireLevel(time, 1)).toBeGreaterThan(fireLevel(time, 0))
    }

    expect(fireLevel(12.5, 0.3)).toBe(fireLevel(12.5, 0.3))
  })
})

describe('the room in the house', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const path    = createPath(ground)
  const shelter = createShelter(ground, path)
  const land    = (across: number, along: number): number => {
    const { x, z } = shelter.place(across, along)

    return ground.heightAt(x, z) - shelter.floor
  }

  test('is the same room every time, and a plainer one on a phone', () => {
    const room  = createRoom(land, false)
    const phone = createRoom(land, true)

    expect(createRoom(land, false).getAttribute('position').array).toEqual(room.getAttribute('position').array)
    expect(phone.getAttribute('position').count).toBeLessThan(room.getAttribute('position').count * 0.6)
    expect(phone.getAttribute('position').count).toBeGreaterThan(900)
  })

  test('is inside the house: within the walls\' stones and under the roof, but for the doorway and the window', () => {
    const position = createRoom(land, false).getAttribute('position')

    for (let index = 0; index < position.count; index += 1) {
      const [ x, y, z ] = [ position.getX(index), position.getY(index), position.getZ(index) ]

      // What reaches past the room's own walls (by more than the end of a rafter) is in an opening through them.
      if (Math.abs(x) > ROOM_HALF_DEEP + 0.12 || Math.abs(z) > ROOM_HALF_LONG + 0.2) {
        expect(Math.abs(x)).toBeLessThan(SHELTER_DEEP / 2 + 0.3)
        expect(Math.abs(z)).toBeLessThan(SHELTER_LONG / 2 + 0.3)
        expect(y).toBeLessThan(DOOR_TOP + 0.1)
      }

      expect(y).toBeGreaterThan(-0.01)
      expect(y).toBeLessThan(RIDGE + 0.45)
    }

    // The room's own walls stand inside the dark behind the stones, and the roof's underside under the turf.
    expect(ROOM_HALF_DEEP).toBeLessThan(SHELTER_DEEP / 2 - INSET - 0.2)
    expect(ROOM_HALF_LONG).toBeLessThan(SHELTER_LONG / 2 - INSET - 0.2)
    expect(underRoof(ROOM_HALF_DEEP)).toBeGreaterThan(DOOR_TOP)
  })

  test('has its fire at the gable away from the door, and is brightest there', () => {
    const room     = createRoom(land, false)
    const position = room.getAttribute('position')
    const fire     = room.getAttribute('color')
    const flame    = room.getAttribute('aFlame')

    let near = 0
    let far  = 0

    // Along the wall the hill is behind, which is one stone from end to end.
    for (let index = 0; index < position.count; index += 1) {
      if (Math.abs(position.getX(index) + ROOM_HALF_DEEP) > 0.001 || flame.getX(index) > 0)
        continue

      if (position.getZ(index) > 1.5)
        far = Math.max(far, fire.getX(index))
      else if (position.getZ(index) < -1.5)
        near = Math.max(near, fire.getX(index))
    }

    expect(FIRE[2]).toBeLessThan(-ROOM_HALF_LONG + 1)
    expect(near).toBeGreaterThan(far * 2)
    expect(far).toBeGreaterThan(0)
  })

  test('is what its postcard looks into: the fire shows through the doorway', () => {
    const pose   = resolveView(findView('hearth')!, ground)
    const inside = (x: number, z: number): readonly [number, number] => [ (x - shelter.x) * shelter.fall[0] + (z - shelter.z) * shelter.fall[1], (x - shelter.x) * shelter.door[0] + (z - shelter.z) * shelter.door[1] ]

    const [ across, along ] = inside(pose.position[0], pose.position[2])
    const eye               = pose.position[1] - shelter.floor

    // Outside, before the door, and near enough to it to see in.
    expect(along).toBeGreaterThan(HALF_LONG + 2)
    expect(along).toBeLessThan(HALF_LONG + 6)

    // Where the line from the eye to the fire's heart crosses the doorway.
    const through = (HALF_LONG - along) / (FIRE[2] - along)
    const at      = across + (FIRE[0] - across) * through
    const high    = eye + (FIRE[1] + 0.3 - eye) * through

    expect(Math.abs(at)).toBeLessThan(DOOR_HALF - 0.2)
    expect(high).toBeGreaterThan(land(at, HALF_LONG) + 0.15)
    expect(high).toBeLessThan(DOOR_TOP - 0.3)

    // And it looks that way: at the hearth, not at the wall.
    const [ lookAcross, lookAlong ] = inside(pose.target[0], pose.target[2])

    expect(Math.abs(lookAcross)).toBeLessThan(1)
    expect(lookAlong).toBeLessThan(0)
  })
})

describe('the fire in the kiln', () => {
  const ground   = createGround({ seed: WORLD_SEED })
  const path     = createPath(ground)
  const { kiln } = createYard(ground, path, createShelter(ground, path))

  test('lies in the fire-hole: through the wall, over the floor, under the mouth\'s head', () => {
    const fire     = createKilnFire(kiln)
    const position = fire.getAttribute('position')

    for (let index = 0; index < position.count; index += 1) {
      const out   = (position.getX(index) - kiln.x) * kiln.mouth[0] + (position.getZ(index) - kiln.z) * kiln.mouth[1]
      const aside = (position.getX(index) - kiln.x) * -kiln.mouth[1] + (position.getZ(index) - kiln.z) * kiln.mouth[0]

      expect(out).toBeGreaterThan(KILN.radius - 0.45)
      expect(out).toBeLessThan(KILN.radius + 0.45)
      expect(Math.abs(aside)).toBeLessThan(KILN.mouthHalf + 0.35)
      expect(position.getY(index)).toBeGreaterThan(kiln.floor - 0.01)
      expect(position.getY(index)).toBeLessThan(kiln.floor + KILN_WALL)
    }

    expect(brightest(fire, 'aFlame')).toBeGreaterThan(0.3)
  })
})
