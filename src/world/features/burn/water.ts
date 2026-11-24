// src/world/features/burn/water.ts
import * as THREE from 'three'
import { abs, cameraPosition, clamp, dot, fwidth, max, mix, mx_noise_float, normalWorldGeometry, normalize, positionWorld, pow, reflect, smoothstep, uniform, vec2, vec3, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'
import type { Node } from 'three/webgpu'

import type { Burn } from '../../shared/burn.ts'
import type { CloudShadow } from '../../shared/cloud-shadow.ts'
import type { Daylight } from '../../shared/daylight.ts'
import type { HeightGrid } from '../../shared/height-grid.ts'
import { heldFloat, vec4Attribute } from '../../shared/nodes.ts'
import type { Held } from '../../shared/nodes.ts'
import { developed, hazed } from '../../shared/output.ts'
import { PALETTE } from '../../shared/palette.ts'

/** Where the water's cross-section has its vertices, from one bank (-1) to the other (1). */
const ACROSS = [ -1, -0.55, 0, 0.55, 1 ] as const

/** How far the water lies over the land it runs on. */
const LIFT = 0.09

/** The basin at the spring: how wide its water is, and how far down the burn it narrows to the burn's own width. */
const BASIN      = 0.95
const BASIN_LONG = 1.5

/** How much of the sky the water gives back looked straight down on, and how much its own colour is darker than the sea's. */
const GLASS = 0.3
const PEAT  = 0.5

/** The fall from which the water starts to break white, and by which it is all white. */
const WHITE = [ 0.66, 1.1 ] as const

/** Depth under the sea's level by which the burn is lost in it, and height over it from which it is all there. */
const DROWNS = [ -0.32, 0.1 ] as const

/** What the burn's water is made from: the air over it and its own clock. */
interface StreamOptions {
  clouds: CloudShadow
  day:    Daylight

  /** World height of the sea. */
  level: number

  /** The world's time, set each step. */
  time: Held<number>
}

/**
 * The burn's water as one strip of mesh along its course, five vertices
 * across at every reach.
 *
 * It lies on the land as the land is drawn (`grid`), and level across where
 * its banks stand higher than its middle, so in the gully its edge is where
 * the turf comes up through it. Every vertex says where it is on the burn
 * (`aBurn`): the seconds the water takes to reach it from the spring, how
 * far across it is, how fast the land falls there, and how far down it is.
 */
export function createStreamGeometry (burn: Burn, grid: HeightGrid): THREE.BufferGeometry {
  const position: number[] = []
  const said: number[]     = []
  const index: number[]    = []

  burn.reaches.forEach((reach, row) => {
    const half   = Math.max(reach.half, BASIN * (1 - reach.along / BASIN_LONG))
    const middle = grid.heightAt(reach.x, reach.z)

    for (const across of ACROSS) {
      const x = reach.x - reach.ahead[1] * across * half
      const z = reach.z + reach.ahead[0] * across * half

      position.push(x, Math.min(middle, grid.heightAt(x, z)) + LIFT, z)
      said.push(reach.since, across, reach.fall, reach.along)
    }

    if (row === 0)
      return

    for (let column = 0; column < ACROSS.length - 1; column += 1) {
      const here = row * ACROSS.length + column
      const back = here - ACROSS.length

      // Counter-clockwise seen from above.
      index.push(back, back + 1, here, back + 1, here + 1, here)
    }
  })

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('aBurn', new THREE.Float32BufferAttribute(said, 4))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

/**
 * Running water, as one node material.
 *
 * Fresh water has no depth to speak of, so unlike the sea it is all
 * surface: it gives back the sky it lies under, the hour's own colours and
 * the glow on the sun's side, over a dark peaty brown; its ripples are two
 * noises that go down with the water, at the water's own pace, faster and
 * rougher where the land falls; and where it falls hard it breaks white, in
 * streaks that run with it. The clouds shade it and the haze takes it like
 * everything else. It thins out at its banks, and is lost in the sea at its
 * mouth.
 */
export function createStreamMaterial ({ clouds, day, level, time }: StreamOptions): NodeMaterial {
  const { nodes } = day
  const said      = vec4Attribute('aBurn')
  const across    = said.y
  const fall      = said.z
  const peat      = uniform(new THREE.Color(PALETTE.waterDeep).multiplyScalar(PEAT)) as unknown as Node<'vec3'>
  const white     = uniform(new THREE.Color(PALETTE.foam)) as unknown as Node<'vec3'>

  // A pattern of `run` stays with the water: it is where the water that is
  // here now was, so many seconds ago.
  const run  = said.x.sub(heldFloat(time))
  const side = abs(across)

  // Ripples finer than the picture are only sparkle: they even out with distance.
  const sharp = smoothstep(0.08, 0.3, fwidth(across).mul(4)).oneMinus()
  const chop  = mx_noise_float(vec2(across.mul(2.1), run.mul(1.5)))
  const rill  = mx_noise_float(vec2(across.mul(4.6).add(9.1), run.mul(3.8))).mul(sharp)

  const rough  = fall.mul(0.5).add(0.1)
  const normal = normalize(normalWorldGeometry.add(vec3(chop, 0, rill).mul(rough)))
  const view   = normalize(cameraPosition.sub(positionWorld))

  // The sky in the water: the dome's own colours, in the direction the
  // surface throws the eye, and the glow low on the sun's side.
  const thrown = reflect(view.negate(), normal)
  const sky    = mix(nodes.horizon, nodes.zenith, pow(clamp(thrown.y, 0, 1), 0.6)).add(nodes.skyGlow(thrown))
  const facing = max(dot(normal, view), 0)
  const given  = pow(facing.oneMinus(), 3).mul(1 - GLASS)
    .add(GLASS)

  const light   = clouds.light(positionWorld)
  const halfway = normalize(nodes.lightDirection.add(view))
  const glint   = nodes.seaGlint.mul(pow(max(dot(normal, halfway), 0), 90)).mul(0.8)
    .mul(light)
  const water   = mix(peat.mul(nodes.seaTint).mul(mix(0.5, 1, light)), sky, given).add(glint)

  // White water: all of it where the land falls hard, streaks of it where
  // it falls less, and a line of it along each bank wherever it runs fast.
  const broken = smoothstep(WHITE[0], WHITE[1], fall.add(rill.mul(0.3)).add(chop.mul(0.22)))
  const lapped = smoothstep(0.62, 1, side).mul(smoothstep(0.3, 0.7, fall))
    .mul(0.55)
  const foam   = clamp(max(broken, lapped), 0, 1)

  const edge  = smoothstep(0.8, 1, side).oneMinus()
  const sea   = smoothstep(level + DROWNS[0], level + DROWNS[1], positionWorld.y)
  const shown = hazed(developed(mix(water, white.mul(nodes.seaTint).mul(mix(0.6, 1, light)), foam)), nodes.horizon)

  const material = new NodeMaterial()

  material.name                = 'burn'
  material.fragmentNode        = vec4(shown, edge.mul(sea))
  material.transparent         = true
  material.depthWrite          = false
  material.fog                 = false
  material.polygonOffset       = true
  material.polygonOffsetFactor = -1
  material.polygonOffsetUnits  = -2

  return material
}

// perf: cheap — one draw call, no shadow pass: sixty reaches of four quads,
// under 500 triangles on every tier. Two noises and three powers a fragment,
// on a strip a few pixels wide from most of the island. A step sets its clock.
