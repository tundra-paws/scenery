// src/world/shared/path.ts
import { smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from './ground.ts'

/** Grid step of the search for the way, in world units. */
const CELL = 2

/** Headings a walker may take from a grid corner. */
const HEADINGS = 16

/**
 * The ways to leave a grid corner, in order round the compass: to a neighbour,
 * or a knight's move away. Sixteen headings, so a leg of the path can lie at
 * the slant a hill is really crossed at, not only along the grid.
 */
const MOVES = Array.from({ length: HEADINGS }, (_, heading) => {
  const angle = heading / HEADINGS * Math.PI * 2
  const reach = heading % 2 === 0 ? 1.4 : 2

  return [ Math.round(Math.cos(angle) * reach), Math.round(Math.sin(angle) * reach) ] as const
})

/**
 * The climb a walker settles into, as rise over run. A step costs its length
 * times one plus the square of its climb over this, which makes this exact
 * grade the cheapest way up anything steeper: the path takes a hill face in
 * slanting legs, and goes straight where the ground is gentle.
 */
const GRADE = 0.3

/** What turning right round costs, in units walked. It keeps the legs long and the hairpins few. */
const TURN = 5

/** How steep the ground itself is (rise over run) where a walker starts to go round, and where they would not go at all. */
const STEEP = [ 0.75, 1.3 ] as const

/** How many times dearer a step is on ground as steep as that. */
const CLIFF = 6

/** Land lower than this over the water is beach the sea runs up: the path stays above it, except where it lands. */
const DRY = 0.5

/** How far beyond the landing and the summit the search may wander. */
const MARGIN = 24

/** Which way the landing lies from the summit, as an angle from +x toward +z: on the near shore of the `hero` frame. */
const LANDING_BEARING = 0.82

/** Height of the top of the beach, where the path leaves the sand. */
const BEACH_TOP = 1

/** How far short of the summit the path stops: the cairn and its spill stand there. */
const STOP_SHORT = 7

/** Distance between the finished path's points. */
const SPACING = 1.5

/** Passes of corner cutting that turn the grid's legs into a line a foot would wear. */
const SOFTEN = 3

/** A place on the ground. */
export interface Waypoint {
  x: number
  z: number
}

/** A place on the path, and the unit direction the path runs there, uphill. */
export interface Stretch extends Waypoint {
  ahead: readonly [number, number]
}

/** Where the path meets the sea. */
export interface Landing extends Waypoint {

  /** Unit direction from the land out to sea. */
  seaward: readonly [number, number]
}

/**
 * The way from the shore to the summit, as a line on the ground.
 *
 * Found, not drawn: a search over the land for the cheapest walk from the
 * landing to the top, so it follows the land if the land is reshaped. Like the
 * ground it is DOM-free and GPU-free: the terrain wears it into the grass, the
 * scatterers keep off it, the waymarks stand beside it and the tour walks it.
 */
export interface Path {

  /** From the waterline to the top, `spacing` apart. */
  readonly points:  readonly Waypoint[]
  readonly spacing: number
  readonly length:  number
  readonly landing: Landing

  /** The place `distance` along the path from the waterline. */
  at (distance: number): Stretch

  /** How far a place is from the middle of the path. */
  distanceTo (x: number, z: number): number
}

/** The land around the two ends of the path, sampled once on the search's grid. */
interface Survey {
  columns: number
  rows:    number
  x:       number
  z:       number
  height:  Float32Array

  /** Steepness of the ground at each corner, as rise over run. */
  steep: Float32Array

  /** Height below which a corner is no place to walk. */
  dry: number
}

/** A binary heap of search states, cheapest first. */
class Queue {
  private readonly costs:  number[] = []
  private readonly states: number[] = []

  private swap (one: number, other: number): void {
    const cost  = this.costs[one]!
    const state = this.states[one]!

    this.costs[one]    = this.costs[other]!
    this.states[one]   = this.states[other]!
    this.costs[other]  = cost
    this.states[other] = state
  }

  get size (): number {
    return this.states.length
  }

  push (cost: number, state: number): void {
    let at = this.states.length

    this.costs.push(cost)
    this.states.push(state)

    while (at > 0) {
      const parent = at - 1 >> 1

      if (this.costs[parent]! <= cost)
        break

      this.swap(at, parent)
      at = parent
    }
  }

  pop (): number {
    const top  = this.states[0]!
    const last = this.states.length - 1

    this.swap(0, last)
    this.costs.pop()
    this.states.pop()

    for (let at = 0; ;) {
      const left  = at * 2 + 1
      const right = left + 1
      let least   = at

      if (left < last && this.costs[left]! < this.costs[least]!)
        least = left

      if (right < last && this.costs[right]! < this.costs[least]!)
        least = right

      if (least === at)
        return top

      this.swap(at, least)
      at = least
    }
  }
}

/** The highest point of the land, on a two-unit grid. */
export function findSummit (ground: Ground): Waypoint {
  const half = ground.size / 2
  const best = { x: 0, z: 0, height: -Infinity }

  for (let x = -half; x <= half; x += CELL)
    for (let z = -half; z <= half; z += CELL) {
      const height = ground.heightAt(x, z)

      if (height > best.height)
        Object.assign(best, { x, z, height })
    }

  return { x: best.x, z: best.z }
}

/** Walk out from `from` along a bearing until the land has come down to `height` over the water. */
function descendTo (ground: Ground, from: Waypoint, [ dx, dz ]: readonly [number, number], height: number): Waypoint {
  let reach = 0

  while (reach < ground.size && ground.heightAt(from.x + dx * reach, from.z + dz * reach) > ground.waterLevel + height)
    reach += 0.25

  return { x: from.x + dx * reach, z: from.z + dz * reach }
}

/** Sample the land on a grid that has `foot` on one of its corners and reaches `MARGIN` past both ends. */
function survey (ground: Ground, foot: Waypoint, top: Waypoint): Survey {
  const before  = (from: number, to: number): number => Math.ceil((from - Math.min(from, to) + MARGIN) / CELL)
  const after   = (from: number, to: number): number => Math.ceil((Math.max(from, to) - from + MARGIN) / CELL)
  const columns = before(foot.x, top.x) + after(foot.x, top.x) + 1
  const rows    = before(foot.z, top.z) + after(foot.z, top.z) + 1
  const x       = foot.x - before(foot.x, top.x) * CELL
  const z       = foot.z - before(foot.z, top.z) * CELL
  const height  = new Float32Array(columns * rows)
  const steep   = new Float32Array(columns * rows)

  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns; column += 1)
      height[row * columns + column] = ground.heightAt(x + column * CELL, z + row * CELL)

  for (let row = 1; row < rows - 1; row += 1)
    for (let column = 1; column < columns - 1; column += 1) {
      const at = row * columns + column

      steep[at] = Math.hypot(height[at + 1]! - height[at - 1]!, height[at + columns]! - height[at - columns]!) / (CELL * 2)
    }

  return { columns, rows, x, z, height, steep, dry: ground.waterLevel + DRY }
}

