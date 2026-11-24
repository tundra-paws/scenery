// src/world/features/beyond/index.ts
import * as THREE from 'three'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { SKY_GLOW_GLSL } from '../../shared/daylight.ts'
import type { Feature, World } from '../../world.ts'
import { createBeyondGeometry } from '../../shared/beyond.ts'


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
 * The haze, by hand, in place of the fog. The fog fades into one colour, the
 * horizon's, which is right for the island and wrong out here: a far coast
 * stands in front of the sunset, and the air between it and the eye is lit by
 * the glow that is in the sky over it. So it fades into the sky's own colour
 * in the direction looked in, the way the far sea does, and the two meet as
 * one where the land comes down to the water.
 */
const HAZE = /* glsl */ `
  vec3  hazeRay      = vBeyond - cameraPosition;
  float hazeDistance = length(hazeRay);
  vec3  hazeSky      = uHorizon + skyGlow(hazeRay / hazeDistance);
  float hazeMist     = exp(-max(vBeyond.y, 0.0) / ${MIST.toFixed(1)});
  float hazed        = 1.0 - (1.0 - ${CLEAREST.toFixed(2)}) * exp2(-hazeDistance / ${HALF_HAZE.toFixed(1)});

  // Air seen against the land is lit from all of the sky, not only from the
  // glow on the horizon behind it, so it is a little of the zenith's blue.
  // The mist on the water is the horizon's alone, where the sea meets it.
  vec3 hazeAir = linearToOutputTexel(vec4(mix(mix(hazeSky, uZenith, ${COOL.toFixed(2)}), hazeSky, hazeMist), 1.0)).rgb;

  gl_FragColor.rgb = mix(gl_FragColor.rgb, hazeAir, mix(hazed, 1.0, hazeMist));
`

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
      const { uHorizon, uZenith, uSunDirection, uGlow } = world.day.uniforms

      const material = new THREE.MeshStandardMaterial({
        name:         'beyond',
        vertexColors: true,
        flatShading:  true,
        roughness:    1,
        metalness:    0,
        fog:          false,
      })

      amendShader(material, 'beyond-haze', shader => {
        Object.assign(shader.uniforms, { uHorizon, uZenith, uSunDirection, uGlow })

        shader.vertexShader = insertAfter(
          insertAfter(shader.vertexShader, '#include <common>', 'varying vec3 vBeyond;'),
          '#include <project_vertex>',
          'vBeyond = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        )

        shader.fragmentShader = insertAfter(
          insertAfter(shader.fragmentShader, '#include <common>', `${SKY_GLOW_GLSL}uniform vec3 uHorizon;uniform vec3 uZenith;varying vec3 vBeyond;`),
          '#include <colorspace_fragment>',
          HAZE,
        )
      })

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
