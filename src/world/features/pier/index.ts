// src/world/features/pier/index.ts
import * as THREE from 'three'

import { disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { createStoneGeometry } from '../../shared/stone.ts'
import { inItself, inWorld, stone as stonework, timber } from '../../shared/surface.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { BARKED, createGear } from './gear.ts'
import { createNets } from './nets.ts'
import type { Nets } from './nets.ts'
import { WALL } from './plan.ts'
import { layStones } from './stones.ts'
import { createTender } from './tender.ts'
import type { Tender } from './tender.ts'

/**
 * The fishing: what the sea is worked from.
 *
 * Beside the landing a pier of the house's stone runs out past the shelf
 * into deep water, laid dry in level courses, the sea white along both its
 * faces. A small boat lies in its lee, made fast fore and aft, for getting
 * out to the one at anchor; creels are stacked on its head, a barrel and a
 * box of the catch stand by its root. Along the top of the beach, under the
 * field's dyke, the nets hang drying on a row of poles and stir in the wind
 * off the sea, and on the green west of the landing split fish dry on a
 * rack. Still nobody. Everything is built in the world's own frame; only
 * the nets and the small boat move.
 */
export function createPierFeature (world: World): Feature {
  let stones: THREE.InstancedMesh | null = null
  let gear: THREE.Mesh | null            = null
  let wood: LitMaterial | null           = null
  let nets: Nets | null                  = null
  let tender: Tender | null              = null

  return {
    name: 'pier',

    build ({ scene, rng }) {
      const { ground, pier, quality } = world
      const phone                     = quality.tier === 'mobile'

      // The house's stone and the boat's timber, each made as the other is,
      // so both are programs the island already has.
      const stone = createLitMaterial(world, { name: 'pier-stone' })
      const sawn  = createLitMaterial(world, { name: 'pier-gear', vertexColors: true })

      stone.finish(stonework(inWorld(quality.tier)))
      sawn.finish(timber(inItself(quality.tier)))

      wood = sawn

      stones = layStones(createStoneGeometry(rng.fork('pier:shape').int(1, 1_000_000), 0), stone, rng.fork('pier:lay'), { ground, pier, wash: world.wash, under: phone ? 1 : WALL.under })

      gear               = new THREE.Mesh(createGear(pier, ground, rng.fork('pier:gear'), phone), sawn)
      gear.name          = 'pier-gear'
      gear.castShadow    = true
      gear.receiveShadow = true

      nets   = createNets(world, ground, rng.fork('pier:nets'), BARKED)
      tender = createTender(pier, world.wind, ground.waterLevel, sawn)

      nets.mesh.castShadow = !phone

      // A phone's sea gives back the dark of the pier, not its stones, as
      // with every wall, nor the small boat under them, which throws no
      // shadow there either; and nowhere the nets, thin and behind the boat.
      keepOutOfMirror(nets.mesh)

      if (phone) {
        keepOutOfMirror(stones)
        keepOutOfMirror(tender.mesh)
        stones.castShadow      = false
        tender.mesh.castShadow = false
      }

      nets.blow(0)
      tender.ride(0)
      scene.add(stones, gear, nets.mesh, tender.mesh)
    },

    update (_state, frame) {
      nets?.blow(frame.frame * STEP)
      tender?.ride(frame.frame * STEP)
    },

    dispose () {
      disposeInstances(stones)
      gear?.geometry.dispose()
      gear?.removeFromParent()
      nets?.dispose()
      tender?.dispose()
      wood?.dispose()

      stones = null
      gear   = null
      wood   = null
      nets   = null
      tender = null
    },
  }
}

// perf: cheap — four draw calls, three shadow passes and three more in the
// sea's mirror (a phone: four, one and one): some 290 stones of 20
// triangles, 2k of gear, 130 of net and 450 of boat. A step moves the nets'
// hundred vertices and the small boat.
