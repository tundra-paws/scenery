// src/world/features/aurora/index.ts
import * as THREE from 'three'
import { cameraProjectionMatrix, cameraViewMatrix, cos, exp, max, mix, pow, sin, smoothstep, uniform, varying, vec3, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'
import type { Node } from 'three/webgpu'
import type { QualityTier } from 'threejs-scenes'

import { cirrusCover } from '../../shared/cirrus.ts'
import { heldFloat, vec3Attribute } from '../../shared/nodes.ts'
import { printed } from '../../shared/output.ts'
import { PALETTE } from '../../shared/palette.ts'
import { STEP } from '../../world.ts'
import type { Feature, World } from '../../world.ts'
import { NIGHT_THINS } from '../environment/sky.ts'

/** How far off it is drawn: outside the land beyond and the clouds, inside the stars. */
const RADIUS = 1800

/**
 * Where in the sky it hangs: the bearings it runs between (north is 8,
 * `shared/daylight.ts`), the height of its foot over the horizon, and how
 * tall it stands, in degrees.
 */
const FROM = -58
const TO   = 74
const FOOT = 7
const TALL = 26

/** Columns along it, by tier: its folds are drawn in these. */
const COLUMNS: Record<QualityTier, number> = { mobile: 72, desktop: 140, highEnd: 180 }

/**
 * How it folds: the foot rises and falls along the arc in two waves that
 * travel slowly opposite ways, and the curtain is taller in some places
 * than in others. Heights in degrees, waves a radian of bearing, speeds a
 * second.
 */
const FOLDS   = [{ height: 3.2, waves: 3.1, speed: 0.045 }, { height: 1.6, waves: 7.3, speed: -0.07 }] as const
const STRETCH = { share: 0.32, waves: 4.4, speed: 0.03 } as const

/** Rays: how many to the whole arc, how they wander, and how fast they drift along it. */
const RAYS   = 210
const WANDER = 3.4
const DRIFT  = 0.28

/**
 * How bright it burns at its brightest, and how long it takes to flare and
 * fade again: the dancers come and go through the night. The night must be
 * this far on before it shows at all.
 */
const BRIGHT = 0.42
const SURGE  = 83
const DARK   = [ 0.35, 0.95 ] as const

/** The pale green the oxygen burns at the curtain's foot, and the faint rose high over it. */
const GREEN = new THREE.Color(PALETTE.aurora)
const ROSE  = new THREE.Color(PALETTE.pennant).lerp(new THREE.Color(PALETTE.aurora), 0.3)

/** A number the feature keeps and the material reads. */
interface Held {
  value: number
}

/** Its curtain as a strip of columns: a place along the arc (0 to 1), foot (0) or head (1), and the bearing in radians. */
function createCurtain (columns: number): THREE.BufferGeometry {
  const curtain  = [] as number[]
  const index    = [] as number[]
  const geometry = new THREE.BufferGeometry()

  for (let column = 0; column <= columns; column += 1) {
    const along   = column / columns
    const bearing = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(FROM, TO, along))

    curtain.push(along, 0, bearing, along, 1, bearing)

    if (column < columns) {
      const at = column * 2

      index.push(at, at + 2, at + 1, at + 1, at + 2, at + 3)
    }
  }

  // The position is only there for three's bookkeeping: the vertex node puts every corner where it is.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(curtain.length), 3))
  geometry.setAttribute('aCurtain', new THREE.Float32BufferAttribute(curtain, 3))
  geometry.setIndex(index)

  return geometry
}

/** Degrees as the radians a node works in. */
function radians (degrees: number): number {
  return THREE.MathUtils.degToRad(degrees)
}

