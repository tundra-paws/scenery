// src/world/features/infield/rigs.ts
import * as THREE from 'three'
import { positionLocal, varying, vec3 } from 'three/tsl'
import type { SeededRng } from 'threejs-scenes'
import { smoothstep } from 'threejs-scenes/primitives'

import type { Ground } from '../../shared/ground.ts'
import type { HeightGrid } from '../../shared/height-grid.ts'
import type { Infield } from '../../shared/infield.ts'
import type { LitMaterial } from '../../shared/lit.ts'
import { floatAttribute } from '../../shared/nodes.ts'
import { PALETTE } from '../../shared/palette.ts'
import type { Wind } from '../../shared/wind.ts'
import { cropBow, sheen } from './barley.ts'


/** From the middle of one rig to the middle of the next: the bed and its share of the two furrows. */
const PITCH = 1.8

/** Length of a facet along a rig. */
const STEP = 0.4

/** How far a rig stops short of the middle of the wall, and how far its furrows keep from it. */
const HEADLAND = 1
const MARGIN   = 0.55

/** How far from its end a rig takes to rise to its full height. */
const ROUNDING = 0.8

/** How far the rigs lie over the land, so that the furrows' bottoms never sink into it. */
const LIFT = 0.05

/**
 * The cross-section of a rig, from furrow to furrow: where across it, in
 * half-pitches, how high its crop stands there, and whether it is crop or
 * bare earth.
 */
const PROFILE = [
  { across: -1, high: 0, crop: false },
  { across: -0.72, high: 0.2, crop: true },
  { across: -0.42, high: 0.34, crop: true },
  { across: -0.14, high: 0.42, crop: true },
  { across: 0.14, high: 0.42, crop: true },
  { across: 0.42, high: 0.34, crop: true },
  { across: 0.72, high: 0.2, crop: true },
  { across: 1, high: 0, crop: false },
] as const

/**
 * What a run of rigs is sown with: the crop's colour, how much paler and how
 * much duller it is, how much it lifts, how rough it stands, and how much it
 * gives to the wind. Barley sways and pales in a gust; potato haulm is dark
 * and lumpy and barely moves; a rig left in grass is the meadow again, and
 * the rigs under it show. Stubble is barley that has been cut: the same
 * colour bleached, a hand high, and stiff; `carried` is stubble whose stooks
 * have gone to the stacks.
 */
const CROPS = {
  barley:  { colour: PALETTE.barley, light: 0, dull: 0, lift: 1, rough: 0.1, give: 1 },
  stubble: { colour: PALETTE.barley, light: 0.09, dull: 0.14, lift: 0.4, rough: 0.035, give: 0.06 },
  carried: { colour: PALETTE.barley, light: 0.11, dull: 0.2, lift: 0.4, rough: 0.035, give: 0.06 },
  potato:  { colour: PALETTE.grass, light: -0.07, dull: 0, lift: 1.2, rough: 0.16, give: 0.25 },
  lea:     { colour: PALETTE.grass, light: 0.02, dull: 0, lift: 0.55, rough: 0.05, give: 0.45 },
} as const

/** What is sown, plot by plot across the field, and how many rigs a plot is. */
const ROTATION = [ 'barley', 'potato', 'barley', 'barley', 'lea', 'potato' ] as const
const PLOT     = [ 3, 5 ] as const

/**
 * The harvest is most of the way home. A plot of barley is cut from the
 * side the reaper started at: its first rigs, this many, are bare stubble,
 * their sheaves carried to the stacks; its last, this many, still stand;
 * and the rigs between are cut and stand in stooks to dry, so far apart
 * along the rig and no nearer its ends than that.
 */
const CARRIED  = 2
const STANDING = 1
const STOOK    = { every: 2.3, end: 1.1 } as const

/** Module-scope scratch. */
const tint = new THREE.Color()

type Crop = keyof typeof CROPS

/** One rig: where its middle line starts, which way it runs and how far, and what grows on it. */
interface Rig {
  x:      number
  z:      number
  length: number
  crop:   Crop
}

/** The rigs, where the barley on them stands, as x, y, z in turn, and where the stooks stand on the ones that are cut. */
export interface Field {
  mesh:   THREE.Mesh
  ears:   readonly number[]
  stooks: readonly Stook[]
}

