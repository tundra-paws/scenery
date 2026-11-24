// src/world/features/shelter/smoke.ts
import * as THREE from 'three'
import type { QualityTier } from 'threejs-scenes'
import { createNoise3D, hash2, smoothstep } from 'threejs-scenes/primitives'


import { createLitMaterial } from '../../shared/lit.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Wind } from '../../shared/wind.ts'


/** Puffs in the air at once. Fewer on a phone, and the plume is the same length: they are only further apart. */
const PUFFS: Record<QualityTier, number> = { mobile: 16, desktop: 26, highEnd: 34 }

/** Seconds a puff lasts, from the chimney to nothing. */
const LIFE = 8

/** How fast a puff leaves the chimney, upward, and the part of that it has lost by the end. */
const RISE = 1.25
const TIRE = 0.55

/** How fast a puff is carried off once the air has hold of it, as a part of the wind's own speed: in a lull, and what a full gust adds. */
const CARRY = 0.1
const GUST  = 0.34

/** Seconds a puff takes to be caught up by the air. */
const CATCH = 1.6

/** A puff's radius as it leaves the chimney, and at its fullest. */
const BORN = 0.18
const FULL = 0.9

/** How far a puff may wander from the plume's line by the end of its life. */
const STRAY = 0.9

/** How much of its own colour a puff gives off unlit: smoke is thin, and the light goes through it. */
const THIN = 0.42

/** Module-scope scratch, so moving a puff allocates nothing. */
const dummy = new THREE.Object3D()

/** The smoke: its mesh, and the one thing done to it every step. */
export interface Smoke {
  mesh: THREE.InstancedMesh

  /** Put every puff where it is at `time` seconds. */
  drift (time: number): void
}

interface SmokeOptions {
  tier: QualityTier
  seed: number
  wind: Wind

  /** The top of the chimney, in the world. */
  from: THREE.Vector3

  /** What the puffs are drawn with (`createSmokeMaterial`). */
  material: THREE.Material
}

/** One puff: the clouds' own shape in small, all the way round. */
function createPuffGeometry (seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const noise    = createNoise3D(seed)
  const position = geometry.getAttribute('position')

  for (let index = 0; index < position.count; index += 1) {
    const x    = position.getX(index)
    const y    = position.getY(index)
    const z    = position.getZ(index)
    const bump = 1 + noise.sample(x * 1.2, y * 1.2, z * 1.2) * 0.2

    position.setXYZ(index, x * bump, y * bump, z * bump)
  }

  geometry.computeVertexNormals()

  return geometry
}

/**
 * What smoke is drawn with. No colour of its own, like the clouds: the
 * horizon's pale, which the light's colour lights on one side and the sky's
 * fills on the other. What shows through it is the haze of the hour (`haze`,
 * the same colour object whoever turns the day keeps, not a copy), so smoke
 * at night is not lit from within by the day's sky.
 */
export function createSmokeMaterial (air: Parameters<typeof createLitMaterial>[0], haze: THREE.Color): THREE.Material {
  const material = createLitMaterial(air, { name: 'smoke', color: PALETTE.horizon, emissiveIntensity: THIN })

  material.emissive = haze

  return material
}

/**
 * Smoke from the chimney: the first thing in the world to read the wind on
 * the CPU.
 *
 * A puff is not simulated. Where it is depends only on the time and on which
 * puff it is: it left the chimney a known while ago, into air that was
 * blowing as hard as `wind.gustAt` says it was then, and that air has carried
 * it since. So a gust lays the plume over and a lull lets it stand, the plume
 * bends where one followed the other, and second ten is the same picture
 * whenever it is asked for. Puffs are opaque, like the clouds: they come from
 * nothing and thin to nothing by size, not by fading.
 */
export function createSmoke ({ tier, seed, wind, from, material }: SmokeOptions): Smoke {
  const count = PUFFS[tier]

  const mesh  = new THREE.InstancedMesh(createPuffGeometry(seed), material, count)
  const reach = LIFE * (RISE + wind.speed * (CARRY + GUST))

  mesh.name = 'shelter-smoke'
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

  // The puffs move every step, so the sphere three culls by is given once,
  // wide enough for the plume wherever the wind lays it.
  mesh.boundingSphere = new THREE.Sphere(from.clone(), reach)

  return {
    mesh,

    drift (time) {
      for (let puff = 0; puff < count; puff += 1) {
        const turn = time / LIFE + puff / count
        const born = Math.floor(turn)
        const age  = turn - born
        const gone = age * LIFE

        // How hard it was blowing over the chimney when this puff left it.
        const gust  = wind.gustAt(from.x, from.z, time - gone)
        const speed = wind.speed * (CARRY + GUST * gust)

        // Every puff that has ever left has its own shape and its own way of
        // wandering, from which puff it is and how many times it has left.
        // It swells as it leaves, and only near the end does it thin away, so
        // the plume is one thing for most of its length and crumbs at its tip.
        const size  = (BORN + (FULL - BORN) * smoothstep(0, 0.35, age)) * smoothstep(0, 0.03, age) * (1 - smoothstep(0.62, 1, age))
        const far   = speed * (gone - CATCH * (1 - Math.exp(-gone / CATCH)))
        const stray = STRAY * Math.sqrt(age)

        dummy.position.set(
          from.x + wind.direction[0] * far + (hash2(born, puff + 0.3) - 0.5) * stray,
          from.y + RISE * gone * (1 - TIRE * age) + (hash2(born + 0.7, puff) - 0.5) * stray,
          from.z + wind.direction[1] * far + (hash2(puff + 0.6, born + 0.2) - 0.5) * stray,
        )
        dummy.rotation.set(hash2(puff, born + 0.4) * 6.28 + gone * 0.21, hash2(born, puff + 0.9) * 6.28 + gone * 0.13, 0)
        dummy.scale.set(size * (0.8 + 0.6 * hash2(puff, born)), size * (0.7 + 0.4 * hash2(born + 0.5, puff)), size * (0.8 + 0.6 * hash2(puff + 0.5, born)))
        dummy.updateMatrix()

        mesh.setMatrixAt(puff, dummy.matrix)
      }

      mesh.instanceMatrix.needsUpdate = true
    },
  }
}

// perf: cheap — one draw call, no shadow pass, 80 triangles a puff: 1.3k on
// the mobile tier, 2k on desktop. A step is three sines, one exponential and
// six hashes a puff on the CPU, and one small buffer sent to the GPU.
