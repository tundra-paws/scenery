// src/world/shared/height-grid.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { GRID_SEGMENTS, createHeightGrid } from './height-grid.ts'


describe('createHeightGrid', () => {
  const ground = createGround({ seed: WORLD_SEED })

  test('holds the ground at every corner, to the last bit', () => {
    const grid = createHeightGrid(ground, 24)
    const half = ground.size / 2

    expect(grid.side).toBe(25)
    expect(grid.heights).toHaveLength(25 * 25)

    for (let row = 0; row < grid.side; row += 1)
      for (let column = 0; column < grid.side; column += 1)
        expect(grid.heights[row * grid.side + column]).toBe(ground.heightAt(column * grid.cell - half, row * grid.cell - half))
  })

  test.each(Object.values(GRID_SEGMENTS))('its corners are the vertices of the plane the terrain lays flat, at %i segments', segments => {
    const grid     = createHeightGrid(ground, segments)
    const geometry = new THREE.PlaneGeometry(ground.size, ground.size, segments, segments)
    const half     = ground.size / 2

    geometry.rotateX(-Math.PI / 2)

    const position = geometry.getAttribute('position')
    let off        = 0

    expect(position.count).toBe(grid.heights.length)

    for (let index = 0; index < position.count; index += 1) {
      const column = index % grid.side
      const row    = (index - column) / grid.side

      // The attribute is single precision; the grid's coordinates rounded the
      // same way must be the very same numbers.
      if (position.getX(index) !== Math.fround(column * grid.cell - half) || position.getZ(index) !== Math.fround(row * grid.cell - half))
        off += 1
    }

    expect(off).toBe(0)
  })

  test('the slope is level on the flat sea floor and steep where the land is', () => {
    const grid   = createHeightGrid(ground, GRID_SEGMENTS.desktop)
    const slopes = Array.from(grid.heights, (_, index) => grid.slopeAt(index % grid.side, Math.floor(index / grid.side)))

    expect(Math.min(...slopes)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...slopes)).toBeLessThan(1)
    expect(Math.max(...slopes)).toBeGreaterThan(0.3)
    expect(grid.slopeAt(0, 0)).toBeLessThan(0.02)
  })

  test('the slope follows the ground\'s own, as closely as a grid this coarse can', () => {
    const grid = createHeightGrid(ground, GRID_SEGMENTS.highEnd)
    const half = ground.size / 2
    let error = 0
    let count = 0

    for (let row = 4; row < grid.side; row += 7)
      for (let column = 4; column < grid.side; column += 7) {
        error += Math.abs(grid.slopeAt(column, row) - ground.slopeAt(column * grid.cell - half, row * grid.cell - half))
        count += 1
      }

    expect(error / count).toBeLessThan(0.02)
  })
})
