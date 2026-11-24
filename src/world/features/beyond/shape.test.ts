// src/world/features/beyond/shape.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { elevationAt, sunAt } from '../../shared/daylight.ts'
import { createGround } from '../../shared/ground.ts'
import { findView } from '../../views.ts'
import { WORLD_SEED } from '../../world.ts'
import { REACHES, createBeyondGeometry, createLands, heading, landHeight } from './shape.ts'
import type { Land } from './shape.ts'


const lands = createLands(WORLD_SEED)

/** The second the postcards are taken at. */
const POSTCARD = 10

/** How high the far land stands from `eye` along a bearing, in degrees over the level. */
function skyline (eye: readonly [number, number, number], bearing: number, among: readonly Land[] = lands): number {
  const [ dx, dz ] = heading(bearing)
  let highest      = -90

  for (let reach = 100; reach < 1400; reach += 2) {
    const x    = eye[0] + dx * reach
    const z    = eye[2] + dz * reach
    const from = THREE.MathUtils.radToDeg(Math.atan2(x, -z))

    for (const land of among) {
      const height = landHeight(land, from, Math.hypot(x, z))

      if (height > 0)
        highest = Math.max(highest, THREE.MathUtils.radToDeg(Math.atan2(height - eye[1], reach)))
    }
  }

  return highest
}

/** Toward the sun at `time`, as a bearing in degrees. */
function sunBearing (time: number): number {
  const sun = sunAt(time, new THREE.Vector3())

  return THREE.MathUtils.radToDeg(Math.atan2(sun.x, -sun.z))
}

describe('the land beyond', () => {
  test('lies well clear of the island', () => {
    const ground = createGround({ seed: WORLD_SEED })

    for (const reach of REACHES)
      expect(reach.near).toBeGreaterThan(ground.size)
  })

  test('shelves under the sea at every edge', () => {
    for (const land of lands) {
      const { from, to, near, far } = land.reach

      for (let part = 0; part <= 1; part += 0.05) {
        const bearing  = THREE.MathUtils.lerp(from, to, part)
        const distance = THREE.MathUtils.lerp(near, far, part)

        expect(landHeight(land, from, distance)).toBeLessThan(0)
        expect(landHeight(land, to, distance)).toBeLessThan(0)
        expect(landHeight(land, bearing, near)).toBeLessThan(0)
        expect(landHeight(land, bearing, far)).toBeLessThan(0)
      }
    }
  })

  test('is where the sun goes down', () => {
    let time = POSTCARD

    while (elevationAt(time) > 0)
      time += 0.25

    // From the middle of the island, at the height of a walker on its shore.
    const mainland = lands.filter(land => land.reach.name === 'mainland')

    expect(skyline([ 0, 3, 0 ], sunBearing(time), mainland)).toBeGreaterThan(2)
  })

  test('leaves the sun clear of it in the first view, when the postcards are taken', () => {
    const hero = findView('hero')!
    const eye  = [ hero.at[0], hero.height, hero.at[1] ] as const

    // The disc is about a degree across, and its halo wants room under it.
    expect(skyline(eye, sunBearing(POSTCARD))).toBeLessThan(elevationAt(POSTCARD) - 2)
  })

  test('is one geometry of a size a phone can draw', () => {
    const mobile  = createBeyondGeometry(lands, 'mobile')
    const desktop = createBeyondGeometry(lands, 'desktop')

    const triangles = (geometry: THREE.BufferGeometry): number => geometry.getIndex()!.count / 3

    expect(triangles(mobile)).toBeLessThan(triangles(desktop))
    expect(triangles(mobile)).toBeLessThan(8000)
    expect(triangles(desktop)).toBeLessThan(20_000)

    mobile.dispose()
    desktop.dispose()
  })
})