/** A stook: where it stands, and the turn that lays its row of sheaves along its rig. */
export interface Stook {
  x:    number
  y:    number
  z:    number
  turn: number
}

/** The buffers being filled. */
interface Plough {
  position: number[]
  colour:   number[]
  give:     number[]
  index:    number[]

  /** Where an ear of barley stands: on the crop of a barley rig, at every vertex of it. */
  ears: number[]

  /** Where a stook stands: down the crown of a cut rig. */
  stooks: Stook[]
}

/** What stands on a rig of barley now: `cut` rigs of its plot come before it, and `left` after. */
function reaped (cut: number, left: number): Crop {
  if (left < STANDING)
    return 'barley'

  return cut < CARRIED ? 'carried' : 'stubble'
}

/** Which way the land falls across the field, on the whole: the way rigs are laid, so they drain. */
function fallOf (ground: Ground, infield: Infield): readonly [number, number] {
  let dx = 0
  let dz = 0

  for (const corner of infield.field) {
    dx += ground.heightAt(corner.x + 1, corner.z) - ground.heightAt(corner.x - 1, corner.z)
    dz += ground.heightAt(corner.x, corner.z + 1) - ground.heightAt(corner.x, corner.z - 1)
  }

  const grade = Math.hypot(dx, dz) || 1

  return [ -dx / grade, -dz / grade ]
}

/** Whether a place on a rig's line has the rig's whole width inside the dyke, clear of its foot. */
function room (infield: Infield, x: number, z: number, across: readonly [number, number]): boolean {
  const half = PITCH / 2

  return infield.inField(x, z) &&
    infield.distanceTo(x, z) > HEADLAND &&
    [ -1, 1 ].every(side => infield.inField(x + across[0] * half * side, z + across[1] * half * side) &&
      infield.distanceTo(x + across[0] * half * side, z + across[1] * half * side) > MARGIN)
}

/** The rigs that fit the field, side by side across the fall, each as long as the dyke lets it be. */
function setOut (infield: Infield, fall: readonly [number, number], across: readonly [number, number], lay: SeededRng): Rig[] {
  type PointType = { x: number, z: number }

  const on    = (point: PointType, axis: readonly [number, number]): number => point.x * axis[0] + point.z * axis[1]
  const sides = infield.field.map(point => on(point, across))
  const ends  = infield.field.map(point => on(point, fall))
  const first = Math.min(...ends)
  const last  = Math.max(...ends)
  const rigs  = [] as Rig[]
  let plot = 0
  let left = lay.int(PLOT[0], PLOT[1])
  let cut  = 0

  for (let side = Math.min(...sides) + PITCH / 2; side < Math.max(...sides); side += PITCH) {
    let best  = { from: 0, to: 0 }
    let start = Number.NaN

    // The longest unbroken stretch of this line with room for the rig.
    for (let along = first; along <= last + 0.25; along += 0.25) {
      const x  = across[0] * side + fall[0] * along
      const z  = across[1] * side + fall[1] * along
      const ok = along <= last && room(infield, x, z, across)

      if (ok && Number.isNaN(start))
        start = along

      if (!ok && !Number.isNaN(start)) {
        if (along - start > best.to - best.from)
          best = { from: start, to: along - 0.25 }

        start = Number.NaN
      }
    }

    if (best.to - best.from < 2)
      continue

    // How far the harvest has got with this rig, if it is barley.
    const seed       = ROTATION[plot % ROTATION.length]!
    const crop: Crop = seed === 'barley' ? reaped(cut, left - 1) : seed

    rigs.push({ x: across[0] * side + fall[0] * best.from, z: across[1] * side + fall[1] * best.from, length: best.to - best.from, crop })

    left -= 1
    cut  += 1

    if (left === 0) {
      plot += 1
      left  = lay.int(PLOT[0], PLOT[1])
      cut   = 0
    }
  }

  return rigs
}

