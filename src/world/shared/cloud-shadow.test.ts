// src/world/shared/cloud-shadow.test.ts
import { describe, expect, test } from 'bun:test'

import * as THREE from 'three'

import { bakeCloudShadow, createCloudShadow } from './cloud-shadow.ts'
import { WEATHER_SPAN } from './wind.ts'


const SIDE  = 200

const TEXEL = WEATHER_SPAN / SIDE

/** The baked value nearest a point of the weather's square, 0 to 1. */
function at (data: Uint8Array, x: number, z: number): number {
  const column = Math.floor((x + WEATHER_SPAN / 2) / TEXEL)
  const row    = Math.floor((z + WEATHER_SPAN / 2) / TEXEL)

  return data[row * SIDE + column]! / 255
}

describe('bakeCloudShadow', () => {
  test('an empty sky throws no shadow', () => {
    expect(bakeCloudShadow([], SIDE).every(value => value === 0)).toBe(true)
  })

  test('a blot is full at its middle, half at its rim and nothing well outside', () => {
    // The picture is of the sky from straight above: the slant is the lookup's.
    const data = bakeCloudShadow([{ x: 105, z: -55, radius: 60 }], SIDE)

    expect(at(data, 105, -55)).toBe(1)
    expect(at(data, 105 + 60, -55)).toBeCloseTo(0.5, 1)
    expect(at(data, 105, -55 - 60)).toBeCloseTo(0.5, 1)
    expect(at(data, 105 + 130, -55)).toBe(0)
  })

  test('a blot on the seam comes round on the far side', () => {
    const edge = WEATHER_SPAN / 2
    const data = bakeCloudShadow([{ x: edge - 5, z: 0, radius: 50 }], SIDE)

    expect(at(data, edge - 15, 5)).toBeGreaterThan(0.9)
    expect(at(data, -edge + 15, 5)).toBeGreaterThan(0.7)
  })

  test('overlapping blots are no darker than one', () => {
    const blot = { x: 0, z: 0, radius: 50 }
    const one  = bakeCloudShadow([ blot ], SIDE)
    const two  = bakeCloudShadow([ blot, blot ], SIDE)

    expect(two).toEqual(one)
  })
})

describe('the shadows\' slant', () => {
  const clouds = createCloudShadow()

  test('leans away from the light, further the lower it stands', () => {
    clouds.cast(new THREE.Vector3(-1, 1, 0).normalize(), 3)

    const high = clouds.uniforms.uCloudSlant.value.clone()

    clouds.cast(new THREE.Vector3(-2, 1, 0).normalize(), 3)

    expect(high.x).toBeCloseTo(-1, 5)
    expect(high.y).toBeCloseTo(0, 5)
    expect(clouds.uniforms.uCloudSlant.value.x).toBeCloseTo(-2, 5)
  })

  test('is never endless, however low the light', () => {
    clouds.cast(new THREE.Vector3(3, 0.01, 4).normalize(), 3)

    const reach = clouds.uniforms.uCloudSlant.value.length()

    clouds.cast(new THREE.Vector3(3, 0.2, 4).normalize(), 3)

    expect(reach).toBeLessThan(3)
    expect(clouds.uniforms.uCloudSlant.value.length()).toBeCloseTo(reach, 5)
    expect(clouds.uniforms.uCloudSlant.value.x / clouds.uniforms.uCloudSlant.value.y).toBeCloseTo(3 / 4, 5)
  })

  test('thins with the light, and is gone when the light is out', () => {
    clouds.cast(new THREE.Vector3(0, 1, 0), 3)

    const full = clouds.uniforms.uCloudShade.value

    clouds.cast(new THREE.Vector3(0, 1, 0), 0.3)

    expect(clouds.uniforms.uCloudShade.value).toBeGreaterThan(0)
    expect(clouds.uniforms.uCloudShade.value).toBeLessThan(full)

    clouds.cast(new THREE.Vector3(0, 1, 0), 0)

    expect(clouds.uniforms.uCloudShade.value).toBe(0)
  })
})
