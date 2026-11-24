// src/world/shared/skerry.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { findMooring } from '../features/boat/mooring.ts'
import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { VIEWS, findView, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createPath } from './path.ts'
import { createSkerry } from './skerry.ts'
import type { Haul, Swim } from './skerry.ts'
import { createWind } from './wind.ts'

/** Rocks along the reef's back and the slabs beside it: the ones that are always out of the water. */
const DRY = 12


describe('the skerry', () => {
  const ground     = createGround({ seed: WORLD_SEED })
  const path       = createPath(ground)
  const skerry     = createSkerry(ground, WORLD_SEED, 'desktop')
  const haul: Haul = { lift: 0, turn: 0, tail: 0 }
  const swim: Swim = { x: 0, z: 0, up: 0, yaw: 0 }

  /** A postcard's camera, at a picture's shape. */
  function cameraOf (name: string, aspect: number): THREE.PerspectiveCamera {
    const pose   = resolveView(findView(name)!, ground)
    const camera = new THREE.PerspectiveCamera(55, aspect, 0.5, 3000)

    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()

    return camera
  }

  test('is the same reef every time, with fewer seals on a phone', () => {
    const again = createSkerry(ground, WORLD_SEED, 'desktop')

    expect(again.rocks.map(rock => rock.matrix.elements)).toEqual(skerry.rocks.map(rock => rock.matrix.elements))
    expect(again.seals).toEqual(skerry.seals)
    expect(skerry.seals.length).toBeGreaterThanOrEqual(5)
    expect(createSkerry(ground, WORLD_SEED, 'mobile').seals.length).toBeGreaterThanOrEqual(3)
    expect(createSkerry(ground, WORLD_SEED, 'mobile').seals.length).toBeLessThan(skerry.seals.length)
  })

  test('stands in the sea, off the land, and its back is never covered', () => {
    for (const rock of skerry.rocks) {
      expect(ground.heightAt(rock.x, rock.z)).toBeLessThan(ground.waterLevel - 1.5)
      expect(rock.top).toBeLessThan(ground.waterLevel + 2.2)
    }

    for (const rock of skerry.rocks.slice(0, DRY)) {
      expect(rock.top).toBeGreaterThan(ground.waterLevel + 0.3)
      expect(rock.footing).toBeGreaterThan(0.5)
    }

    // The mark is on the highest of it.
    expect(skerry.mark.y).toBeGreaterThan(ground.waterLevel + 1.5)
    expect(skerry.heightAt(skerry.mark.x, skerry.mark.z)).toBeCloseTo(skerry.mark.y, 5)
  })

  test('has every seal lying on rock, out of the water, on a face level enough to lie on', () => {
    for (const seal of skerry.seals) {
      expect(skerry.heightAt(seal.x, seal.z)).toBeCloseTo(seal.y, 5)
      expect(seal.y).toBeGreaterThan(ground.waterLevel + 0.25)
      expect(seal.lie[1]).toBeGreaterThan(0.8)
      expect(Math.hypot(...seal.lie)).toBeCloseTo(1, 5)
    }

    // No two on the same slab.
    skerry.seals.forEach((seal, index) => {
      for (const other of skerry.seals.slice(index + 1))
        expect(Math.hypot(seal.x - other.x, seal.z - other.z)).toBeGreaterThan(1.5)
    })
  })

  test('is clear of every postcard\'s camera and of the boat', () => {
    for (const view of VIEWS)
      expect(skerry.distanceTo(view.at[0], view.at[1])).toBeGreaterThan(3)

    const { rest } = findMooring(ground, path, createWind())

    expect(skerry.distanceTo(rest.x, rest.z)).toBeGreaterThan(8)
  })

  test('is in the hero postcard, whatever its shape: the back, the slabs, the mark and every seal', () => {
    for (const aspect of [ 16 / 10, 16 / 9 ]) {
      const hero   = cameraOf('hero', aspect)
      const inside = (x: number, y: number, z: number): void => {
        const seen = new THREE.Vector3(x, y, z).project(hero)

        expect(Math.abs(seen.x)).toBeLessThan(0.99)
        expect(Math.abs(seen.y)).toBeLessThan(0.99)
      }

      for (const rock of skerry.rocks.slice(0, DRY))
        inside(rock.x, rock.top, rock.z)

      for (const seal of skerry.seals)
        inside(seal.x, seal.y + 0.5, seal.z)

      inside(skerry.mark.x, skerry.mark.y + 1.5, skerry.mark.z)
    }
  })

  test('is what its own postcard looks at: the seals, from low on the water', () => {
    const camera = cameraOf('skerry', 16 / 10)

    let seen = 0

    for (const seal of skerry.seals) {
      const at = new THREE.Vector3(seal.x, seal.y + 0.4, seal.z).project(camera)

      if (Math.abs(at.x) < 0.95 && Math.abs(at.y) < 0.95)
        seen += 1
    }

    expect(seen).toBeGreaterThanOrEqual(skerry.seals.length - 1)
    expect(ground.heightAt(...findView('skerry')!.at)).toBeLessThan(ground.waterLevel - 2)
  })

  test('is never flown into by the tour', () => {
    const tour     = createWorldTour(ground, path)
    const at: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}
    const { mark } = skerry

    for (let t = 0; t < tourDuration(tour); t += 0.05) {
      const [ x, y, z ] = tourPose(tour, t, at).position
      const rock        = skerry.heightAt(x, z)

      // A seal's back is under a unit over its rock, and the mark two.
      if (rock !== null)
        expect(y - rock).toBeGreaterThan(2)

      if (Math.hypot(x - mark.x, z - mark.z) < 1.5)
        expect(y - mark.y).toBeGreaterThan(3)
    }
  })

  test('has seals that lie flat asleep at night, and by day breathe, look round and curl', () => {
    for (const seal of skerry.seals) {
      let highest = 0
      let curled  = 0

      for (let time = 0; time < 120; time += 0.25) {
        const asleep = skerry.haul(seal, time, -20, haul)

        expect(Math.abs(asleep.lift) + Math.abs(asleep.turn) + Math.abs(asleep.tail)).toBe(0)

        const { lift, turn, tail } = skerry.haul(seal, time, 20, haul)

        expect(lift).toBeGreaterThan(0.03)
        expect(lift).toBeLessThanOrEqual(1)
        expect(Math.abs(turn)).toBeLessThan(0.75)
        expect(tail).toBeGreaterThanOrEqual(0)
        expect(tail).toBeLessThanOrEqual(1)

        highest = Math.max(highest, lift)
        curled  = Math.max(curled, tail)
      }

      expect(highest).toBeGreaterThan(0.9)
      expect(curled).toBeGreaterThan(0.9)
    }
  })

  test('never jerks: a seal moves a little each step', () => {
    for (const seal of skerry.seals) {
      let last = { ...skerry.haul(seal, 0, 20, haul) }

      for (let frame = 1; frame < 60 * 90; frame += 1) {
        const next = { ...skerry.haul(seal, frame / 60, 20, haul) }

        expect(Math.abs(next.lift - last.lift)).toBeLessThan(0.03)
        expect(Math.abs(next.turn - last.turn)).toBeLessThan(0.03)
        expect(Math.abs(next.tail - last.tail)).toBeLessThan(0.03)

        last = next
      }
    }
  })

  test('has one in the water that shows its head off the reef, in open water, and is gone at night', () => {
    let shown = 0

    for (let time = 0; time < 200; time += 0.5) {
      const { x, z, up } = skerry.swim(time, 20, swim)

      expect(up).toBeGreaterThanOrEqual(0)
      expect(up).toBeLessThanOrEqual(1)
      expect(skerry.swim(time, -20, swim).up).toBe(0)

      if (up > 0) {
        shown += 1
        expect(skerry.distanceTo(x, z)).toBeGreaterThan(0.8)
        expect(ground.heightAt(x, z)).toBeLessThan(ground.waterLevel - 1.5)
      }
    }

    // Up some of the time, under more of it.
    expect(shown).toBeGreaterThan(100)
    expect(shown).toBeLessThan(220)
  })
})
