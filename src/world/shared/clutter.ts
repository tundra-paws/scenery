// src/world/shared/clutter.ts

/** Something lying on the land that nothing else knows the place of: where it is, and how far it reaches. */
interface Lump {
  x:      number
  z:      number
  radius: number
}

/**
 * What lies loose on the land, told by the features that put it there.
 *
 * The path, the walls, the house and the trees are each a rule that any
 * module can ask. A boulder is not: the rocks are strewn as the feature is
 * built, from its own stream of draws. So the rocks lay each one here as they
 * place it, and what is built after them (a flock that has to graze round
 * them) can ask how far a place is from the nearest. Filled in as the
 * features are built, like `wash`.
 */
export interface Clutter {

  /** Say that something this wide lies here. */
  lay (x: number, z: number, radius: number): void

  /** How far a place is from the edge of the nearest thing laid: negative inside one, Infinity if none. */
  distanceTo (x: number, z: number): number
}

export function createClutter (): Clutter {
  const lumps: Lump[] = []

  return {
    lay (x, z, radius) {
      lumps.push({ x, z, radius })
    },

    distanceTo (x, z) {
      let nearest = Infinity

      for (const lump of lumps)
        nearest = Math.min(nearest, Math.hypot(lump.x - x, lump.z - z) - lump.radius)

      return nearest
    },
  }
}

// perf: trivial — one entry a boulder; `distanceTo` walks them all, so ask it
// at build time, not per frame.
