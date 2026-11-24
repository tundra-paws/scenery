// src/world/shared/wash.ts
import * as THREE from 'three'


/** Something standing in the sea, as the water sees it: a disc at the waterline. */
export interface Footing {
  readonly x:      number
  readonly z:      number
  readonly radius: number
}

/** The boat on the water, as the sea's shader reads it. */
export interface WashUniforms {

  /** The middle of its waterline, and the way its bow points: x, z, cos, sin. */
  uBoat: { value: THREE.Vector4 }

  /** Half its waterline's length and half its beam there. */
  uBoatHull: { value: THREE.Vector2 }

  /** How far its shadow on the water lies from it, along the light. */
  uBoatShade: { value: THREE.Vector2 }
}

/**
 * What stands in the sea and what floats on it, for the sea to answer to.
 *
 * Filled in by the features that put things there as they are built (the
 * boulders, the landing's stones, the head-dyke's foot) and read by the water,
 * which is built after them and breaks round each (`features/water/wash.ts`).
 * The boat moves, so it is not a footing but uniforms its feature keeps
 * up to date and the sea's shader reads, like the wind's.
 */
export interface Wash {
  readonly footings: readonly Footing[]
  readonly uniforms: WashUniforms

  /** Something stands in the water here, this wide at the waterline. */
  stand (x: number, z: number, radius: number): void

  /** The boat's waterline, once: half its length and half its beam. */
  hull (half: number, beam: number): void

  /** Where the boat is now: its middle, the way its bow points, and where its shadow falls. */
  ride (x: number, z: number, bow: number, shadeX: number, shadeZ: number): void
}

export function createWash (): Wash {
  const footings: Footing[] = []

  // Until a boat says where it is, there is none: far off, and small.
  const uniforms: WashUniforms = {
    uBoat:      { value: new THREE.Vector4(1e5, 1e5, 1, 0) },
    uBoatHull:  { value: new THREE.Vector2(1, 1) },
    uBoatShade: { value: new THREE.Vector2(0, 0) },
  }

  return {
    footings,
    uniforms,

    stand (x, z, radius) {
      if (radius > 0)
        footings.push({ x, z, radius })
    },

    hull (half, beam) {
      uniforms.uBoatHull.value.set(half, beam)
    },

    ride (x, z, bow, shadeX, shadeZ) {
      uniforms.uBoat.value.set(x, z, Math.cos(bow), Math.sin(bow))
      uniforms.uBoatShade.value.set(shadeX, shadeZ)
    },
  }
}

/**
 * How wide a stone is where the water cuts it: one of the boulders' shape
 * (`stone.ts`), its middle at `y`, `radius` across and `half` from its middle
 * to its top. Nothing when it lies wholly over or under the water.
 */
export function waterline (y: number, radius: number, half: number, level: number): number {
  const off = (level - y) / half

  return Math.abs(off) < 1 ? radius * Math.sqrt(1 - off * off) : 0
}

// perf: trivial — a list filled once at build, and three small uniforms the
// boat sets each step.
