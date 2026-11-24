// src/world/features/shelter/index.ts
import * as THREE from 'three'

import { createLitMaterial, createUnlitMaterial } from '../../shared/lit.ts'
import { disposeInstances } from '../../shared/instances.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inWorld, stone as stonework, turf } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createBodyGeometry } from './body.ts'
import { createLamp, createLightGeometry, lampGlow, lampReach } from './light.ts'
import { CHIMNEY, HALF_DEEP, HALF_LONG, RIDGE } from './plan.ts'
import { createSmoke, createSmokeMaterial } from './smoke.ts'
import type { Smoke } from './smoke.ts'
import { layWalls } from './walls.ts'


/** A mesh that owns its geometry and its one material. */
function free (mesh: THREE.Mesh | null): void {
  mesh?.geometry.dispose()

  if (mesh?.material instanceof THREE.Material)
    mesh.material.dispose()
}

/**
 * The shelter: a low house of placed stone under a turf roof, on the shoulder
 * above the path's first hairpin, with a lamp in its doorway and a fire in
 * its hearth.
 *
 * The first built thing on the island, and still nobody is seen: only the
 * light they left burning and the smoke of their fire, which leans with the
 * same wind as the grass. Everything is built in the shelter's own frame
 * inside one group that `world.shelter` places and turns; only the smoke,
 * which belongs to the air, lives in the world's.
 */
export function createShelterFeature (world: World): Feature {
  let house: THREE.Group | null         = null
  let walls: THREE.InstancedMesh | null = null
  let body: THREE.Mesh | null           = null
  let light: THREE.Mesh | null          = null
  let lamp: THREE.PointLight | null     = null
  let smoke: Smoke | null               = null

  return {
    name: 'shelter',

    build ({ scene, rng }) {
      const { ground, shelter } = world

      /** Height of the land over the floor, at a place in the shelter's own frame. */
      const land = (across: number, along: number): number => {
        const { x, z } = shelter.place(across, along)

        return ground.heightAt(x, z) - shelter.floor
      }

      const stone = createLitMaterial(world, { name: 'shelter-stone' })
      const built = createLitMaterial(world, { name: 'shelter-body', vertexColors: true })

      // The walls are the island's stone, the roof its turf: the same grain as both.
      stone.finish(stonework(inWorld(world.quality.tier)))
      built.finish(turf(inWorld(world.quality.tier)))

      // A phone gets the same stones with fewer facets, as the dykes do:
      // two hundred of them, drawn for the sun's shadow and the sea's mirror
      // as well as for the eye.
      const detail = world.quality.tier === 'mobile' ? 0 : 1

      walls = layWalls(createStoneGeometry(rng.fork('shelter:shape').int(1, 1_000_000), detail), stone, rng.fork('shelter:lay'), land)

      // The dark inside goes down as far as the lowest ground at any corner.
      const foot = Math.min(land(-HALF_DEEP, -HALF_LONG), land(HALF_DEEP, -HALF_LONG), land(-HALF_DEEP, HALF_LONG), land(HALF_DEEP, HALF_LONG)) - 1

      body = new THREE.Mesh(createBodyGeometry(rng.fork('shelter:turf').int(1, 1_000_000), foot), built)
      body.name          = 'shelter-body'
      body.castShadow    = true
      body.receiveShadow = true

      light      = new THREE.Mesh(createLightGeometry(), createUnlitMaterial(world, { name: 'shelter-light', vertexColors: true }))
      light.name = 'shelter-light'

      lamp = createLamp()

      house      = new THREE.Group()
      house.name = 'shelter'
      house.position.set(shelter.x, shelter.floor, shelter.z)
      house.rotation.y = shelter.yaw
      house.add(walls, body, light, lamp)

      const top = shelter.place(0, CHIMNEY.along)

      smoke = createSmoke({
        tier:     world.quality.tier,
        seed:     rng.fork('shelter:smoke').int(1, 1_000_000),
        wind:     world.wind,
        from:     new THREE.Vector3(top.x, shelter.floor + RIDGE + CHIMNEY.over, top.z),
        material: createSmokeMaterial(world, world.day.haze),
      })

      smoke.drift(0)

      scene.add(house, smoke.mesh)
    },

    update (_state, frame) {
      const time = frame.frame * STEP

      smoke?.drift(time)

      if (lamp) {
        lamp.intensity = lampGlow(time, world.day.night)
        lamp.distance  = lampReach(world.day.night)
      }
    },

    dispose () {
      disposeInstances(walls)
      disposeInstances(smoke?.mesh ?? null)
      free(body)
      free(light)
      lamp?.dispose()
      house?.removeFromParent()

      house = null
      walls = null
      body  = null
      light = null
      lamp  = null
      smoke = null
    },
  }
}

// perf: cheap — four draw calls and two shadow passes: the stones (17k
// triangles), the body, the unlit openings and the smoke. One point light
// without a shadow. A step moves the smoke's puffs (`smoke.ts`) and sets two
// numbers on the lamp.
