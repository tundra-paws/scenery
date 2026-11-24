// src/world/shared/starlings.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { VIEWS, resolveView } from '../views.ts'
import { WORLD_SEED } from '../world.ts'
import { DAY } from './daylight.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { createStarlings } from './starlings.ts'
import type { Flight, Hour } from './starlings.ts'


describe('the starlings', () => {
  const ground         = createGround({ seed: WORLD_SEED })
  const summit         = findSummit(ground)
  const path           = createPath(ground, summit)
  const infield        = createInfield(createShelter(ground, path))
  const starlings      = createStarlings({ ground, infield }, WORLD_SEED, 'desktop')
  const hour: Hour     = { time: 0, come: 0, settle: 0, roost: 0, leave: 0, evening: true }
  const flight: Flight = { x: 0, y: 0, z: 0, up: false, yaw: 0, pitch: 0, bank: 0, wing: 0 }

  /** Every bird that is up at `time`, as where it is. */
  function aloft (time: number): THREE.Vector3[] {
    starlings.at(time, hour)

    return starlings.birds.flatMap(bird => {
      starlings.fly(bird, hour, flight)

      return flight.up ? [ new THREE.Vector3(flight.x, flight.y, flight.z) ] : []
    })
  }

  test('are the same birds every time, and fewer on a phone', () => {
    expect(starlings.birds.length).toBeGreaterThan(1500)
    expect(createStarlings({ ground, infield }, WORLD_SEED, 'desktop').birds).toEqual(starlings.birds)
    expect(createStarlings({ ground, infield }, WORLD_SEED, 'mobile').birds.length).toBeLessThan(starlings.birds.length * 0.6)
  })

  test('roost in the walls', () => {
    for (const { roost } of starlings.birds) {
      expect(infield.distanceTo(roost.x, roost.z)).toBeLessThan(0.05)
      expect(roost.y - ground.heightAt(roost.x, roost.z)).toBeLessThan(1.2)
    }
  })

  test('are all up at second ten, high over the land, and every one of them in the hero postcard', () => {
    const hero   = resolveView(VIEWS[0]!, ground)
    const camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.5, 3000)

    camera.position.set(...hero.position)
    camera.lookAt(...hero.target)
    camera.updateMatrixWorld()

    const birds = aloft(10)

    expect(birds.length).toBe(starlings.birds.length)

    for (const bird of birds) {
      expect(bird.y - ground.heightAt(bird.x, bird.z)).toBeGreaterThan(12)

      const seen = bird.clone().project(camera)

      expect(Math.abs(seen.x)).toBeLessThan(0.95)
      expect(Math.abs(seen.y)).toBeLessThan(0.95)
    }
  })

  test('are in the walls by night, and away by day', () => {
    expect(aloft(DAY * 0.3)).toHaveLength(0)
    expect(aloft(DAY * 0.78)).toHaveLength(0)
    expect(aloft(DAY + 10).length).toBe(starlings.birds.length)
  })

  test('never fly into the land, but for the wall each goes into', () => {
    for (let time = 0; time < DAY; time += 0.5) {
      starlings.at(time, hour)

      starlings.birds.forEach((bird, index) => {
        if (index % 7 !== 0 || !starlings.fly(bird, hour, flight).up)
          return

        const near = Math.hypot(flight.x - bird.roost.x, flight.z - bird.roost.z) < 1.5

        expect(flight.y - ground.heightAt(flight.x, flight.z)).toBeGreaterThan(near ? 0.4 : 2)
      })
    }
  })
})