/** The grid corner nearest a place. */
function cornerAt (land: Survey, place: Waypoint): number {
  return Math.round((place.z - land.z) / CELL) * land.columns + Math.round((place.x - land.x) / CELL)
}

/** The corner one move from `corner`, or -1 where that is off the survey's inside or too low to walk on. */
function stepFrom (land: Survey, corner: number, heading: number): number {
  const column = corner % land.columns + MOVES[heading]![0]
  const row    = Math.floor(corner / land.columns) + MOVES[heading]![1]

  if (column < 1 || row < 1 || column > land.columns - 2 || row > land.rows - 2)
    return -1

  const to = row * land.columns + column

  return land.height[to]! > land.dry ? to : -1
}

/** What it costs to walk one move, in units of level ground. */
function stride (land: Survey, from: number, to: number, heading: number): number {
  const run   = Math.hypot(MOVES[heading]![0], MOVES[heading]![1]) * CELL
  const grade = Math.abs(land.height[to]! - land.height[from]!) / run
  const cliff = smoothstep(STEEP[0], STEEP[1], land.steep[to]!)

  return run * (1 + (grade / GRADE) ** 2) * (1 + CLIFF * cliff)
}

/**
 * The cheapest walk from one corner to another, as corners in order.
 *
 * Dijkstra over (corner, heading), so a change of heading can be charged for:
 * without that the cheapest way up a steep face is a shiver of tiny zigzags.
 */
function search (land: Survey, start: number, goal: number): number[] {
  const states = land.columns * land.rows * HEADINGS
  const cost   = new Float32Array(states).fill(Infinity)
  const came   = new Int32Array(states).fill(-1)
  const done   = new Uint8Array(states)
  const queue  = new Queue()
  const turns  = Array.from({ length: HEADINGS }, (_, turn) => TURN / 2 * (1 - Math.cos(turn / HEADINGS * Math.PI * 2)))

  for (let heading = 0; heading < HEADINGS; heading += 1) {
    cost[start * HEADINGS + heading] = 0
    queue.push(0, start * HEADINGS + heading)
  }

  while (queue.size > 0) {
    const state  = queue.pop()
    const corner = Math.floor(state / HEADINGS)

    if (corner === goal)
      return trace(came, state)

    if (done[state])
      continue

    done[state] = 1

    for (let heading = 0; heading < HEADINGS; heading += 1) {
      const to = stepFrom(land, corner, heading)

      if (to < 0)
        continue

      const next  = to * HEADINGS + heading
      const total = cost[state]! + stride(land, corner, to, heading) + turns[Math.abs(heading - state % HEADINGS)]!

      if (total < cost[next]!) {
        cost[next] = total
        came[next] = state
        queue.push(total, next)
      }
    }
  }

  return [ start, goal ]
}