/** The curtain's light and where its corners are, as one node material, and the uniforms its feature keeps. */
function createMaterial (world: World, time: Held, strength: Held): NodeMaterial {
  const material = new NodeMaterial()
  const curtain  = vec3Attribute('aCurtain')
  const now      = heldFloat(time)
  const bearing  = curtain.z

  // Its foot rises and falls in two travelling waves, and its head with it.
  const [ slow, quick ] = FOLDS
  const foot            = sin(bearing.mul(slow.waves).add(now.mul(slow.speed))).mul(radians(slow.height))
    .add(sin(bearing.mul(quick.waves).add(now.mul(quick.speed))).mul(radians(quick.height)))
    .add(radians(FOOT))
  const tall      = sin(bearing.mul(STRETCH.waves).add(now.mul(STRETCH.speed))).mul(STRETCH.share)
    .add(1)
    .mul(radians(TALL))
  const elevation = foot.add(curtain.y.mul(tall))
  const direction = vec3(sin(bearing).mul(cos(elevation)), sin(elevation), cos(bearing).mul(cos(elevation))
    .negate())

  // Round the camera, like the stars: walking never brings it nearer.
  material.vertexNode = cameraProjectionMatrix.mul(vec4(cameraViewMatrix.mul(vec4(direction.mul(RADIUS), 0)).xyz, 1))

  // Brightest just over its sharp foot and fading up the curtain; combed
  // into rays that drift along it; flaring in slow surges that travel; and
  // thinning out at both ends. The high cloud dims it as it does the stars.
  const along  = curtain.x
  const height = curtain.y
  const edge   = smoothstep(0, 0.07, height).mul(exp(height.mul(-2.3)))
    .mul(smoothstep(1, 0.6, height))
  const comb   = sin(along.mul(RAYS).add(sin(along.mul(17).add(now.mul(0.13))).mul(WANDER))
    .add(now.mul(DRIFT))).mul(0.5)
    .add(0.5)
  const rays   = pow(comb, 2.2).mul(0.62)
    .add(0.38)
  const surge  = sin(along.mul(6.1).sub(now.mul(0.09))).mul(0.4)
    .add(0.6)
  const ends   = smoothstep(0, 0.16, along).mul(smoothstep(1, 0.82, along))
  const veiled = max(cirrusCover(varying(direction), world.wind.nodes.aloft).mul(-1.4 * (1 - NIGHT_THINS))
    .add(1), 0)
  const light  = edge.mul(rays).mul(surge)
    .mul(ends)
    .mul(veiled)
    .mul(heldFloat(strength))
  const colour = mix(uniform(GREEN) as unknown as Node<'vec3'>, uniform(ROSE) as unknown as Node<'vec3'>, smoothstep(0.25, 0.95, height))

  material.name         = 'aurora'
  material.fragmentNode = vec4(printed(colour.mul(light)), 1)
  material.transparent  = true
  material.depthWrite   = false
  material.blending     = THREE.AdditiveBlending
  material.side         = THREE.DoubleSide
  material.fog          = false

  return material
}

/** How bright the dancers are at `time` with the night `night` far on: nothing by day, and coming and going through the dark. */
export function auroraStrength (time: number, night: number): number {
  const dark  = THREE.MathUtils.smoothstep(night, DARK[0], DARK[1])
  const surge = 0.62 + 0.38 * Math.sin(time / SURGE * Math.PI * 2 + 1.1)

  return BRIGHT * dark * surge
}

/**
 * The merry dancers: on a clear night at the back end of the year the
 * aurora hangs low in the north, over the holm and the end of the mountain
 * coast. A pale green curtain with a sharp foot, combed into rays that
 * drift along it, folding slowly as its foot rises and falls, faint rose
 * high over it; it flares and fades through the night and is gone before
 * the first light. The sea gives it back. Nobody made it: it is the one
 * light at night that is nobody's.
 */
export function createAurora (world: World): Feature {
  let mesh: THREE.Mesh | null       = null
  let material: NodeMaterial | null = null
  const time     = { value: 0 }
  const strength = { value: 0 }

  const burn = (now: number): void => {
    time.value     = now
    strength.value = auroraStrength(now, world.day.night)

    if (mesh)
      mesh.visible = strength.value > 0.002
  }

  return {
    name: 'aurora',

    build ({ scene }) {
      material = createMaterial(world, time, strength)

      mesh               = new THREE.Mesh(createCurtain(COLUMNS[world.quality.tier]), material)
      mesh.name          = 'aurora'
      mesh.frustumCulled = false

      // With the stars, before the sea: the sea then hides what is under the horizon.
      mesh.renderOrder = -1

      burn(0)
      scene.add(mesh)
    },

    update (_state, frame) {
      burn(frame.frame * STEP)
    },

    dispose () {
      mesh?.geometry.dispose()
      material?.dispose()
      mesh?.removeFromParent()
      mesh     = null
      material = null
    },
  }
}

// perf: cheap — by day nothing is drawn. At night one draw call (and one in
// the sea's mirror) of 280 triangles on desktop, 144 on a phone, additive
// and thin on the screen: a few sines and an exponential a fragment, and the
// high cloud's cover. A step sets two numbers.
