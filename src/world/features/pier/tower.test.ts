// src/world/features/pier/tower.test.ts
import { describe, expect, test } from 'bun:test'

import { createGround } from '../../shared/ground.ts'
import { createPath, findSummit } from '../../shared/path.ts'
import { createPier } from '../../shared/pier.ts'
import { createWind } from '../../shared/wind.ts'
import { WORLD_SEED } from '../../world.ts'
import { CREEL, CREELS, LADDER, LANTERN, POST, POSTS, TOWER } from './plan.ts'
import { placeTower } from './tower.ts'


describe('the light at the pier\'s head', () => {
  const ground    = createGround({ seed: WORLD_SEED })
  const path      = createPath(ground, findSummit(ground))
  const pier      = createPier(ground, path, createWind())
  const tower     = placeTower(pier)
  const { jetty } = pier

  /** How far a place on the pier, in its own frame, is from the tower's middle. */
  const fromTower = (along: number, across: number): number => {
    const { x, z } = pier.place(along, across)

    return Math.hypot(x - tower.x, z - tower.z)
  }

  test('stands on the deck, its foot inside the pier\'s faces and short of its head', () => {
    expect(tower.foot).toBe(jetty.deck)
    expect(TOWER.foot).toBeLessThan(jetty.half - 0.3)
    expect(jetty.length - TOWER.back + TOWER.foot).toBeLessThan(jetty.length - 0.1)
  })

  test('is clear of every post, every creel and the ladder', () => {
    for (const { along, across } of POSTS)
      expect(fromTower(along, across)).toBeGreaterThan(TOWER.foot + POST.half)

    for (const { along, across } of CREELS)
      expect(fromTower(along, across)).toBeGreaterThan(TOWER.foot + Math.hypot(CREEL.long, CREEL.wide) / 2)

    expect(fromTower(LADDER.along, jetty.half)).toBeGreaterThan(TOWER.foot + 1)
  })

  test('carries its lantern over everything else on the pier, and over the boat\'s masthead from nowhere', () => {
    expect(tower.glass).toBeGreaterThan(tower.top)
    expect(tower.head - tower.glass).toBeCloseTo(LANTERN.glazed, 9)
    expect(tower.lamp.y).toBeGreaterThan(tower.glass)
    expect(tower.lamp.y).toBeLessThan(tower.head)
  })
})