/** Follow the search back from where it ended to where it began. */
function trace (came: Int32Array, end: number): number[] {
  const corners: number[] = []

  for (let state = end; state >= 0; state = came[state]!)
    corners.unshift(Math.floor(state / HEADINGS))

  return corners
}

/** Cut every corner of a line, keeping its two ends where they are. */
function soften (line: readonly Waypoint[]): Waypoint[] {
  const cut: Waypoint[] = [ line[0]! ]

  for (let index = 0; index < line.length - 1; index += 1) {
    const from = line[index]!
    const to   = line[index + 1]!

    cut.push(
      { x: from.x * 0.75 + to.x * 0.25, z: from.z * 0.75 + to.z * 0.25 },
      { x: from.x * 0.25 + to.x * 0.75, z: from.z * 0.25 + to.z * 0.75 },
    )
  }

  cut.push(line.at(-1)!)

  return cut
}

function lengthOf (line: readonly Waypoint[]): number {
  let length = 0

  for (let index = 1; index < line.length; index += 1)
    length += Math.hypot(line[index]!.x - line[index - 1]!.x, line[index]!.z - line[index - 1]!.z)

  return length
}

/** The same line as points an even distance apart, as near `SPACING` as divides it whole. */
function respace (line: readonly Waypoint[]): Waypoint[] {
  const length           = lengthOf(line)
  const count            = Math.max(1, Math.round(length / SPACING))
  const even: Waypoint[] = [ line[0]! ]

  let walked = 0
  let index  = 1

  for (let point = 1; point < count; point += 1) {
    const wanted = point / count * length

    for (;;) {
      const span = Math.hypot(line[index]!.x - line[index - 1]!.x, line[index]!.z - line[index - 1]!.z)

      if (walked + span >= wanted || index === line.length - 1) {
        const along = span > 0 ? (wanted - walked) / span : 0

        even.push({
          x: line[index - 1]!.x + (line[index]!.x - line[index - 1]!.x) * along,
          z: line[index - 1]!.z + (line[index]!.z - line[index - 1]!.z) * along,
        })

        break
      }

      walked += span
      index  += 1
    }
  }

  even.push(line.at(-1)!)

  return even
}

/** Distance from a place to the stretch of line between two points. */
export function distanceToSpan (x: number, z: number, from: Waypoint, to: Waypoint): number {
  const dx     = to.x - from.x
  const dz     = to.z - from.z
  const square = dx * dx + dz * dz
  const along  = square > 0 ? Math.min(1, Math.max(0, ((x - from.x) * dx + (z - from.z) * dz) / square)) : 0

  return Math.hypot(x - from.x - dx * along, z - from.z - dz * along)
}

export function createPath (ground: Ground, summit: Waypoint = findSummit(ground)): Path {
  const seaward = [ Math.cos(LANDING_BEARING), Math.sin(LANDING_BEARING) ] as const
  const foot    = descendTo(ground, summit, seaward, BEACH_TOP)
  const shore   = descendTo(ground, summit, seaward, 0)
  const land    = survey(ground, foot, summit)

  const corners = search(land, cornerAt(land, foot), cornerAt(land, summit)).map(corner => ({
    x: land.x + corner % land.columns * CELL,
    z: land.z + Math.floor(corner / land.columns) * CELL,
  }))

  // Up from the water across the sand, then the way that was found, less the
  // last of it, where the cairn stands.
  let line: Waypoint[] = [ shore, ...corners.filter(corner => Math.hypot(corner.x - summit.x, corner.z - summit.z) > STOP_SHORT) ]

  for (let pass = 0; pass < SOFTEN; pass += 1)
    line = soften(line)

  const points  = respace(line)
  const length  = lengthOf(points)
  const spacing = length / (points.length - 1)

  return {
    points,
    length,
    spacing,
    landing: { ...shore, seaward },

    at (distance) {
      const index = Math.min(points.length - 2, Math.max(0, Math.floor(distance / spacing)))
      const from  = points[index]!
      const to    = points[index + 1]!
      const along = Math.min(1, Math.max(0, distance / spacing - index))
      const span  = Math.hypot(to.x - from.x, to.z - from.z) || 1

      return {
        x:     from.x + (to.x - from.x) * along,
        z:     from.z + (to.z - from.z) * along,
        ahead: [ (to.x - from.x) / span, (to.z - from.z) / span ],
      }
    },

    distanceTo (x, z) {
      let nearest = Infinity

      for (let index = 1; index < points.length; index += 1)
        nearest = Math.min(nearest, distanceToSpan(x, z, points[index - 1]!, points[index]!))

      return nearest
    },
  }
}

// perf: cheap — built once with the world: a few thousand ground samples and a
// search of some tens of thousands of states, a few milliseconds. `distanceTo`
// is one pass over a hundred-odd spans; ask it at build time, not per frame.
