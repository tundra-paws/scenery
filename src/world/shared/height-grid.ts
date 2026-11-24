// src/world/shared/height-grid.ts
import type { QualityTier } from 'threejs-scenes'

import type { Ground } from './ground.ts'

/** Grid cells per side. The terrain's triangles are twice the square of this, less the cells under deep water. */
export const GRID_SEGMENTS: Record<QualityTier, number> = { mobile: 96, desktop: 160, highEnd: 224 }

/**
 * The ground function, sampled once on the lattice the terrain is drawn on.
 *
 * Two features need the land at exactly these points: the terrain, for its
 * vertices, and the water, for the height map it reads the shore from. Asking
 * the function for them twice, and four more times a vertex for a slope, was
 * 150 ms of a 375 ms boot on the largest tier. Everything that stands on the
 * land somewhere else (a scatter, a walk, a camera) still asks `ground` itself.
 */
export interface HeightGrid {

  /** Cells per side. */
  readonly segments: number

  /** Corners per side: one more than `segments`. */
  readonly side: number

  /** Edge length of a cell, in world units. */
  readonly cell: number

  /**
   * World height at every corner: rows run from -z to +z and columns from -x to
   * +x, so the corner at `(column, row)` is `heights[row * side + column]`. The
   * same order as the vertices of a `PlaneGeometry` laid flat.
   */
  readonly heights: Float64Array

  /**
   * 0 on flat ground, approaching 1 on a cliff, at a corner.
   *
   * Measured across the corner's neighbours, which is the slope of the mesh
   * that is drawn there, rather than of the function behind it half a unit
   * either side: a facet coloured as rock is a facet that is steep.
   */
  slopeAt (column: number, row: number): number
}

export function createHeightGrid (ground: Ground, segments: number): HeightGrid {
  const side    = segments + 1
  const cell    = ground.size / segments
  const half    = ground.size / 2
  const heights = new Float64Array(side * side)

  // Written as `PlaneGeometry` writes its vertices, so the two agree to the
  // last bit and a vertex can take its height by index.
  for (let row = 0; row < side; row += 1)
    for (let column = 0; column < side; column += 1)
      heights[row * side + column] = ground.heightAt(column * cell - half, row * cell - half)

  function slopeAt (column: number, row: number): number {
    // One-sided at the rim, where there is no neighbour beyond.
    const west  = Math.max(column - 1, 0)
    const east  = Math.min(column + 1, segments)
    const north = Math.max(row - 1, 0)
    const south = Math.min(row + 1, segments)

    // Rise per world unit, each way.
    const dx = (heights[row * side + east]! - heights[row * side + west]!) / ((east - west) * cell)
    const dz = (heights[south * side + column]! - heights[north * side + column]!) / ((south - north) * cell)

    // The surface normal is (-dx, 1, -dz) normalised; its y is how level it is.
    return 1 - 1 / Math.hypot(dx, 1, dz)
  }

  return { segments, side, cell, heights, slopeAt }
}

// perf: cheap, once — a ground sample a corner (9k, 26k or 51k by tier) and
// eight bytes each. Nothing per frame.
