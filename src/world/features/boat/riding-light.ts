// src/world/features/boat/riding-light.ts
import * as THREE from 'three'

import { lampLevel } from '../../shared/lamps.ts'
import { createUnlitMaterial } from '../../shared/lit.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { World } from '../../world.ts'
import { MAST } from './hull.ts'

/** The lantern: how wide and how tall its glass is, and how far under the truck and forward of the mast it hangs, on the forestay's side, clear of the cloth. */
const GLASS = { radius: 0.11, tall: 0.24 } as const
const HUNG  = { under: 0.45, ahead: 0.2 } as const

/** How much brighter than its colour it burns: the shelter's flame, behind glass, smaller and nearer white. */
const FLAME = 2.2

/** The riding light as it is drawn, and what lights it. */
export interface RidingLight {
  mesh: THREE.Mesh

  /** Light it, or put it out, for `time` seconds. */
  burn (time: number): void
  dispose (): void
}

/** A small lantern's glass, painted with the flame, in the boat's own frame. */
function createGlass (): THREE.BufferGeometry {
  const glass   = new THREE.CylinderGeometry(GLASS.radius * 0.8, GLASS.radius, GLASS.tall, 6).toNonIndexed()
  const count   = glass.getAttribute('position').count
  const colours = new Float32Array(count * 3)
  const flame   = new THREE.Color(PALETTE.lamp).multiplyScalar(FLAME)

  for (let index = 0; index < count; index += 1)
    flame.toArray(colours, index * 3)

  glass.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  glass.deleteAttribute('uv')
  glass.deleteAttribute('normal')

  return glass.translate(MAST.along + HUNG.ahead, MAST.top - HUNG.under, 0)
}

/**
 * The boat's riding light: a small lantern hoisted under her masthead at
 * dusk and burning there all night, as a boat at anchor shows one, so the
 * light at the pier's head and this one say where the landing is and where
 * she lies off it. It rides with her. The same flame as the shelter's lamp,
 * drawn with its program; it lights nothing but itself.
 */
export function createRidingLight (world: World): RidingLight {
  const material = createUnlitMaterial(world, { name: 'riding-light', vertexColors: true })
  const mesh     = new THREE.Mesh(createGlass(), material)

  mesh.name    = 'riding-light'
  mesh.visible = false

  return {
    mesh,

    burn (time) {
      const level = lampLevel(time)

      mesh.visible = level > 0
      material.color.setScalar(level * (1 + 0.05 * Math.sin(time * 6.1) * Math.sin(time * 2.9 + 1.3)))
    },

    dispose () {
      mesh.geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}

// perf: trivial — by day nothing; at night one unlit draw call of 24
// triangles (and one in the sea's mirror). A step works out the sun's height.
