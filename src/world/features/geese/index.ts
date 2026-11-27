// src/world/features/geese/index.ts
import * as THREE from 'three'

import { createGeese } from '../../shared/geese.ts'
import type { Geese, Wingbeat } from '../../shared/geese.ts'
import { commitInstances, disposeInstances } from '../../shared/instances.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import { createLumpGeometry } from '../../shared/lump.ts'
import { keepOutOfMirror } from '../../shared/mirror.ts'
import { PALETTE } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'

/** The lumps a goose is drawn in: its body, its neck held out before it, and a wing each side. */
const LUMPS = 4

/** How much over life-size a goose is drawn: they are only ever seen from far below, and a skein has to read as birds. */
const DRAWN = 1.3

/**
 * A goose's measures, for a bird of size 1. Its body and its neck, each as
 * half its width, half its height and half its length; and a wing: half its
 * length from root to tip, half its width fore and aft, half its thickness,
 * and how far out from the middle its root is.
 */
const BODY = [ 0.21, 0.19, 0.62 ] as const
const NECK = [ 0.075, 0.075, 0.47 ] as const
const WING = { half: 0.72, chord: 0.3, thick: 0.035, root: 0.12 } as const

/**
 * The grey goose's two colours, both the island's own: the rock's grey gone
 * toward the brown of a moorit fleece, and for its wings that taken darker,
 * toward the near black of the flock's faces.
 */
const GREY  = new THREE.Color(PALETTE.rock).lerp(new THREE.Color(PALETTE.moorit), 0.45)
const WINGS = new THREE.Color(PALETTE.rock).lerp(new THREE.Color(PALETTE.moorit), 0.45)
  .lerp(new THREE.Color(PALETTE.face), 0.4)

/** The way a bird looks, in its own frame: a wing is lifted by turning it about this. */
const AHEAD = new THREE.Vector3(1, 0, 0)

/** The turns that lay a lump's point toward the bird's tail, and toward its bill. */
const AFT  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
const FORE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)

/** Module-scope scratch, so a step allocates nothing. */
const held: Wingbeat = { x: 0, y: 0, z: 0, beat: 0, shown: 0 }
const bird           = new THREE.Matrix4()
const part           = new THREE.Matrix4()
const turn           = new THREE.Euler(0, 0, 0, 'YXZ')
const spin           = new THREE.Quaternion()
const place          = new THREE.Vector3()
const size           = new THREE.Vector3()

/** One lump of a goose, placed and turned in the bird's own frame (x ahead, y up, z to its right) and carried to where the bird is. */
function lump (mesh: THREE.InstancedMesh, index: number, at: readonly [number, number, number], turned: THREE.Quaternion, scale: readonly [number, number, number]): void {
  part.compose(place.set(...at), turned, size.set(...scale))
  mesh.setMatrixAt(index, part.premultiply(bird))
}

/** Put one goose where it is: body, neck, and the two wings at this moment of their beat. */
function poseGoose (mesh: THREE.InstancedMesh, index: number, yaw: number, scale: number, { x, y, z, beat }: Wingbeat): void {
  // A wing's stroke rocks the body the other way, a little.
  bird.compose(place.set(x, y - 0.12 * Math.sin(beat), z), spin.setFromEuler(turn.set(0, yaw, 0)), size.setScalar(scale))

  lump(mesh, index, [ 0, 0, 0 ], AFT, BODY)
  lump(mesh, index + 1, [ BODY[2] * 0.72 + NECK[2], 0.04, 0 ], FORE, NECK)

  for (const hand of [ -1, 1 ]) {
    spin.setFromAxisAngle(AHEAD, hand > 0 ? -beat : Math.PI + beat)
    lump(mesh, index + 2 + (hand + 1) / 2, [ 0.06, 0.08 + WING.half * Math.sin(beat), hand * (WING.root + WING.half * Math.cos(beat)) ], spin, [ WING.chord, WING.thick, WING.half ])
  }
}

/** Every goose of every skein, where it is at `time` seconds. */
function fly (mesh: THREE.InstancedMesh, geese: Geese, time: number): void {
  let index = 0

  for (const skein of geese.skeins)
    for (const goose of skein.birds) {
      geese.at(skein, goose, time, held)
      poseGoose(mesh, index, skein.yaw, goose.size * held.shown * DRAWN, held)
      index += LUMPS
    }

  mesh.instanceMatrix.needsUpdate = true
}

/**
 * The wild geese (`shared/geese.ts`): skeins going over on their way south,
 * each a ragged chevron with its wings beating in a wave that runs back
 * along its arms.
 *
 * The back end of the year, overhead: nobody's birds, bound somewhere else,
 * and gone over the bay before the next is in sight. One instanced mesh,
 * four faceted lumps to a bird (the gulls' own lump), never a model of a
 * goose; lit as the gulls and the starlings are, and so drawn with their
 * program.
 */
export function createGeeseFeature (world: World): Feature {
  let mesh: THREE.InstancedMesh | null = null
  let geese: Geese | null              = null

  return {
    name: 'geese',

    build ({ scene }) {
      geese = createGeese(world.seed, world.quality.tier)

      const count = geese.skeins.reduce((sum, skein) => sum + skein.birds.length, 0)

      const feathers = createLitMaterial(world, { name: 'geese' })

      // Rain runs off a feather: drawn as the starlings and the gulls are.
      feathers.sheds()

      mesh               = new THREE.InstancedMesh(createLumpGeometry(), feathers, count * LUMPS)
      mesh.name          = 'geese'
      mesh.castShadow    = false
      mesh.receiveShadow = false
      mesh.frustumCulled = false

      for (let index = 0; index < count * LUMPS; index += 1)
        mesh.setColorAt(index, index % LUMPS < 2 ? GREY : WINGS)

      // A phone's sea does not give them back: they are high, small and soon gone.
      if (world.quality.tier === 'mobile')
        keepOutOfMirror(mesh)

      fly(mesh, geese, 0)
      commitInstances(mesh)
      scene.add(mesh)
    },

    update (_state, frame) {
      if (mesh && geese)
        fly(mesh, geese, frame.frame * STEP)
    },

    dispose () {
      disposeInstances(mesh)
      mesh  = null
      geese = null
    },
  }
}

// perf: cheap — one draw call (two with the sea's mirror, off a phone) and no
// shadow pass: 32 triangles a bird, 1.8k for the 55 on desktop, 1k for a
// phone's 33. A step is four sines and four matrices a bird.
