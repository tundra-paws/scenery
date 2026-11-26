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
import { createGulls } from '../../shared/gulls.ts'
import { createBeacon } from './beacon.ts'
import type { Beacon } from './beacon.ts'
import { BARKED, createGear } from './gear.ts'
import { createFlight, findPerches } from './gulls.ts'
import type { Flight } from './gulls.ts'
import { createNets } from './nets.ts'
import type { Nets } from './nets.ts'
import { WALL } from './plan.ts'
import { layStones } from './stones.ts'
import { createTender } from './tender.ts'
import { placeTower } from './tower.ts'
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
 * rack. Still nobody: only the gulls that follow the fishing, a few riding
 * the wind in rounds over the water off the pier and a couple standing on a
 * post and a pole, all of them down on a perch by dark. Everything is built
 * in the world's own frame; only the nets, the small boat and the gulls move.
 */
export function createPierFeature (world: World): Feature {
  let stones: THREE.InstancedMesh | null = null
  let gear: THREE.Mesh | null            = null
  let wood: LitMaterial | null           = null
  let nets: Nets | null                  = null
  let tender: Tender | null              = null
  let gulls: Flight | null               = null
  let beacon: Beacon | null              = null

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

      const tower = placeTower(pier)

      stones = layStones(createStoneGeometry(rng.fork('pier:shape').int(1, 1_000_000), 0), stone, rng.fork('pier:lay'), { ground, pier, wash: world.wash, under: phone ? 1 : WALL.under, tower })

      gear               = new THREE.Mesh(createGear(pier, ground, tower, rng.fork('pier:gear'), phone), sawn)
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

      // The gulls are lit as the starlings are, a plain material with a
      // colour to each lump, and so are drawn with their program.
      gulls = createFlight(createGulls(pier, findPerches(pier), world.wind.direction, world.seed, quality.tier), createLitMaterial(world, { name: 'pier-gulls' }))

      if (phone)
        keepOutOfMirror(gulls.mesh)

      beacon = createBeacon(world, tower)

      nets.blow(0)
      tender.ride(0)
      beacon.burn(0, world.day.night)
      scene.add(stones, gear, nets.mesh, tender.mesh, gulls.mesh, beacon.panes, beacon.lamp)
    },

    update (_state, frame) {
      nets?.blow(frame.frame * STEP)
      tender?.ride(frame.frame * STEP)
      gulls?.fly(frame.frame * STEP)
      beacon?.burn(frame.frame * STEP, world.day.night)
    },

    dispose () {
      disposeInstances(stones)
      disposeInstances(gulls?.mesh ?? null)
      gear?.geometry.dispose()
      gear?.removeFromParent()
      nets?.dispose()
      tender?.dispose()
      wood?.dispose()
      beacon?.dispose()

      beacon = null
      stones = null
      gear   = null
      wood   = null
      nets   = null
      tender = null
      gulls  = null
    },
  }
}

// perf: cheap — five draw calls, three shadow passes and four more in the
// sea's mirror (a phone: five, one and one): some 290 stones of 20
// triangles, 2k of gear, 130 of net, 450 of boat and 220 of gulls. A step
// moves the nets' hundred vertices, the small boat, and four lumps a gull.
