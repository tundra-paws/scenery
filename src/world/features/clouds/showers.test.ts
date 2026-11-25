// src/world/features/clouds/showers.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'
import { createSeededRng } from 'threejs-scenes/primitives'

import { createLands, landHeight } from '../../shared/beyond.ts'
import { CLOUD_BASE } from '../../shared/cloud-shadow.ts'
import { elevationAt, sunAt } from '../../shared/daylight.ts'
import { createGround } from '../../shared/ground.ts'
import { findSummit } from '../../shared/path.ts'
import { WEATHER_SPAN, createWind } from '../../shared/wind.ts'
import { findView, resolveView } from '../../views.ts'
import { WORLD_SEED } from '../../world.ts'
import { PUFF_FLOOR } from './layout.ts'
import { STREAKS, createRainGeometry } from './rain.ts'
import { OPENING, SHOWER_BASE, layOutShowers } from './showers.ts'


/** A place brought back onto the weather's square, centred on the island. */
function wrapped (value: number): number {
  return ((value + WEATHER_SPAN / 2) % WEATHER_SPAN + WEATHER_SPAN) % WEATHER_SPAN - WEATHER_SPAN / 2
}

describe('the showers', () => {
  const wind    = createWind()
  const drift   = wind.driftAt(10)
  const sky     = (count: number, seed = 5): ReturnType<typeof layOutShowers> => layOutShowers({ rng: createSeededRng(seed).fork('test'), count, along: wind.direction, drift })
  const showers = sky(5)

  /** Where a shower is at `time` seconds. */
  type ShowerType = { x: number, z: number }

  const at = (shower: ShowerType, time: number): [number, number] => {
    const [ dx, dz ] = wind.driftAt(time)

    return [ wrapped(shower.x + dx), wrapped(shower.z + dz) ]
  }

  test('the same stream is the same weather', () => {
    expect(sky(5)).toEqual(showers)
    expect(sky(5, 6).slice(1)).not.toEqual(showers.slice(1))
    expect(showers).toHaveLength(5)
    expect(sky(0)).toEqual([])
  })

  test('the first stands where the visit opens on it, whatever the stream', () => {
    for (const first of [ showers[0]!, sky(5, 6)[0]! ]) {
      const [ x, z ] = at(first, 10)

      expect(x).toBeCloseTo(OPENING.x, 6)
      expect(z).toBeCloseTo(OPENING.z, 6)
    }
  })

  test('rides the wind the clouds ride', () => {
    const [ x, z ]   = at(showers[0]!, 10)
    const [ nx, nz ] = at(showers[0]!, 20)

    expect(nx - x).toBeCloseTo(wind.direction[0] * wind.speed * 10, 6)
    expect(nz - z).toBeCloseTo(wind.direction[1] * wind.speed * 10, 6)
  })

  test('opens with one shower in the sound: the others are far off the island and far from each other', () => {
    showers.slice(1).forEach(shower => {
      const [ x, z ] = at(shower, 10)

      expect(Math.hypot(x, z)).toBeGreaterThan(500)
    })

    showers.forEach((shower, index) => {
      for (const other of showers.slice(index + 1))
        expect(Math.hypot(wrapped(shower.x - other.x), wrapped(shower.z - other.z))).toBeGreaterThan(600)
    })
  })

  test('is a heavy cloud: lower than the fair-weather ones, flat under its row, with a storey on top', () => {
    for (const shower of showers) {
      expect(shower.y).toBeLessThan(CLOUD_BASE - 30)
      expect(Math.abs(shower.y - SHOWER_BASE)).toBeLessThan(8)

      const row = shower.puffs.filter(puff => Math.abs(puff.offset[1] - puff.scale[1] * PUFF_FLOOR) < 1e-9)

      expect(row.length).toBeGreaterThanOrEqual(6)
      expect(shower.puffs.length).toBeGreaterThan(row.length)

      // The rain falls under the cloud, not out beyond its ends.
      expect(shower.reach[0]).toBeLessThan(Math.max(...row.map(puff => Math.hypot(puff.offset[0], puff.offset[2]) + puff.scale[0])))
    }
  })

  test('stands in the hero frame at second ten: left of the sun and clear of it, off the cairn, before the far land', () => {
    const ground = createGround({ seed: WORLD_SEED })
    const pose   = resolveView(findView('hero')!, ground)
    const camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.5, 3000)

    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()

    const seen     = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z).project(camera)
    const first    = showers[0]!
    const [ x, z ] = at(first, 10)
    const half     = first.reach[0] + 20
    const ends     = [ -1, 1 ].map(end => seen(x + wind.direction[0] * half * end, first.y, z + wind.direction[1] * half * end))
    const sun      = sunAt(10, new THREE.Vector3())
    const disc     = seen(pose.position[0] + sun.x * 2000, pose.position[1] + sun.y * 2000, pose.position[2] + sun.z * 2000)
    const summit   = findSummit(ground)
    const cairn    = seen(summit.x, ground.heightAt(summit.x, summit.z) + 6, summit.z)

    // The sun is up and in the picture then; the cloud's middle is in it, and all of it is to the sun's left, with clear sky between.
    expect(elevationAt(10)).toBeGreaterThan(5)
    expect(Math.abs(disc.x)).toBeLessThan(1)

    const middle = seen(x, first.y, z)

    expect(middle.x).toBeGreaterThan(-0.95)

    for (const end of ends) {
      expect(end.x).toBeLessThan(disc.x - 0.08)
      expect(end.x).toBeLessThan(cairn.x - 0.3)
      expect(end.y).toBeGreaterThan(-0.2)
      expect(end.y).toBeLessThan(0.6)
    }

    // Nearer than any land on the horizon is high enough to stand in front of it.
    const lands   = createLands(WORLD_SEED)
    const bearing = THREE.MathUtils.radToDeg(Math.atan2(x, -z))

    for (const land of lands)
      for (let offset = -6; offset <= 6; offset += 1)
        for (let distance = 100; distance < Math.hypot(x, z) + 30; distance += 10)
          expect(landHeight(land, bearing + offset, distance)).toBeLessThan(first.y - 40)
  })
})

