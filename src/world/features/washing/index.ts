// src/world/features/washing/index.ts
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { createLine } from './line.ts'
import type { Line } from './line.ts'

/** How wide a strip of the green the flock leaves under the line, as lumps laid along it: their radius and how many. */
const KEPT = { radius: 0.9, lumps: 7 } as const

/**
 * The washing green: a line between two poles on the slope under the
 * house's low wall, and the week's washing on it.
 *
 * The sail is up to dry on the boat and the nets are on their poles: it is
 * a drying wind, and somebody ashore thought so too. Nobody is seen at it.
 * Built before the flock, which is told where the line is and grazes round
 * it rather than through a blanket.
 */
export function createWashingFeature (world: World): Feature {
  let line: Line | null = null

  return {
    name: 'washing',

    build ({ scene }) {
      const { washing, quality } = world

      line = createLine(world)

      line.mesh.castShadow = quality.tier !== 'mobile'

      // Far up the green and small: not in the sea's picture on any tier.
      keepOutOfMirror(line.mesh)

      for (let lump = 0; lump < KEPT.lumps; lump += 1) {
        const { x, z } = washing.lineAt(lump / (KEPT.lumps - 1))

        world.clutter.lay(x, z, KEPT.radius)
      }

      line.blow(0)
      scene.add(line.mesh)
    },

    update (_state, frame) {
      line?.blow(frame.frame * STEP)
    },

    dispose () {
      line?.dispose()
      line = null
    },
  }
}

// perf: trivial — one draw call and, off a phone, one shadow pass, of some
// 120 triangles; nothing in the sea's mirror. A step writes 150 vertices.
