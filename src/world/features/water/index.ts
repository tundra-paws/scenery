// src/world/features/water/index.ts
import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import type { QualityTier } from 'threejs-scenes'

import { createHeightMap } from '../../shared/height-map.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createMirror } from './mirror.ts'
import type { Mirror } from './mirror.ts'
import { createSeaMaterial } from './shader.ts'
import { createWashMap } from './wash.ts'


/** Edge length of the water plane. Far wider than the land, so the fog hides its edge. */
const EXTENT = 3200

/** The reflection's size against the picture's, on each axis. A phone draws a quarter as many of its pixels as it would at half. */
const MIRROR_SCALE: Record<QualityTier, number> = { mobile: 0.35, desktop: 0.5, highEnd: 0.6 }

/**
 * The sea: one plane at the water level, pale over the shelf and dark past it,
 * thinning to foam where the land comes up through it. Its ripples run before
 * the wind, gusts cross it as darker patches, the foam is widest on the shore
 * the wind blows onto, and the clouds lay their shadows on it. It keeps the
 * hour: darker as the light goes, glinting under the sun and then the moon,
 * and fading far out into whatever the sky is doing on that side.
 *
 * And it answers to what is over it and in it. It gives the world back, upside
 * down and shaken by its ripples (`mirror.ts`); it breaks white round every
 * stone that stands in it and sends rings out from them (`wash.ts`); and the
 * boat lays its shadow on it, laps it at the waterline and leaves a calm in
 * its lee. Built last, after everything that stands in it has said so.
 */
export function createWater (world: World): Feature {
  const time = { value: 0 }

  let mesh: THREE.Mesh | null          = null
  let material: THREE.Material | null  = null
  let ground: THREE.DataTexture | null = null
  let wash: THREE.DataTexture | null   = null
  let mirror: Mirror | null            = null

  return {
    name: 'water',

    build ({ scene }) {
      const heights = createHeightMap(world.ground, world.grid)
      const washMap = createWashMap(world.wash.footings, world.ground.size)

      ground   = heights.texture
      wash     = washMap.texture
      mirror   = createMirror({ level: world.ground.waterLevel, scale: MIRROR_SCALE[world.quality.tier] })
      material = createSeaMaterial({ wind: world.wind, clouds: world.clouds, day: world.day, wash: world.wash, weather: world.weather, ground: heights, standing: washMap, mirror, time })

      const geometry = new THREE.PlaneGeometry(EXTENT, EXTENT)

      geometry.rotateX(-Math.PI / 2)

      mesh            = new THREE.Mesh(geometry, material)
      mesh.name       = 'water'
      mesh.position.y = world.ground.waterLevel

      // The reflection is drawn just before the sea, for the camera that is
      // about to draw it, whichever that is.
      const sea = mesh
      const own = mirror

      mesh.onBeforeRender = (renderer, drawn, camera) => own.reflect(renderer as unknown as WebGPURenderer, drawn, camera, sea)

      scene.add(mesh)
    },

    update (_state, frame) {
      time.value = frame.frame * STEP
    },

    dispose () {
      mesh?.geometry.dispose()
      material?.dispose()
      ground?.dispose()
      wash?.dispose()
      mirror?.dispose()
      mesh?.removeFromParent()
      mesh     = null
      material = null
      ground   = null
      wash     = null
      mirror   = null
    },
  }
}

// perf: one draw call and two triangles for the sea itself, and the mirror:
// everything over the water drawn once more, at half the picture's size or
// less, with no shadow pass (`mirror.ts`). Two small textures, the land's
// height and what stands in the water, baked once. The fragment shader is a
// dozen trig calls and four lookups (the land under it, the clouds over it,
// the mirror, what stands in it), with two more only near the shore or a
// stone. It covers a lot of screen, so keep it that small.
