// src/world/features/pier/tender.ts
import * as THREE from 'three'

import type { Pier } from '../../shared/pier.ts'
import { swellAt } from '../../shared/swell.ts'
import type { Swell } from '../../shared/swell.ts'
import type { Wind } from '../../shared/wind.ts'
import { STEMHEAD, createHullGeometry } from '../boat/hull.ts'
import { POST, POSTS, TENDER_SIZE } from './plan.ts'

/** How much of the swell so small a boat takes: nearly all of it. */
const RIDE = 0.9

/** How far it ranges on its ropes, fore and aft, and how far it turns between them, in radians. */
const RANGE = 0.07
const YAW   = 0.035

/** Module-scope scratch, so a step allocates nothing. */
const sea: Swell = { height: 0, slopeX: 0, slopeZ: 0 }

/** The small boat, and the one thing it does. */
export interface Tender {
  mesh: THREE.Mesh

  /** Lie as the sea has it at `time` seconds. */
  ride (time: number): void
  dispose (): void
}

/**
 * The small boat in the pier's lee: the boat at anchor's own build at six
 * tenths the size, no mast, its oars shipped, made fast to a post ahead and
 * a post astern. What goes between the boat and the shore.
 *
 * It rides the same swell (`swell.ts`) and ranges a hand's breadth on its
 * ropes, which are drawn in its own frame, as the anchor's rope is: it
 * moves too little for them to be seen to stretch.
 */
export function createTender (pier: Pier, wind: Wind, level: number, material: THREE.Material): Tender {
  const { tender, seaward, jetty } = pier
  const yaw                        = Math.atan2(-seaward[1], seaward[0])
  const starboard                  = [ -seaward[1], seaward[0] ] as const

  // The two posts on its side of the pier, as the boat sees them: ahead, up, and out to starboard.
  const ropes = POSTS.filter(post => post.across > 0).map(post => {
    const { x, z } = pier.place(post.along, post.across)
    const ahead    = ((x - tender.x) * seaward[0] + (z - tender.z) * seaward[1]) / TENDER_SIZE
    const out      = ((x - tender.x) * starboard[0] + (z - tender.z) * starboard[1]) / TENDER_SIZE
    const up       = (jetty.deck + POST.tall * 0.7 - level) / TENDER_SIZE
    const end      = Math.sign(ahead)

    return [[ end * STEMHEAD.along, STEMHEAD.up, 0 ], [ ahead, up, out ]] as const
  })

  const geometry = createHullGeometry({ mast: false, sail: false, ropes })
  const mesh     = new THREE.Mesh(geometry, material)

  mesh.name          = 'pier-tender'
  mesh.castShadow    = true
  mesh.receiveShadow = true
  mesh.scale.setScalar(TENDER_SIZE)

  // Turned to its heading first, then heeled and trimmed about its own axes.
  mesh.rotation.order = 'YXZ'

  return {
    mesh,

    ride (time) {
      const range = RANGE * Math.sin(time * 0.47 + 0.9)
      const turn  = yaw + YAW * Math.sin(time * 0.29 + 2.3)
      const x     = tender.x + seaward[0] * range
      const z     = tender.z + seaward[1] * range

      swellAt(wind.direction, x, z, time, sea)

      const ahead  = sea.slopeX * Math.cos(turn) - sea.slopeZ * Math.sin(turn)
      const across = sea.slopeX * Math.sin(turn) + sea.slopeZ * Math.cos(turn)

      mesh.position.set(x, level + sea.height * RIDE + 0.012 * Math.sin(time * 1.63 + 0.4), z)
      mesh.rotation.set(-Math.atan(across * RIDE) + 0.045 * Math.sin(time * 0.81 + 1), turn, Math.atan(ahead * RIDE) + 0.01 * Math.sin(time * 2.1))
    },

    dispose () {
      geometry.dispose()
      mesh.removeFromParent()
    },
  }
}

// perf: trivial — one draw call (three with its shadow and the mirror) of
// some 440 triangles. A step is a dozen sines and one question to the swell.
