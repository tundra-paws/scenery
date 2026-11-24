// src/world/features/beyond/index.ts
import * as THREE from 'three'
import { cameraPosition, exp, exp2, float, length, max, mix, positionWorld } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { createBeyondGeometry } from '../../shared/beyond.ts'
import type { DaylightNodes } from '../../shared/daylight.ts'
import { LitMaterial } from '../../shared/lit.ts'
import { developed, printed } from '../../shared/output.ts'
import { fell, inWorld } from '../../shared/surface.ts'
import type { Feature, World } from '../../world.ts'


/**
 * The air between here and there: how far light goes through it before half
 * of what reaches the eye is the air's own colour, in world units, and how
 * high over the water the sea mist lies.
 */
const HALF_HAZE = 900
const MIST      = 16

/** The most of the far land the haze ever leaves: it is always seen through air. */
const CLEAREST = 0.2

/** How much of the zenith's blue is in the air in front of the land, away from the water. */
const COOL = 0.3

/**
 * The haze, by hand, in place of the fog: the far land's way to the screen.
 * The fog fades into one colour, the horizon's, which is right for the
 * island and wrong out here: a far coast stands in front of the sunset, and
 * the air between it and the eye is lit by the glow that is in the sky over
 * it. So it fades into the sky's own colour in the direction looked in, the
 * way the far sea does, and the two meet as one where the land comes down to
 * the water.
 */
function hazeOver (light: Node<'vec3'>, { horizon, zenith, skyGlow }: DaylightNodes): Node<'vec3'> {
  const ray   = positionWorld.sub(cameraPosition)
  const far   = length(ray)
  const sky   = horizon.add(skyGlow(ray.div(far)))
  const mist  = exp(max(positionWorld.y, 0).div(-MIST))
  const hazed = exp2(far.div(-HALF_HAZE)).mul(1 - CLEAREST)
    .oneMinus()

  // Air seen against the land is lit from all of the sky, not only from the
  // glow on the horizon behind it, so it is a little of the zenith's blue.
  // The mist on the water is the horizon's alone, where the sea meets it.
  const air = printed(mix(mix(sky, zenith, COOL), sky, mist))

  return mix(developed(light), air, mix(hazed, 1, mist))
}

/**
 * Land on the horizon: a mountain coast across the north-west that the sun
 * goes down behind, a lower island to the north, and a few stacks nearer in.
 *
 * Nobody goes there. It is what the island is seen against, and what tells a
 * visitor how big the sea is: blue-grey ranges in the haze, the low sun over
 * them, lit pink from the east at first light and black against the glow at
 * dusk. Flat-shaded like the island and lit by the same light, so it keeps the
 * hour with everything else; and hazed into the sky behind it, so it never
 * stands out from it.
 */
export function createBeyond (world: World): Feature {
  let mesh: THREE.Mesh | null = null

  return {
    name: 'beyond',

    build ({ scene }) {
      // Far outside the clouds the island has: nothing shades it but the hour.
      const material = new LitMaterial(float(1), light => hazeOver(light, world.day.nodes), {
        name:         'beyond',
        vertexColors: true,
        flatShading:  true,
        roughness:    1,
        metalness:    0,
      })

      material.finish(fell(inWorld(world.quality.tier)))

      mesh      = new THREE.Mesh(createBeyondGeometry(world.beyond, world.quality.tier), material)
      mesh.name = 'beyond'

      scene.add(mesh)
    },

    dispose () {
      mesh?.geometry.dispose()

      if (mesh?.material instanceof THREE.Material)
        mesh.material.dispose()

      mesh?.removeFromParent()
      mesh = null
    },
  }
}

// perf: cheap — one draw call, no shadow pass (it neither casts nor takes
// one: it is far outside the light's frustum). 9k triangles on desktop, 3k on
// mobile, 16k on highEnd. The haze is a length, two exponentials and the sky's glow a
// fragment, and the land is a thin band of the screen. Nothing per frame.
