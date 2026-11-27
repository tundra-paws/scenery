// src/world/shared/geese.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { createWorldTour } from '../../rig/route.ts'
import { tourDuration, tourPose } from '../../rig/tour.ts'
import { findView, resolveView } from '../views.ts'
import type { Pose } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { LAP, SPEED, createGeese } from './geese.ts'
import type { Wingbeat } from './geese.ts'
import { createGround } from './ground.ts'
import { createPath, findSummit } from './path.ts'

/** How long a skein takes to come round, and the moment the postcards are taken. */
const ROUND = LAP / SPEED
const TEN   = 10


describe('the geese', () => {
  const ground         = createGround({ seed: WORLD_SEED })
  const geese          = createGeese(WORLD_SEED, 'desktop')
  const held: Wingbeat = { x: 0, y: 0, z: 0, beat: 0, shown: 0 }

  test('are the same skeins every time, with fewer birds on a phone', () => {
    const again = createGeese(WORLD_SEED, 'desktop')
    const phone = createGeese(WORLD_SEED, 'mobile')

    expect(again.skeins).toEqual(geese.skeins)
    expect(phone.skeins.length).toBe(geese.skeins.length)

    geese.skeins.forEach((skein, index) => {
      expect(phone.skeins[index]!.birds.length).toBeLessThan(skein.birds.length)
      expect(phone.skeins[index]!.birds.length).toBeGreaterThanOrEqual(9)
    })
  })

  test('fly in a chevron that is never even: a leader, and one arm longer than the other', () => {
    for (const skein of geese.skeins) {
      const right = skein.birds.filter(goose => goose.aside > 0).length
      const left  = skein.birds.filter(goose => goose.aside < 0).length

      expect(skein.birds[0]!.back).toBe(0)
      expect(Math.min(left, right)).toBeGreaterThanOrEqual(3)
      expect(Math.abs(left - right)).toBeGreaterThanOrEqual(2)
    }
  })

  test('have the first skein in the hero postcard at second ten, whatever its shape', () => {
    const pose  = resolveView(findView('hero')!, ground)
    const skein = geese.skeins[0]!

    for (const aspect of [ 16 / 10, 16 / 9 ]) {
      const hero = new THREE.PerspectiveCamera(55, aspect, 0.5, 3000)

      hero.position.set(...pose.position)
      hero.lookAt(...pose.target)
      hero.updateMatrixWorld()

      for (const goose of skein.birds) {
        geese.at(skein, goose, TEN, held)

        const seen = new THREE.Vector3(held.x, held.y, held.z).project(hero)

        expect(held.shown).toBe(1)
        expect(Math.abs(seen.x)).toBeLessThan(0.96)
        expect(Math.abs(seen.y)).toBeLessThan(0.96)

        // In the sky, over the island's own skyline.
        expect(seen.y).toBeGreaterThan(0.12)
      }
    }
  })

  test('go over high: clear of the cairn and of everywhere the tour flies', () => {
    const tour       = createWorldTour(ground, createPath(ground))
    const pose: Pose = { position: [ 0, 0, 0 ], target: [ 0, 0, 0 ]}
    const summit     = findSummit(ground)

    let highest = ground.heightAt(summit.x, summit.z) + 9

    for (let time = 0; time < tourDuration(tour); time += 0.25)
      highest = Math.max(highest, tourPose(tour, time, pose).position[1])

    for (const skein of geese.skeins)
      for (let time = 0; time < ROUND; time += 0.7)
        for (const goose of skein.birds)
          expect(geese.at(skein, goose, time, held).y).toBeGreaterThan(highest + 8)
  })

  test('keep their places: no two of a skein fly into each other', () => {
    for (const skein of geese.skeins)
      for (let time = 0; time < ROUND; time += 4.3) {
        const places = skein.birds.map(goose => {
          geese.at(skein, goose, time, held)

          return [ held.x, held.y, held.z ] as const
        })

        places.forEach((place, index) => {
          for (const other of places.slice(index + 1))
            expect(Math.hypot(place[0] - other[0], place[1] - other[1], place[2] - other[2])).toBeGreaterThan(1.6)
        })
      }
  })

  test('are never seen to go: a skein has dwindled to nothing where it is brought round', () => {
    for (const skein of geese.skeins) {
      // Half a round after it is over the island it is as far off as it gets.
      const far = TEN + skein.after + ROUND / 2

      expect(geese.at(skein, skein.birds[0]!, far - 0.5, held).shown).toBe(0)
      expect(geese.at(skein, skein.birds[0]!, far + 0.5, held).shown).toBe(0)
      expect(geese.at(skein, skein.birds[0]!, TEN + skein.after, held).shown).toBe(1)
      expect(Math.abs(geese.along(skein, TEN + skein.after))).toBeLessThan(1e-6)
    }
  })

  test('come over one skein at a time', () => {
    for (let time = 0; time < ROUND; time += 0.5)
      expect(geese.skeins.filter(skein => Math.abs(geese.along(skein, time)) < 240).length).toBeLessThanOrEqual(1)
  })
})
