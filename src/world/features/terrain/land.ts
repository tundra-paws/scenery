// src/world/features/terrain/land.ts
import * as THREE from 'three'
import { clamp, mix, mx_noise_float, normalLocal, positionLocal, positionWorld, smoothstep, uniform } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { vec3Attribute } from '../../shared/nodes.ts'
import { PALETTE } from '../../shared/palette.ts'
import { grain, grit, ripples, seenAt, vein } from '../../shared/surface.ts'
import type { Surface } from '../../shared/surface.ts'
import type { World } from '../../world.ts'

/** How far the land under the heather goes to its bloom: the bushes on it carry the rest. */
const BLOOM = 0.8

/** Height over the water between which turf takes over from sand, and the part of the relief between which it dries to straw. */
const TURF  = [ 1, 2.1 ] as const
const STRAW = [ 0.35, 0.6 ] as const

/** How much of a vertex's heather it takes for a fragment to be in bloom, and the slope between which the land is bare rock. */
const LING  = [ 0.3, 0.52 ] as const
const SCREE = [ 0.19, 0.31 ] as const

/**
 * How far the land's own vertices are pushed out or in where it is rock, in
 * world units, and the pitch of the noise that says which: slower than the
 * coarsest tier's grid, so every vertex of a crag is a sample of it.
 */
const CRAG       = 0.85
const CRAG_PITCH = 0.14

/** What the land's material is given: the texture, the place its vertices go, and the grain the worn path wears. */
export interface Land {
  surface:  Surface
  position: Node<'vec3'>
  grit:     Node<'float'>
}

/** A palette colour as a node. */
function ink (name: keyof typeof PALETTE): Node<'vec3'> {
  return uniform(new THREE.Color(PALETTE[name])) as unknown as Node<'vec3'>
}

/**
 * What a vertex of the land says of itself, for `aLand`: how high it stands
 * over the water, how steep the drawn land is there, and how much heather
 * grows on it.
 */
export function describeLand (world: World, x: number, z: number, slope: number, height: number, out: number[] | Float32Array, at: number): void {
  out[at]     = height - world.ground.waterLevel
  out[at + 1] = slope
  out[at + 2] = world.moor.heatherAt(x, z, height, slope)
}

/**
 * The land's texture, worked out a fragment.
 *
 * What the ground is made of was a colour a vertex, blended across each
 * facet. Now a vertex only says how high, how steep and how heathery it is
 * (`aLand`), and each fragment decides for itself, with a noise added to
 * all three: so the turf ends on the sand in a ragged line, the heather
 * stands in clumps, and rock breaks out of a slope where it steepens. Each
 * of the five grounds has its own grain and its own relief: sand rippled
 * across the wind, turf in tussocks, straw the same and paler, heather
 * in dark-footed bushes, rock in beds with cracks through them.
 *
 * And where it is rock, the vertices themselves are moved: `position`.
 */
export function textureLand (world: World): Land {
  const seen  = seenAt(positionWorld, world.quality.tier)
  const land  = vec3Attribute('aLand')
  const sand  = ink('sand')
  const grass = ink('grass')
  const straw = ink('grassDry')
  const ling  = ink('heather')
  const rock  = ink('rock')

  const macro  = grain(seen, 0.17)
  const mid    = grain(seen, 0.75)
  const fine   = grain(seen, 3.2)
  const finest = grit(seen, 11)
  const beds   = grain(seen, [ 0.32, 2.6, 0.32 ])
  const crack  = vein(seen, 0.85, 0.05)
  const ripple = ripples(seen, world.wind.direction, mid)

  // The three things a vertex says, each made ragged.
  const high  = land.x.add(macro.mul(0.5)).add(mid.mul(0.3))
  const steep = land.y.add(mid.mul(0.035)).add(fine.mul(0.02))
  const heath = land.z.add(mid.mul(0.2)).add(fine.mul(0.12))

  const turfed = smoothstep(TURF[0], TURF[1], high)
  const dried  = smoothstep(STRAW[0], STRAW[1], high.div(world.ground.relief))
  const bloom  = smoothstep(LING[0], LING[1], heath).mul(BLOOM)
  const bare   = smoothstep(SCREE[0], SCREE[1], steep)

  // Tussocks: the turf's light and dark, a pace across, the blades in them,
  // and the terraces a grazed slope wears along its own level (the beds'
  // noise again: it runs flat, as they do).
  const tussock = mid.mul(0.45).add(fine.mul(0.25))
    .add(finest.mul(0.12))
    .add(beds.mul(0.35))
  const bush    = fine.mul(0.7).add(finest.mul(0.3))

  return {
    surface: {
      colour () {
        const beach  = sand.mul(ripple.mul(0.1).add(fine.mul(0.08))
          .add(finest.mul(0.05))
          .add(macro.mul(0.1))
          .add(1))
        const meadow = mix(grass, straw, clamp(macro.mul(1.3).add(0.2), 0, 1).mul(0.6)).mul(tussock.mul(0.8).add(1))
        const tops   = straw.mul(tussock.mul(0.7).add(macro.mul(0.2))
          .add(1))
        const moor   = ling.mul(bush.mul(0.8).add(mid.mul(0.35))
          .add(1))
        const crag   = rock.mul(beds.mul(0.5).add(mid.mul(0.2))
          .add(finest.mul(0.1))
          .add(1))
          .mul(crack.mul(-0.55).add(1))

        return mix(mix(mix(mix(beach, meadow, turfed), tops, dried), moor, bloom), crag, bare)
      },

      height: mix(
        mix(
          mix(ripple.mul(0.03).add(finest.mul(0.004)), tussock.mul(0.24), turfed),
          bush.mul(0.26).add(mid.mul(0.12)),
          bloom,
        ),
        beds.mul(0.34).add(mid.mul(0.12))
          .add(finest.mul(0.006))
          .sub(crack.mul(0.07)),
        bare,
      ),
    },

    position: positionLocal.add(normalLocal.mul(mx_noise_float(positionLocal.mul(CRAG_PITCH)).mul(CRAG)
      .mul(smoothstep(SCREE[0], SCREE[1] + 0.1, land.y)))),

    grit: fine.mul(0.6).add(finest.mul(0.4)),
  }
}

// perf: six noises a fragment of land on desktop (five on a phone), shared
// between its five grounds, and one more a vertex for the crags. No lookup:
// the land's only textures are still the path's picture and the clouds'.
