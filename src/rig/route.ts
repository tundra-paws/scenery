// src/rig/route.ts
import type { Ground } from '../world/shared/ground.ts'
import type { Path } from '../world/shared/path.ts'
import { VIEWS, resolveView } from '../world/views.ts'
import type { Pose } from '../world/views.ts'
import { TOUR_CLEARANCE, createTour } from './tour.ts'
import type { Tour } from './tour.ts'
import type { WalkOptions } from './walk.ts'


/** Eye height over the path on a leg that is walked: the waymarks pass at the shoulder. */
export const WALK_EYE = 3

/** World units a second on foot, on the straight. Unhurried: the way up takes most of a minute. */
const PACE = 3

/** The point of the path nearest a camera position, as an index into its points. */
function nearest (path: Path, [ x, , z ]: Pose['position']): number {
  let best = 0

  path.points.forEach((point, index) => {
    if (Math.hypot(point.x - x, point.z - z) < Math.hypot(path.points[best]!.x - x, path.points[best]!.z - z))
      best = index
  })

  return best
}

/** The stretch of the path between two views, lifted to eye height: what a walked leg follows. */
function walkBetween (ground: Ground, path: Path, from: Pose, to: Pose): WalkOptions {
  const first = nearest(path, from.position)
  const last  = nearest(path, to.position)
  const step  = last < first ? -1 : 1
  const way   = []

  for (let index = first; index !== last + step; index += step) {
    const { x, z } = path.points[index]!

    way.push([ x, Math.max(ground.heightAt(x, z), ground.waterLevel) + WALK_EYE, z ] as const)
  }

  return { way, pace: PACE }
}

/**
 * The world's own tour: every postcard in order, flown between over the land,
 * except where a view says the way to the next is walked, up the path.
 *
 * DOM-free, so the rig and the test that walks the real tour build the same one.
 */
export function createWorldTour (ground: Ground, path: Path): Tour {
  const surface = (x: number, z: number): number => Math.max(ground.heightAt(x, z), ground.waterLevel)
  const poses   = VIEWS.map(view => resolveView(view, ground))
  const walks   = VIEWS.map((view, index) => view.walk ? walkBetween(ground, path, poses[index]!, poses[(index + 1) % poses.length]!) : null)

  return createTour(poses, { floor: { surface, clearance: TOUR_CLEARANCE }, walks, travels: VIEWS.map(view => view.travel) })
}

// perf: trivial — built once: a few hundred ground samples.
