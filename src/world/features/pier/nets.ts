// src/world/features/pier/nets.ts
import * as THREE from 'three'
import type { SeededRng } from 'threejs-scenes'

import type { Ground } from '../../shared/ground.ts'
import { createLitMaterial } from '../../shared/lit.ts'
import type { Pier } from '../../shared/pier.ts'
import type { World } from '../../world.ts'
import { NET, POLE } from './plan.ts'

/** Rows a net is drawn in, from the rope it hangs on to its hem. */
const ROWS = 3

/** How far a net leans from the wind, as a part of how far it hangs: in a lull, and what a full gust adds. */
const LEAN = [ 0.05, 0.2 ] as const

/** How far a wave running along it throws its hem, the same way: what it keeps in a lull, and what a full gust adds. */
const THROW = [ 0.03, 0.09 ] as const

/** How far over the sand a hem stops, at the least. */
const CLEAR = 0.22

/** Module-scope scratch, so a step allocates nothing. */
const hung = new THREE.Vector3()

/** The nets, and the one thing they do. */
export interface Nets {
  mesh: THREE.Mesh

  /** Hang as the wind has them at `time` seconds. */
  blow (time: number): void
  dispose (): void
}

/**
 * Where the rope the nets hang from is, `part` (0 to 1) of the way from pole
 * `span` to the next: a little under the poles' heads, and sagging between
 * them. Written into `out`.
 */
export function headRope (pier: Pier, span: number, part: number, out: THREE.Vector3): THREE.Vector3 {
  const from = pier.poles[span]!
  const to   = pier.poles[span + 1]!

  return out.set(
    from.x + (to.x - from.x) * part,
    from.top + (to.top - from.top) * part - POLE.rope - POLE.sag * 4 * part * (1 - part),
    from.z + (to.z - from.z) * part,
  )
}

/**
 * The nets on their poles: hung in folds from the rope to dry, a ragged hem
 * clear of the sand, leaning from the wind and stirring as it gusts.
 *
 * Like the pennant, they read the wind on the CPU (`wind.gustAt`) where they
 * hang, so they lift as the same gust flattens the grass behind them. The
 * rope end of every fold is still; the hem moves most. The wave that runs
 * along them never changes pace, only size, so a gust cannot make them jump.
 */
export function createNets (world: World, ground: Ground, lay: SeededRng, colour: THREE.Color): Nets {
  const { pier, wind } = world
  const spans          = pier.poles.length - 1
  const columns        = NET.folds + 1
  const count          = spans * columns * ROWS
  const rest           = new Float32Array(count * 3)
  const give           = new Float32Array(count)
  const position       = new THREE.BufferAttribute(new Float32Array(count * 3), 3)
  const index          = [] as number[]

  for (let span = 0; span < spans; span += 1)
    for (let column = 0; column < columns; column += 1) {
      headRope(pier, span, column / NET.folds, hung)

      // A fold stands out of the line of the poles one way, the next the other.
      const pleat = (column & 1 ? 1 : -1) * NET.pleat
      const floor = ground.heightAt(hung.x, hung.z) + CLEAR
      const hang  = Math.min(lay.range(NET.hang[0], NET.hang[1]), hung.y - floor)

      for (let row = 0; row < ROWS; row += 1) {
        const down = row / (ROWS - 1)
        const at   = (span * columns + column) * ROWS + row

        rest[at * 3]     = hung.x + pier.seaward[0] * pleat * (0.4 + 0.6 * down)
        rest[at * 3 + 1] = hung.y - hang * down
        rest[at * 3 + 2] = hung.z + pier.seaward[1] * pleat * (0.4 + 0.6 * down)
        give[at]         = hang * down ** 1.4

        if (column < NET.folds && row < ROWS - 1)
          index.push(at, at + 1, at + ROWS + 1, at, at + ROWS + 1, at + ROWS)
      }
    }

  position.setUsage(THREE.DynamicDrawUsage)

  const geometry = new THREE.BufferGeometry()
  const first    = pier.poles[0]!
  const last     = pier.poles.at(-1)!

  geometry.setAttribute('position', position)
  geometry.setIndex(index)

  // They move every step, so the sphere three culls by is set once, round
  // everywhere they can reach.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3((first.x + last.x) / 2, (first.foot + first.top) / 2, (first.z + last.z) / 2), Math.hypot(last.x - first.x, last.z - first.z) / 2 + 3)

  // The pennant's material in another colour, and so its program: cloth seen from both sides.
  const material = createLitMaterial(world, { name: 'nets', color: colour, side: THREE.DoubleSide })
  const mesh     = new THREE.Mesh(geometry, material)

  // Like the pennant it takes no shadow from the map: that would be a program of its own.
  mesh.name = 'pier-nets'

  return {
    mesh,

    blow (time) {
      for (let span = 0; span < spans; span += 1) {
        const from = (span * columns + NET.folds / 2) * ROWS
        const gust = wind.gustAt(rest[from * 3]!, rest[from * 3 + 2]!, time)

        for (let column = 0; column < columns; column += 1) {
          const wave = Math.sin((span * NET.folds + column) * 0.7 - time * 2.3) + 0.5 * Math.sin((span * NET.folds + column) * 0.31 - time * 1.1 + 1.7)
          const lean = LEAN[0] + LEAN[1] * gust + (THROW[0] + THROW[1] * gust) * wave

          for (let row = 0; row < ROWS; row += 1) {
            const at    = (span * columns + column) * ROWS + row
            const moved = give[at]! * lean

            // Pushed aside it swings up a little, as anything hung does.
            position.setXYZ(at, rest[at * 3]! + wind.direction[0] * moved, rest[at * 3 + 1]! + moved * lean * 0.5, rest[at * 3 + 2]! + wind.direction[1] * moved)
          }
        }
      }

      position.needsUpdate = true
    },

    dispose () {
      geometry.dispose()
      material.dispose()
      mesh.removeFromParent()
    },
  }
}

// perf: trivial — one draw call (two where it casts a shadow) of some 130
// triangles. A step asks the wind once a span and writes a hundred vertices.
