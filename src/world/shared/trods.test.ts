// src/world/shared/trods.test.ts
import { describe, expect, test } from 'bun:test'

import { WORLD_SEED } from '../world.ts'
import { createGround } from './ground.ts'
import { createInfield } from './infield.ts'
import { createPath, findSummit } from './path.ts'
import { createShelter } from './shelter.ts'
import { traceTrods } from './trods.ts'


describe('the trods', () => {
  const ground  = createGround({ seed: WORLD_SEED })
  const summit  = findSummit(ground)
  const path    = createPath(ground, summit)
  const shelter = createShelter(ground, path)
  const infield = createInfield(shelter)
  const site    = { ground, summit, path, shelter, infield }
  const trods   = traceTrods(site, WORLD_SEED)

  test('are worn on the hills the sheep keep to, the same ones every time', () => {
    expect(trods.length).toBeGreaterThan(15)
    expect(traceTrods(site, WORLD_SEED)).toEqual(trods)

    // The brae under the cairn, which the first view looks at, has its share.
    const brae = trods.filter(trod => trod.some(point => Math.hypot(point.x - 21, point.z - 72) < 12))

    expect(brae.length).toBeGreaterThan(4)
  })

  test('keep to the grass: off the path, the walls, the field, the fold and the house', () => {
    for (const trod of trods)
      for (const { x, z } of trod) {
        expect(ground.heightAt(x, z)).toBeGreaterThan(ground.waterLevel + 1.3)
        expect(path.distanceTo(x, z)).toBeGreaterThan(1.7)
        expect(infield.inField(x, z)).toBe(false)
        expect(infield.distanceTo(x, z)).toBeGreaterThan(0.9)
        expect(Math.hypot(x - infield.fold.x, z - infield.fold.z)).toBeGreaterThan(infield.fold.radius + 0.7)
        expect(shelter.distanceTo(x, z)).toBeGreaterThan(2.9)
      }
  })

  test('run along the level of the hill, not up it', () => {
    for (const trod of trods) {
      let climb = 0
      let run   = 0

      for (let index = 1; index < trod.length; index += 1) {
        const from = trod[index - 1]!
        const to   = trod[index]!

        climb += Math.abs(ground.heightAt(to.x, to.z) - ground.heightAt(from.x, from.z))
        run   += Math.hypot(to.x - from.x, to.z - from.z)
      }

      expect(run).toBeGreaterThan(6.9)
      expect(climb / run).toBeLessThan(0.2)
    }
  })
})
