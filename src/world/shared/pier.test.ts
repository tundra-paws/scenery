// src/world/shared/pier.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { LENGTH } from '../features/boat/hull.ts'
import { berthAt, findMooring } from '../features/boat/mooring.ts'
import type { Berth } from '../features/boat/mooring.ts'
import { VIEWS, findView, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createBurn } from './burn.ts'
import { HEFTS } from './flock.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { JETTY_DECK, JETTY_HALF, createPier } from './pier.ts'
import { createShelter } from './shelter.ts'
import { createSkerry } from './skerry.ts'
import { createWind } from './wind.ts'
import { createWood } from './wood.ts'


describe('the pier', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const burn    = createBurn(ground, path, [ infield.fold ])
  const wood    = createWood({ ground, summit, path, shelter }, WORLD_SEED)
  const wind    = createWind()
  const pier    = createPier(ground, path, wind)
  const mooring = findMooring(ground, path, wind)

  const { jetty, tender } = pier

  /** Places down the pier's two faces and round its head, a stride apart. */
  const faces = Array.from({ length: Math.ceil(jetty.length) + 1 }, (_, index) => Math.min(index, jetty.length))
    .flatMap(along => [ pier.place(along, -jetty.half), pier.place(along, jetty.half) ])

  test('is the same every time, and runs straight out to sea from the beach', () => {
    expect(createPier(ground, path, wind)).toMatchObject({ jetty, poles: pier.poles, rack: pier.rack, tender })
    expect(Math.hypot(...pier.seaward)).toBeCloseTo(1, 9)
    expect(pier.seaward[0] * pier.lee[0] + pier.seaward[1] * pier.lee[1]).toBeCloseTo(0, 9)
    expect(Math.hypot(jetty.head.x - jetty.root.x, jetty.head.z - jetty.root.z)).toBeCloseTo(jetty.length, 9)
    expect(jetty.deck).toBe(ground.waterLevel + JETTY_DECK)
    expect(jetty.half).toBe(JETTY_HALF)
  })

  test('is rooted in the beach a step under its deck, and stands in deep water at its head', () => {
    const root = ground.heightAt(jetty.root.x, jetty.root.z)
    const head = ground.heightAt(jetty.head.x, jetty.head.z)

    expect(root).toBeGreaterThan(ground.waterLevel + 0.2)
    expect(root).toBeLessThan(jetty.deck - 0.3)
    expect(head).toBeLessThan(ground.waterLevel - 3)

    // Most of it is over water: a pier, not a causeway up the beach.
    const wet = Array.from({ length: 20 }, (_, index) => pier.place((index + 0.5) / 20 * jetty.length, 0)).filter(({ x, z }) => ground.heightAt(x, z) < ground.waterLevel)

    expect(wet.length).toBeGreaterThan(14)
  })

  test('lies on the side of the landing the boat does, with its lee toward the boat', () => {
    const toBoat = [ mooring.rest.x - path.landing.x, mooring.rest.z - path.landing.z ] as const
    const toPier = [ jetty.root.x - path.landing.x, jetty.root.z - path.landing.z ] as const

    expect(toBoat[0] * pier.lee[0] + toBoat[1] * pier.lee[1]).toBeGreaterThan(8)
    expect(toPier[0] * pier.lee[0] + toPier[1] * pier.lee[1]).toBeGreaterThan(jetty.half + 3)

    // The wind blows off the pier onto the small boat, not the boat onto the pier.
    expect(wind.direction[0] * pier.lee[0] + wind.direction[1] * pier.lee[1]).toBeGreaterThan(0.5)
  })

  test('leaves the landing its two rows of stones, the path its width, and the field its dyke', () => {
    for (const { x, z } of [ ...faces, jetty.root, jetty.head ]) {
      // The rows are two and a half from the landing's middle line, and their stones under one across.
      expect(path.distanceTo(x, z)).toBeGreaterThan(3.7)
      expect(infield.distanceTo(x, z)).toBeGreaterThan(0.9)
      expect(infield.inField(x, z)).toBe(false)
      expect(burn.distanceTo(x, z)).toBeGreaterThan(10)
    }
  })

  test('is clear of the boat wherever it swings, and of the rope to its anchor', () => {
    const berth: Berth = { x: 0, z: 0, heave: 0, yaw: 0, pitch: 0, roll: 0 }

    for (let time = 0; time < 700; time += 0.25) {
      berthAt(mooring, wind, time, berth)

      // From its stern to where its rope goes under, a boat's length ahead of the bow.
      for (let part = -1; part <= 1.85; part += 0.15) {
        const x = berth.x + Math.cos(berth.yaw) * part * LENGTH / 2
        const z = berth.z - Math.sin(berth.yaw) * part * LENGTH / 2

        expect(pier.distanceTo(x, z)).toBeGreaterThan(1.4)
        expect(Math.hypot(x - tender.x, z - tender.z)).toBeGreaterThan(4.4)
      }
    }
  })

  test('has the small boat afloat in its lee, clear of its stones', () => {
    for (const end of [ -1, 0, 1 ]) {
      const x = tender.x + tender.bow[0] * end * 2.4
      const z = tender.z + tender.bow[1] * end * 2.4

      expect(ground.heightAt(x, z)).toBeLessThan(ground.waterLevel - 0.5)
      expect(pier.distanceTo(x, z)).toBeGreaterThan(0.5)
      expect(pier.distanceTo(x, z)).toBeLessThan(1.6)
    }
  })

  test('has the net poles in a row on the dry beach, between the sea and the dyke', () => {
    expect(pier.poles.length).toBeGreaterThan(3)

    pier.poles.forEach((pole, index) => {
      expect(pole.foot).toBeGreaterThan(ground.waterLevel + 0.3)
      expect(pole.foot).toBeLessThan(ground.waterLevel + 1.3)
      expect(pole.top - pole.foot).toBeGreaterThan(3)
      expect(infield.distanceTo(pole.x, pole.z)).toBeGreaterThan(0.9)
      expect(infield.inField(pole.x, pole.z)).toBe(false)
      expect(path.distanceTo(pole.x, pole.z)).toBeGreaterThan(5)

      if (index > 0) {
        const before = pier.poles[index - 1]!

        expect(Math.hypot(pole.x - before.x, pole.z - before.z)).toBeGreaterThan(1.8)
        expect(Math.hypot(pole.x - before.x, pole.z - before.z)).toBeLessThan(3)
      }
    })
  })

  test('has the rack on the green by the landing, off the path, the burn, the trees and the sheep', () => {
    const { rack } = pier

    for (const end of [ -1, 0, 1 ]) {
      const x = rack.x + rack.run[0] * rack.half * end
      const z = rack.z + rack.run[1] * rack.half * end

      expect(ground.heightAt(x, z)).toBeGreaterThan(ground.waterLevel + 1)
      expect(ground.slopeAt(x, z)).toBeLessThan(0.2)
      expect(path.distanceTo(x, z)).toBeGreaterThan(3.5)
      expect(burn.distanceTo(x, z)).toBeGreaterThan(2.5)
      expect(infield.distanceTo(x, z)).toBeGreaterThan(5)

      for (const tree of [ ...wood.trees, ...wood.outliers ])
        expect(Math.hypot(tree.x - x, tree.z - z)).toBeGreaterThan(4)

      // No heft reaches it, so nothing has to teach the flock where it is.
      for (const heft of HEFTS.filter(heft => !heft.penned))
        expect(Math.hypot(heft.x - x, heft.z - z)).toBeGreaterThan(heft.reach + 0.5)
    }
  })

  test('is reached by a way that leaves the path and ends at its root', () => {
    const first = pier.way[0]!
    const last  = pier.way.at(-1)!

    expect(path.distanceTo(first.x, first.z)).toBeLessThan(0.01)
    expect(pier.distanceTo(last.x, last.z)).toBeLessThan(0.8)
    expect(pier.distanceToSpur(last.x, last.z)).toBeLessThan(1e-9)

    for (const point of pier.way) {
      expect(ground.heightAt(point.x, point.z)).toBeGreaterThan(ground.waterLevel)
      expect(infield.distanceTo(point.x, point.z)).toBeGreaterThan(0.8)
    }
  })

  test('knows how far a place is from it', () => {
    const middle = pier.place(jetty.length / 2, 0)
    const beside = pier.place(jetty.length / 2, jetty.half + 2)
    const beyond = pier.place(jetty.length + 3, 0)

    expect(pier.distanceTo(middle.x, middle.z)).toBe(0)
    expect(pier.distanceTo(beside.x, beside.z)).toBeCloseTo(2, 9)
    expect(pier.distanceTo(beyond.x, beyond.z)).toBeCloseTo(3, 9)
    expect(pier.distanceTo(pier.poles[0]!.x, pier.poles[0]!.z)).toBe(0)
    expect(pier.distanceTo(pier.rack.x, pier.rack.z)).toBe(0)
    expect(pier.distanceTo(600, 600)).toBeGreaterThan(500)
  })

  test('stands off the skerry and clear of every postcard, and the tour never goes through it', () => {
    const skerry = createSkerry(ground, WORLD_SEED, 'desktop')

    for (const { x, z } of [ jetty.head, tender, ...pier.poles ])
      expect(skerry.distanceTo(x, z)).toBeGreaterThan(8)

    for (const view of VIEWS) {
      const [ x, , z ] = resolveView(view, ground).position

      expect(pier.distanceTo(x, z)).toBeGreaterThan(3)
      expect(Math.hypot(x - tender.x, z - tender.z)).toBeGreaterThan(5)
    }

    const tour       = createWorldTour(ground, path)
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}
    const tallest    = Math.max(...pier.poles.map(pole => pole.top))

    // Under the height of a net pole the camera keeps off everything: the walk in passes beside the pier.
    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, pose).position

      if (y < tallest + 0.5) {
        expect(pier.distanceTo(x, z)).toBeGreaterThan(1.6)
        expect(Math.hypot(x - tender.x, z - tender.z)).toBeGreaterThan(3.2)
      }
    }
  })

  test('is in the first picture whole, left of the boat, and in its own', () => {
    for (const [ name, aspect ] of [[ 'hero', 1280 / 720 ], [ 'hero', 9 / 16 * 2.2 ], [ 'pier', 1280 / 720 ]] as const) {
      const pose   = resolveView(findView(name)!, ground)
      const camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 3000)

      camera.position.set(...pose.position)
      camera.lookAt(...pose.target)
      camera.updateMatrixWorld()

      const seen = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z).project(camera)
      const root = seen(jetty.root.x, jetty.deck, jetty.root.z)
      const head = seen(jetty.head.x, jetty.deck, jetty.head.z)

      for (const point of [ root, head ]) {
        expect(Math.abs(point.x)).toBeLessThan(0.96)
        expect(Math.abs(point.y)).toBeLessThan(0.96)
        expect(point.z).toBeLessThan(1)
      }

      if (name === 'hero') {
        // Lower left: on the water under the brae, with the boat to its right.
        expect(head.x).toBeLessThan(-0.3)
        expect(head.y).toBeLessThan(-0.5)
        expect(seen(mooring.rest.x, ground.waterLevel, mooring.rest.z).x).toBeGreaterThan(root.x)
      }
    }
  })
})
