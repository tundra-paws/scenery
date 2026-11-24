// src/world/shared/flock.test.ts
import { describe, expect, test } from 'bun:test'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { DAY, elevationAt } from './daylight.ts'
import { PACE, createFlock } from './flock.ts'
import type { Hold, Moment, Sheep } from './flock.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import type { Waypoint } from './path.ts'
import { createShelter } from './shelter.ts'
import { createWood } from './wood.ts'


describe('the flock', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const site    = { ground, summit, path, shelter, infield, wood }
  const flock   = createFlock(site, WORLD_SEED, 'desktop')
  const fold    = infield.fold

  /** Every place a sheep stands or passes on its round, half a unit apart. */
  function walked (sheep: Sheep): Waypoint[] {
    return sheep.spots.flatMap((from, index) => {
      const to    = sheep.spots[(index + 1) % sheep.spots.length]!
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.5))

      return Array.from({ length: steps }, (_, step) => ({ x: from.x + (to.x - from.x) * step / steps, z: from.z + (to.z - from.z) * step / steps }))
    })
  }

  function moment (time: number): Moment {
    return flock.at(time, { tau: 0, elevation: 0 })
  }

  function hold (sheep: Sheep, time: number): Hold {
    return flock.hold(sheep, moment(time), { x: 0, z: 0, yaw: 0, stride: 0, graze: 0, lie: 0 })
  }

  test('is a flock, the same one every time, and a smaller one on a phone', () => {
    const lambs = flock.sheep.filter(sheep => sheep.size < 0.8)

    expect(flock.sheep.length).toBeGreaterThan(45)
    expect(flock.sheep.length).toBeLessThan(80)
    expect(lambs.length).toBeGreaterThan(4)
    expect(createFlock(site, WORLD_SEED, 'desktop').sheep).toEqual(flock.sheep)
    expect(createFlock(site, WORLD_SEED, 'mobile').sheep.length).toBeLessThan(flock.sheep.length * 0.75)
  })

  test('grazes the open grass: off the path, the walls, the field, the house, the trees, the cairn and every camera', () => {
    const cameras = VIEWS.map(view => resolveView(view, ground).position)

    for (const sheep of flock.sheep)
      for (const { x, z } of walked(sheep)) {
        expect(ground.heightAt(x, z)).toBeGreaterThan(ground.waterLevel + 1)
        expect(ground.slopeAt(x, z)).toBeLessThan(0.36)
        expect(path.distanceTo(x, z)).toBeGreaterThan(4)
        expect(infield.inField(x, z)).toBe(false)
        expect(infield.distanceTo(x, z)).toBeGreaterThan(1.2)
        expect(wood.distanceTo(x, z)).toBeGreaterThan(1.1)
        expect(shelter.distanceTo(x, z)).toBeGreaterThan(2.5)
        expect(shelter.distanceToSpur(x, z)).toBeGreaterThan(1.5)
        expect(Math.hypot(x - summit.x, z - summit.z)).toBeGreaterThan(5)

        for (const [ cx, , cz ] of cameras)
          expect(Math.hypot(x - cx, z - cz)).toBeGreaterThan(4.5)
      }
  })

  test('keeps the penned ones in the fold and the rest out of it', () => {
    const penned = flock.sheep.filter(sheep => sheep.heft === 'fold')

    expect(penned.length).toBe(4)

    for (const sheep of flock.sheep)
      for (const { x, z } of walked(sheep)) {
        const away = Math.hypot(x - fold.x, z - fold.z)

        if (sheep.heft === 'fold')
          expect(away).toBeLessThan(fold.radius - 1)
        else
          expect(away).toBeGreaterThan(fold.radius + 1)
      }
  })

  test('is out on the brae and the inbye in front of the first view', () => {
    const hero = resolveView(VIEWS[0]!, ground).position
    const near = flock.sheep.filter(sheep => Math.hypot(sheep.spots[0]!.x - hero[0], sheep.spots[0]!.z - hero[2]) < 80)

    expect(near.length).toBeGreaterThan(25)
  })

  test('keeps every lamb at its mother\'s side', () => {
    const lambs = flock.sheep.filter(sheep => sheep.size < 0.8)

    for (const lamb of lambs) {
      const mother = flock.sheep.find(sheep => sheep.size > 0.8 && sheep.period === lamb.period && sheep.spots.length === lamb.spots.length)!

      for (let time = 0; time < DAY; time += 3.7) {
        const her = hold(mother, time)
        const its = hold(lamb, time)

        expect(Math.hypot(her.x - its.x, her.z - its.z)).toBeLessThan(1.5)
      }
    }
  })

  test('never jumps or spins: every step is a stroll and every turn unhurried', () => {
    for (const sheep of flock.sheep) {
      let last = hold(sheep, 0)

      for (let frame = 1; frame < DAY * 60; frame += 3) {
        const next = hold(sheep, frame / 60)
        const turn = Math.abs(((next.yaw - last.yaw) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI)

        expect(Math.hypot(next.x - last.x, next.z - last.z) / 3 * 60).toBeLessThan(PACE * 1.6)
        expect(turn / 3 * 60).toBeLessThan(3.2)
        last = next
      }
    }
  })

  test('is up in the evening light, and lying down and still through the night', () => {
    const night = Array.from({ length: Math.ceil(DAY) }, (_, second) => second).filter(second => elevationAt(second) < -8)

    expect(night.length).toBeGreaterThan(20)

    for (const sheep of flock.sheep) {
      expect(hold(sheep, 10).lie).toBe(0)

      for (const second of night) {
        expect(hold(sheep, second).lie).toBe(1)
        expect(hold(sheep, second).x).toBe(hold(sheep, night[0]!).x)
      }
    }

    // By day the sheep's own clock keeps time with the world's.
    expect(moment(11).tau - moment(10).tau).toBeCloseTo(1, 3)
    expect(moment(DAY + 10).tau - moment(10).tau).toBeLessThan(DAY)
  })
})
