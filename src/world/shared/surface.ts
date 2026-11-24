// src/world/shared/surface.ts
import * as THREE from 'three'
import { Fn, abs, clamp, dFdx, dFdy, float, fwidth, length, mix, mx_noise_float, mx_worley_noise_float, normalViewGeometry, positionGeometry, positionView, positionWorld, sin, smoothstep, uniform, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'
import type { QualityTier } from 'threejs-scenes'

import { PALETTE } from './palette.ts'

/** Cycles of a pattern a pixel may span before it starts to fade, and by which it is gone. */
const SHARP = 0.22
const LOST  = 0.6

/**
 * What a texture gives a surface: its colour, from the plain one its material,
 * its vertices and its instances gave it, and its relief, the height of the
 * surface over its facet in world units, which turns the light on it
 * (`relief`) and, where there are vertices to move, moves them.
 */
export interface Surface {
  colour (plain: Node<'vec3'>): Node<'vec3'>
  height: Node<'float'>
}

/**
 * Where a texture is read: a place in the space the pattern lies still in
 * (the world's, for what never moves; the mesh's own, for what walks or
 * sways), how much of that space one pixel covers there, and whether this
 * tier draws the finest of the grain.
 */
export interface Seen {
  at:    Node<'vec3'>
  pixel: Node<'float'>
  fine:  boolean
}

/** A pattern's cycles a unit: one number, or one each way for a grain that runs. */
type Pitch = number | readonly [number, number, number]

/** A palette colour as a node. */
function ink (name: keyof typeof PALETTE): Node<'vec3'> {
  return uniform(new THREE.Color(PALETTE[name])) as unknown as Node<'vec3'>
}

/** The finest of a pitch, and the pitch as a vector. */
function spread (pitch: Pitch): [number, Node<'vec3'>] {
  const [ x, y, z ] = typeof pitch === 'number' ? [ pitch, pitch, pitch ] : pitch

  return [ Math.max(x, y, z), vec3(x, y, z) ]
}

/**
 * How much of a pattern is left at this distance: all of it while one cycle
 * spans a few pixels, none once a pixel spans half of one. Without it a
 * grain finer than the picture turns to sparkle, and its relief to noise.
 */
function kept ({ pixel }: Seen, finest: number): Node<'float'> {
  return smoothstep(SHARP, LOST, pixel.mul(finest)).oneMinus()
}

/** How fast a number changes from one pixel to the next. three's typings give its derivatives to vectors only. */
function change (derive: (value: Node<'vec2'>) => Node<'vec2'>, value: Node<'float'>): Node<'float'> {
  return derive(value as unknown as Node<'vec2'>) as unknown as Node<'float'>
}

/** Where a texture is read from, on this tier. */
export function seenAt (at: Node<'vec3'>, tier: QualityTier): Seen {
  return { at, pixel: length(fwidth(at)), fine: tier !== 'mobile' }
}

/** A texture that lies still in the world: for the land, and what is built or strewn on it and never moves. */
export function inWorld (tier: QualityTier): Seen {
  return seenAt(positionWorld, tier)
}

/**
 * A texture that goes with the thing it is on: read where each vertex was
 * made, before its instance was placed, its mesh turned, or the wind moved
 * it. For what walks, floats or sways.
 */
export function inItself (tier: QualityTier): Seen {
  return seenAt(positionGeometry, tier)
}

/**
 * The one noise every texture here is made of: three's own gradient noise
 * (`mx_noise_float`, what the MaterialX nodes and the tsl-textures library
 * are built on), between about -1 and 1, so many cycles a unit, and faded
 * out where it is too fine to draw.
 */
export function grain (seen: Seen, pitch: Pitch): Node<'float'> {
  const [ finest, cycles ] = spread(pitch)

  return mx_noise_float(seen.at.mul(cycles)).mul(kept(seen, finest))
}

/** The same, for the finest of a surface: nothing at all on a phone. */
export function grit (seen: Seen, pitch: Pitch): Node<'float'> {
  return seen.fine ? grain(seen, pitch) : float(0)
}

/** A thin wandering line, 1 on it: where a noise crosses nothing. A crack, a seam, a vein. */
export function vein (seen: Seen, pitch: Pitch, width: number): Node<'float'> {
  const [ finest, cycles ] = spread(pitch)

  return smoothstep(0, width, abs(mx_noise_float(seen.at.mul(cycles)))).oneMinus()
    .mul(kept(seen, finest * 2))
}

/** Cells: 0 at the middle of each, toward 1 at its edge, flat across the ground (the x and z of the place). Pebbles, clumps. */
export function cells (seen: Seen, pitch: number): Node<'float'> {
  return mix(0.45, mx_worley_noise_float(seen.at.xz.mul(pitch)), kept(seen, pitch * 1.5))
}

/**
 * The normal of a surface with a relief on it, for a material's `normalNode`.
 *
 * Mikkelsen's bump mapping of an unparametrised surface, as three's own
 * `bumpMap` does it, but from a height that is worked out (three's wants a
 * texture to look up) and with nothing normalised: the height is in world
 * units, so a bump is as steep as it says and no steeper from far off.
 * Under flat shading the facet's own normal is what is turned.
 */
export function relief (height: Node<'float'>): Node<'vec3'> {
  return Fn(() => {
    const across = positionView.dFdx()
    const down   = positionView.dFdy()
    const normal = normalViewGeometry
    const r1     = down.cross(normal)
    const r2     = normal.cross(across)
    const det    = across.dot(r1)
    const grade  = det.sign().mul(change(dFdx, height).mul(r1)
      .add(change(dFdy, height).mul(r2)))

    return det.abs().mul(normal)
      .sub(grade)
      .normalize()
  })()
}

/** A colour with a pattern laid on it as light and dark: `amount` of its own brightness either way. */
function toned (colour: Node<'vec3'>, pattern: Node<'float'>, amount: number): Node<'vec3'> {
  return colour.mul(pattern.mul(amount).add(1))
}

/**
 * Stone: boulders, everything stacked or walled from them, the reef.
 *
 * Blotched in patches a stride across, mottled within them, gritty close
 * to; paler where lichen has crusted it, and cracked, the cracks dark and
 * cut in. Its own grey comes from the material and the instance.
 */
export function stone (seen: Seen): Surface {
  const blotch = grain(seen, 0.7)
  const mottle = grain(seen, 2.3)
  const fine   = grit(seen, 8.5)
  const crack  = vein(seen, 1.15, 0.045)
  const lichen = smoothstep(0.22, 0.42, mottle.add(blotch.mul(0.5)))

  return {
    colour: plain => toned(plain, blotch.mul(0.5).add(mottle.mul(0.3))
      .add(fine.mul(0.3)), 0.34)
      .mul(lichen.mul(0.22).add(1))
      .mul(crack.mul(-0.5).add(1)),
    height: blotch.mul(0.07).add(mottle.mul(0.035))
      .add(fine.mul(0.006))
      .add(lichen.mul(0.012))
      .sub(crack.mul(0.04)),
  }
}

/**
 * Turf, wherever it is not the land itself: the sods of the shelter's roof.
 * Tussocks a pace across, yellowed on their crowns, the blades' own streaks
 * within them. What is dark under it (the earth of a cut edge) stays dark.
 */
export function turf (seen: Seen): Surface {
  const tussock = grain(seen, 1.3)
  const blade   = grain(seen, [ 6.5, 2.2, 6.5 ])
  const fine    = grit(seen, 13)

  return {
    colour: plain => toned(plain.mul(mix(vec3(1, 1, 1), vec3(1.3, 1.12, 0.72), clamp(tussock.mul(1.2).add(0.3), 0, 1))), blade.mul(0.6).add(fine.mul(0.4)), 0.45),
    height: tussock.mul(0.1).add(blade.mul(0.03))
      .add(fine.mul(0.006)),
  }
}

/** Turned earth and what is sown in it: the rigs. Clods a hand across, crumbs between them. */
export function tilth (seen: Seen): Surface {
  const clod  = grain(seen, 2.4)
  const crumb = grit(seen, 8)

  return {
    colour: plain => toned(plain, clod.mul(0.65).add(crumb.mul(0.35)), 0.4),
    height: clod.mul(0.05).add(crumb.mul(0.012)),
  }
}

/**
 * A far coast: beds of rock a house thick, tilted nowhere, and screes and
 * gullies down them. Everything here is tens of units across, because it is
 * never seen from nearer than a few hundred.
 */
export function fell (seen: Seen): Surface {
  const beds  = grain(seen, [ 0.012, 0.085, 0.012 ])
  const gully = grain(seen, [ 0.05, 0.008, 0.05 ])

  return {
    colour: plain => toned(plain, beds.mul(0.6).add(gully.mul(0.4)), 0.42),
    height: beds.mul(2.4).add(gully.mul(1.6)),
  }
}

/**
 * Worked wood: the boat, its mast and oars, the gate. A grain that runs
 * along `run` (a unit direction in the space the texture is read in), dark
 * lines between its years, a knot here and there.
 */
export function timber (seen: Seen, run: readonly [number, number, number] = [ 1, 0, 0 ]): Surface {
  const [ x, y, z ] = run
  const pitch       = [ 9 - 8.3 * Math.abs(x), 9 - 8.3 * Math.abs(y), 9 - 8.3 * Math.abs(z) ] as const
  const years       = grain(seen, pitch)
  const board       = grain(seen, 0.9)
  const line        = vein(seen, [ pitch[0] * 0.6, pitch[1] * 0.6, pitch[2] * 0.6 ], 0.09)

  return {
    colour: plain => toned(plain, years.mul(0.55).add(board.mul(0.45)), 0.3).mul(line.mul(-0.32).add(1)),
    height: years.mul(0.012).sub(line.mul(0.012)),
  }
}

/**
 * Fleece: what a sheep wears. Read in the animal's own space, so it goes
 * where the animal goes. Locks and curls, never smooth.
 */
export function wool (seen: Seen): Surface {
  const lock = grain(seen, 4.5)
  const curl = grit(seen, 12)

  return {
    colour: plain => toned(plain, lock.mul(0.65).add(curl.mul(0.35)), 0.34),
    height: lock.mul(0.035).add(curl.mul(0.012)),
  }
}

/** A seal's hide, in its own space: sleek, dappled with darker spots along its back. */
export function hide (seen: Seen): Surface {
  const dapple = smoothstep(0.12, 0.3, grain(seen, 3.4))
  const sheen  = grain(seen, 1.1)

  return {
    colour: plain => toned(plain, sheen, 0.14).mul(dapple.mul(-0.3).add(1)),
    height: sheen.mul(0.012),
  }
}

/**
 * A birch, all of it, in the wood's one material: `leafy` says which of a
 * vertex is leaf (1) and which bark or cut wood (0).
 *
 * The bark is the birch's own: pale, banded round the trunk with dark
 * dashes, darker and rougher toward the foot (`foot`, 1 at the ground). The
 * leaves are a crown of them: dabs of the meadow's two greens, light on top
 * of each dab and dark between.
 */
export function birch (seen: Seen, leafy: Node<'float'>, foot: Node<'float'>): Surface {
  const dash    = smoothstep(0.3, 0.42, grain(seen, [ 1.6, 9, 1.6 ]).add(foot.mul(0.25)))
  const peel    = grain(seen, [ 3, 1.1, 3 ])
  const dab     = grain(seen, 2.6)
  const leaf    = grit(seen, 7.5)
  const scarred = ink('face')
  const sunlit  = ink('grassDry')

  return {
    colour: plain => mix(
      toned(mix(plain, scarred, dash.mul(0.82)), peel, 0.1),
      toned(mix(plain, sunlit, clamp(dab.mul(1.4), 0, 1).mul(0.5)), dab.mul(0.6).add(leaf.mul(0.4)), 0.34),
      leafy,
    ),
    height: mix(dash.mul(-0.012).add(peel.mul(0.008)), dab.mul(0.07).add(leaf.mul(0.02)), leafy),
  }
}

/** Sand's ripples: lines a hand apart, square to the wind, wandering as `wander` says. For the land. */
export function ripples (seen: Seen, lee: readonly [number, number], wander: Node<'float'>): Node<'float'> {
  const along = seen.at.x.mul(lee[0]).add(seen.at.z.mul(lee[1]))

  return sin(along.mul(11).add(wander.mul(5))).mul(kept(seen, 3.5))
}

// perf: each `grain` is one gradient noise a fragment (eight hashed corners),
// each `cells` a nine-cell search. A surface is three to five of them, one
// fewer on a phone; `relief` adds two screen derivatives of their sum and no
// lookup. No texture is stored: nothing to download, nothing to tile.