/** Lay one rig's facets into the buffers, draped on the land as it is drawn. */
function plough (out: Plough, grid: HeightGrid, rig: Rig, fall: readonly [number, number], across: readonly [number, number], lay: SeededRng): void {
  const crop  = CROPS[rig.crop]
  const rows  = Math.max(2, Math.ceil(rig.length / STEP))
  const first = out.position.length / 3

  for (let row = 0; row <= rows; row += 1) {
    const along = rig.length * row / rows
    const round = smoothstep(0, ROUNDING, Math.min(along, rig.length - along))

    for (const { across: offset, high, crop: sown } of PROFILE) {
      const x     = rig.x + fall[0] * along + across[0] * offset * PITCH / 2
      const z     = rig.z + fall[1] * along + across[1] * offset * PITCH / 2
      const rough = sown ? lay.range(-crop.rough, crop.rough) : 0

      const y     = grid.heightAt(x, z) + LIFT + (high * crop.lift + rough) * round

      out.position.push(x, y, z)

      if (sown && rig.crop === 'barley' && round > 0.5)
        out.ears.push(x, y - 0.05, z)
      out.give.push(sown ? crop.give * round : 0)

      if (sown)
        tint.set(crop.colour).offsetHSL(0, -crop.dull, crop.light + lay.range(-0.05, 0.05))
      else
        tint.set(PALETTE.path).offsetHSL(0, -0.08, -0.2 + lay.range(-0.02, 0.02))

      out.colour.push(tint.r, tint.g, tint.b)
    }
  }

  // The stooks, down the crown of a rig that is cut.
  if (rig.crop === 'stubble')
    for (let along = STOOK.end + (rig.length - STOOK.end * 2) % STOOK.every / 2; along <= rig.length - STOOK.end; along += STOOK.every) {
      const x = rig.x + fall[0] * along
      const z = rig.z + fall[1] * along

      out.stooks.push({ x, y: grid.heightAt(x, z) + LIFT + PROFILE[3].high * crop.lift, z, turn: Math.atan2(-fall[1], fall[0]) })
    }

  const columns = PROFILE.length

  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns - 1; column += 1) {
      const here  = first + row * columns + column
      const ahead = here + columns

      // Counter-clockwise seen from above, with `across` a quarter turn on from `fall`.
      out.index.push(here, here + 1, ahead, here + 1, ahead + 1, ahead)
    }
}

/**
 * Let the crop on a rig material lean and pale with the wind. `aCrop` is how
 * much each vertex gives: nothing in a furrow, most on the crown of a bed.
 */
function sway (material: LitMaterial, wind: Wind): void {
  const crop  = floatAttribute('aCrop')
  const bowed = crop.mul(cropBow(wind, positionLocal.xz))
  const paled = varying(bowed)

  material.positionNode = positionLocal
    .add(vec3(wind.direction[0], 0, wind.direction[1]).mul(crop)
      .mul(bowed.mul(0.2).add(0.04)))
    .sub(vec3(0, bowed.mul(bowed).mul(0.12), 0))

  material.dye(colour => sheen(colour, paled))
}

/**
 * The field's rigs, as one mesh: lazy beds, the old way of making a field on
 * thin ground, earth heaped into long beds between furrows and laid down the
 * fall of the land so the rain runs off. Sown in plots across the field:
 * barley, potatoes, and one plot left in grass. Most of the barley is cut
 * to stubble (`reaped`), and the rigs still in stooks say where they stand.
 */
export function ploughRigs (material: LitMaterial, lay: SeededRng, ground: Ground, grid: HeightGrid, infield: Infield, wind: Wind): Field {
  const fall   = fallOf(ground, infield)
  const across = [ -fall[1], fall[0] ] as const
  const out    = { position: [], colour: [], give: [], index: [], ears: [], stooks: []}

  for (const rig of setOut(infield, fall, across, lay))
    plough(out, grid, rig, fall, across, lay)

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.position, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(out.colour, 3))
  geometry.setAttribute('aCrop', new THREE.Float32BufferAttribute(out.give, 1))
  geometry.setIndex(out.index)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  sway(material, wind)

  const mesh = new THREE.Mesh(geometry, material)

  mesh.name          = 'infield-rigs'
  mesh.receiveShadow = true

  return { mesh, ears: out.ears, stooks: out.stooks }
}

// perf: cheap — one draw call, no shadow pass of its own. A dozen rigs of
// thirty-odd facets, five quads across: some 3k triangles on every tier.
// The sway is two sines and the gust's three a vertex in the shader, from
// the wind's one uniform; nothing per frame on the CPU.
