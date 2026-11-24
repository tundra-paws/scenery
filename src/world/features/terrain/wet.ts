// src/world/features/terrain/wet.ts
import type * as THREE from 'three'

import { amendShader, insertAfter } from '../../shared/amend.ts'
import { SWELL_GLSL } from '../../shared/swell.ts'
import { WIND_GLSL } from '../../shared/wind.ts'
import type { Wind } from '../../shared/wind.ts'


/** How high over the water the sand stays wet when the sea is level, and how much higher each unit of swell sends the wash. */
const WET   = 0.42
const SWASH = 2.6

/** What the water does to the sand: how much darker it is, and how smooth, so a low light catches it. */
const DARK  = 0.58
const GLOSS = 0.32

/** The clock the wash keeps: the world's time, set each step. */
export interface WetShore {
  time: { value: number }
}

/**
 * Wet the foot of the land: the sand the sea has just run back off is darker
 * and has a sheen, up to a line that climbs the beach as a back of the swell
 * comes ashore and falls back as it goes (`swell.ts`, the same swell the sea
 * draws and the boat rides). Rock at the waterline is wet the same way.
 */
export function wetTheShore (material: THREE.Material, wind: Wind, level: number): WetShore {
  const time = { value: 0 }

  amendShader(material, 'wet-shore', shader => {
    Object.assign(shader.uniforms, wind.uniforms, { uSwashTime: time })

    shader.vertexShader = insertAfter(
      insertAfter(shader.vertexShader, '#include <common>', 'varying vec3 vShore;'),
      '#include <project_vertex>',
      'vShore = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )

    shader.fragmentShader = insertAfter(
      insertAfter(
        insertAfter(shader.fragmentShader, '#include <common>', `${WIND_GLSL}${SWELL_GLSL}uniform float uSwashTime;varying vec3 vShore;`),
        '#include <color_fragment>',
        /* glsl */ `
          float swash = ${WET.toFixed(3)} + swellAt(vShore.xz, uSwashTime).x * ${SWASH.toFixed(3)};
          float wet   = 1.0 - smoothstep(swash - 0.1, swash, vShore.y - ${level.toFixed(3)});

          diffuseColor.rgb *= mix(1.0, ${DARK.toFixed(3)}, wet);
        `,
      ),
      '#include <roughnessmap_fragment>',
      `roughnessFactor = mix(roughnessFactor, ${GLOSS.toFixed(3)}, wet);`,
    )
  })

  return { time }
}

// perf: cheap — two sines a fragment of land, and nothing else; the land's
// draw call and its triangles are unchanged.