describe('the rain', () => {
  const wind    = createWind()
  const showers = layOutShowers({ rng: createSeededRng(5).fork('test'), count: 3, along: wind.direction, drift: wind.driftAt(10) })
  const rain    = (seed = 9): THREE.BufferGeometry => createRainGeometry(showers, createSeededRng(seed).fork('rain'))

  test('is two triangles a streak, the same every time', () => {
    const geometry = rain()

    expect(geometry.getIndex()!.count).toBe(showers.length * STREAKS * 6)
    expect(geometry.getAttribute('position').count).toBe(showers.length * STREAKS * 4)
    expect(Array.from(rain().getAttribute('aStreak').array)).toEqual(Array.from(geometry.getAttribute('aStreak').array))
  })

  test('falls under its own shower: every streak is on the ground its cloud covers, and knows its home', () => {
    const geometry = rain()
    const position = geometry.getAttribute('position')
    const home     = geometry.getAttribute('aCloud')
    const streak   = geometry.getAttribute('aStreak')

    for (let index = 0; index < position.count; index += 1) {
      const shower = showers[Math.floor(index / (STREAKS * 4))]!
      const along  = position.getX(index) * shower.row[0] + position.getZ(index) * shower.row[1]
      const aside  = -position.getX(index) * shower.row[1] + position.getZ(index) * shower.row[0]

      expect((along / shower.reach[0]) ** 2 + (aside / shower.reach[1]) ** 2).toBeLessThanOrEqual(1 + 1e-6)
      expect([ home.getX(index), home.getY(index), home.getZ(index) ]).toEqual([ Math.fround(shower.x), Math.fround(shower.y), Math.fround(shower.z) ])
      expect(Math.abs(streak.getX(index))).toBe(1)
      expect([ 0, 1 ]).toContain(streak.getY(index))
    }
  })
})
