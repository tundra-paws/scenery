// src/world/features/water/shader.ts
import * as THREE from 'three'
import { Fn, If, abs, cameraPosition, clamp, distance, dot, float, fract, fwidth, length, max, min, mix, normalize, positionWorld, pow, select, sin, smoothstep, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl'
import { NodeMaterial } from 'three/webgpu'
import type { Node } from 'three/webgpu'

import type { CloudShadow } from '../../shared/cloud-shadow.ts'
import type { Daylight } from '../../shared/daylight.ts'
import { DEEP_WATER } from '../../shared/ground.ts'
import type { HeightMap } from '../../shared/height-map.ts'
import { heldFloat, heldVec2, heldVec4 } from '../../shared/nodes.ts'
import type { Held } from '../../shared/nodes.ts'
import { developed, hazed } from '../../shared/output.ts'
import { PALETTE } from '../../shared/palette.ts'
import { swellNode } from '../../shared/swell.ts'
import type { Wash } from '../../shared/wash.ts'
import type { Wind } from '../../shared/wind.ts'
import type { Mirror } from './mirror.ts'
import type { WashMap } from './wash.ts'

/** Depth of water, in world units, over which the sea thins out to nothing on the sand. */
const SHALLOWS = 0.9

/** Depth down to which the sea keeps all of its pale colour, and the depth from which it is its darkest and hides whatever is under it. */
const PALE = 0.3
const DEEP = DEEP_WATER

/** How much of what is under the shallows shows when looking straight down. */
const CLEAR = 0.18

/** How much of the world the surface gives back at most, how far its ripples shake the picture in it, and how much less a gust leaves of it. */
const MIRROR = 1
const WOBBLE = 0.25
const BREAK  = 0.3

/** Depth the foam on the waterline reaches out to when the swell is level. */
const RIM = 0.18

/**
 * The surf behind the rim, where the swell stands up and breaks: its lines
 * per unit of depth, how fast they run in (one every few seconds, and one
 * breaking at the tenth second, when the postcards are taken), the depth
 * they first break at, and how much of the foam a broken line leaves behind.
 */
const SURF_DENSITY = 5.5
const SURF_SPEED   = 2.4
const SURF_START   = 1.8
const SURF_TRAIL   = 0.45

/**
 * Round what stands in the sea: how far its foam reaches, and the rings
 * that run out from it, their lines per unit and how far they carry.
 */
const LAP        = 0.45
const HULL_LAP   = 0.22
const RING       = 3.2
const RING_SPEED = 1.5
const RING_REACH = 2.4

/**
 * How far upwind to feel for the bottom, to tell a shore the wind blows onto
 * from one it blows off, and the drop in depth over that reach that makes a
 * shore fully one or the other.
 */
const FETCH  = 3
const SHELVE = 0.35

/** How much darker a gust ruffles the water, and how much of its light the sea loses under a cloud. */
const RUFFLE = 0.13
const GLOOM  = 0.5

/** The boat on the water: how much of the sea's own colour its shadow takes, and how long the calm it leaves in its lee is. */
const SHADE = 0.45

/**
 * The road a lamp lays on the water: how bright it is at the lamp's full
 * light, how far from under the lamp it has gone to half, and how wide the
 * column is under the lamp and how much wider for each unit nearer.
 */
const LAMP_GAIN   = 1.5
const LAMP_HALF   = 26
const LAMP_WIDE   = float(0.45)
const LAMP_SPREAD = 0.05

/** How finely the ripples break the road across, in radians of their pattern a unit along it. */
const LAMP_DASH = 4.6
const LEE       = 16

/** What the sea is made from: the air over it, what stands in it, the land under it, and its own mirror and clock. */
export interface SeaOptions {
  wind:   Wind
  clouds: CloudShadow
  day:    Daylight
  wash:   Wash

  /** The land's height over the water, on the terrain's own grid. */
  ground: HeightMap

  /** How far each point of the sea is from the nearest thing standing in it. */
  standing: WashMap
  mirror:   Mirror

  /** The world's time, set each step. */
  time: Held<number>
}

/** What the foam is worked out from: the place, the water over the land there and how fast that changes a pixel, the place in the boat's frame, the gust, the swell's height and the ripples' sum. */
interface Sea {
  at:    Node<'vec2'>
  depth: Node<'float'>
  pixel: Node<'float'>
  local: Node<'vec2'>
  gust:  Node<'float'>
  swell: Node<'float'>
  chop:  Node<'float'>
}

/** A reversed `smoothstep`: 1 under `from`, 0 over `to`. */
function fade (from: number | Node<'float'>, to: number | Node<'float'>, value: Node<'float'>): Node<'float'> {
  return smoothstep(from, to, value).oneMinus()
}

/**
 * The sea's surface, as one node material: its colour by depth, the ripples
 * and the swell that tilt it, the world it gives back, the foam on every
 * shore and round everything that stands in it, and the haze far out.
 */
export function createSeaMaterial ({ wind, clouds, day, wash, ground, standing, mirror, time }: SeaOptions): NodeMaterial {
  const [ windX, windZ ] = wind.direction
  const lee              = vec2(windX, windZ)
  const now              = heldFloat(time)
  const boat             = heldVec4(wash.uniforms.uBoat)
  const hullSize         = heldVec2(wash.uniforms.uBoatHull)
  const boatShade        = heldVec2(wash.uniforms.uBoatShade)
  const lamp             = heldVec4(wash.uniforms.uLamp)
  const amber            = uniform(new THREE.Color(PALETTE.lamp)) as unknown as Node<'vec3'>
  const deep             = uniform(new THREE.Color(PALETTE.waterDeep)) as unknown as Node<'vec3'>
  const shallow          = uniform(new THREE.Color(PALETTE.waterShallow)) as unknown as Node<'vec3'>
  const white            = uniform(new THREE.Color(PALETTE.foam)) as unknown as Node<'vec3'>
  const mirrorAt         = varying(uniform(mirror.matrix).mul(vec4(positionWorld, 1)))
  const { nodes }        = day

  /** How deep the water is at a place: the map is on the terrain's own grid, so zero is where the mesh breaks the surface. */
  const depthAt = (place: Node<'vec2'>): Node<'float'> => texture(ground.texture, place.mul(ground.scale).add(0.5), float(0)).r.negate()

  /** How far a place is from the nearest thing standing in the water (`wash.ts`). */
  const standAt = (place: Node<'vec2'>): Node<'float'> => texture(standing.texture, place.mul(standing.scale).add(0.5), float(0)).r

  /** Distance from the boat's waterline, in world units, negative inside it, with the point in the boat's own frame (x to the bow). */
  const hullDistance = (local: Node<'vec2'>): Node<'float'> => {
    const q = local.div(hullSize)
    const e = length(q)

    return e.sub(1).mul(e)
      .div(max(length(q.div(hullSize)), 1e-3))
  }

  /** A step along the ground, as the boat's own frame sees it. */
  const inBoat = (step: Node<'vec2'>): Node<'vec2'> => vec2(dot(step, boat.zw), dot(step, vec2(boat.w.negate(), boat.z)))

  /**
   * The white on the sea at a place: along every shore, in the surf behind
   * it, and round whatever stands in the water. Called from inside the
   * surface's own function, where its branches belong.
   */
  const foamOn = ({ at, depth, pixel, local, gust, swell, chop }: Sea): Node<'float'> => {
    // Which shore this is. Where the bottom is deeper upwind, the wind is
    // bringing the sea in; where it is shallower, the land is in the way and
    // the water lies in its lee. Looked up only near the land.
    const upwind = depth.toVar()

    If(depth.lessThan(SURF_START * 1.5), () => {
      upwind.assign(depthAt(at.sub(lee.mul(FETCH))))
    })

    const windward = clamp(upwind.sub(depth).div(SHELVE)
      .mul(0.5)
      .add(0.5), 0, 1)

    // Foam where it runs out, reaching further and whiter where the swell is
    // up or a gust is behind it, further still on the windward shore, and all
    // but gone in the lee. Never thinner than a pixel or so, so from a distance
    // the island still has a drawn shoreline all the way round.
    const rise  = chop.mul(0.25)
      .add(gust.sub(0.5).mul(0.5))
      .add(swell.mul(4))
    const reach = rise.mul(0.6).add(1)
      .mul(RIM)
      .mul(mix(0.6, 1.5, windward))
      .add(pixel.mul(1.5))
    const rim   = fade(reach.mul(0.5), reach, depth).mul(clamp(rise.mul(0.5).add(0.65), 0, 1))

    // The surf: the swell stands up over the shelf and breaks, a line of
    // white with a sharp shoreward edge that runs in over the shallows and
    // leaves its foam spread behind it, two or three at a time on the shore
    // the wind blows onto and one, thin, in the lee. Where a pixel spans more
    // than the gap between two lines there is nothing to draw but moire, so
    // it fades out with distance.
    const surge   = fract(depth.mul(SURF_DENSITY).add(now.mul(SURF_SPEED))
      .add(swell.mul(6))
      .add(rise)
      .div(6.2832))
    const breaker = smoothstep(0, 0.04, surge).mul(fade(0.04, SURF_TRAIL, surge))
    const surf    = breaker
      .mul(smoothstep(SURF_START, SURF_START * 0.45, depth))
      .mul(smoothstep(RIM * 0.5, RIM * 2, depth))
      .mul(fade(0.4, 1.6, pixel.mul(SURF_DENSITY)))

    const foam = max(rim, surf.mul(mix(0.3, 0.9, windward))).toVar()

    // What stands in the sea breaks it: a stone, the dyke's foot, the boat.
    // The map holds how far each point is from the nearest thing standing in
    // the water; the boat is worked out here, since it moves. Foam laps the
    // side the sea comes from, and rings run out from them all. The side the
    // sea comes onto is the side where a step upwind leads away from the
    // thing: the boat's own frame turns the wind with it.
    const washed = texture(standing.texture, at.mul(standing.scale).add(0.5)).r
    const hull   = hullDistance(local)
    const stand  = min(washed, hull)
    const edge   = fwidth(stand)

    If(stand.lessThan(RING_REACH), () => {
      const drift   = lee.mul(0.6)
      const further = min(standAt(at.sub(drift)), hullDistance(local.sub(inBoat(drift))))
      const onto    = clamp(further.sub(stand).mul(1.2)
        .add(0.5), 0, 1)
      const lap     = select(hull.lessThan(washed), float(HULL_LAP), float(LAP)).mul(rise.mul(0.7).add(1))
        .mul(mix(0.5, 1.4, onto))
        .add(edge.mul(1.5))
      const ring    = smoothstep(0.88, 1, sin(stand.mul(RING).sub(now.mul(RING_SPEED))
        .add(rise)))
        .mul(fade(lap, RING_REACH, stand))
        .mul(fade(0.4, 1.4, edge.mul(RING)))

      foam.assign(max(foam, max(fade(lap.mul(0.35), lap, stand).mul(clamp(rise.mul(0.5).add(0.7), 0, 1)), ring.mul(mix(0.08, 0.35, onto)))))
    })

    return foam
  }

  /**
   * A lamp that is lit over the water lays its own road on it, from under
   * the lamp toward whoever looks: a narrow column, wider as it comes
   * nearer, that the ripples break into pieces across it. `chop` is the
   * ripples' own pattern, so the pieces move with them.
   */
  const roadOn = (chop: Node<'float'>): Node<'vec3'> => {
    const lampWay = lamp.xz.sub(cameraPosition.xz)
    const lampFar = length(lampWay)
    const offset  = positionWorld.xz.sub(cameraPosition.xz)
    const outward = offset.dot(lampWay).div(lampFar)
    const abeam   = abs(offset.x.mul(lampWay.y).sub(offset.y.mul(lampWay.x))
      .div(lampFar))
    const short  = lampFar.sub(outward)
    const column = fade(0, LAMP_WIDE.mul(short.mul(LAMP_SPREAD).add(1)), abeam)
      .mul(smoothstep(-0.5, 1.5, short))
      .mul(smoothstep(0, 4, outward))
    const ripple = outward.mul(LAMP_DASH).add(chop.mul(1.4))
      .add(sin(abeam.mul(4.1).add(now.mul(0.9))).mul(1.2))
      .add(sin(outward.mul(1.3).sub(now.mul(0.6))).mul(1.6))
      .sub(now.mul(1.7))
    const broken = mix(smoothstep(-0.15, 0.85, sin(ripple)), 0.42, smoothstep(0.6, 2.2, fwidth(ripple)))

    return amber.mul(lamp.w.mul(LAMP_GAIN))
      .mul(column)
      .mul(broken)
      .div(short.div(LAMP_HALF).add(1))
  }

  const surface = Fn(() => {
    const at = positionWorld.xz

    // Four travelling sines stand in for a normal map: cheap, endless, and a
    // pure function of position and time. All four run before the wind, two
    // straight down it and two off to either side, so the sea has a grain and
    // the grain has a direction.
    const run   = vec2(dot(at, lee), dot(at, vec2(-windZ, windX)))
    const along = sin(run.x.mul(0.35).sub(now.mul(0.9))).add(sin(run.x.mul(0.98).add(run.y.mul(0.21))
      .mul(0.43)
      .sub(now.mul(1.1))))
    const aside = sin(run.x.mul(0.82).add(run.y.mul(0.57))
      .mul(0.27)
      .sub(now.mul(0.7))).sub(sin(run.x.mul(0.87).sub(run.y.mul(0.5))
      .mul(0.21)
      .sub(now.mul(0.5))))

    // The gusts the grass bends to cross the water too, as patches where it
    // is ruffled. A patch narrower than a pixel is only shimmer, so far off
    // they even out to the average.
    const blown = wind.nodes.gust(at)
    const even  = mix(blown, 0.5, smoothstep(0.08, 0.4, fwidth(blown)))

    // The boat, in its own frame, and the calm it makes downwind of itself:
    // a slick the length of a few boats where the gusts do not reach.
    const local = inBoat(at.sub(boat.xy))
    const slick = fade(hullSize.y, hullSize.y.mul(3), abs(local.y))
      .mul(smoothstep(hullSize.x.mul(0.5), hullSize.x.negate(), local.x))
      .mul(fade(LEE * 0.4, LEE, local.x.negate()))
    const gust  = even.mul(slick.mul(-0.8).add(1))

    // How much water lies over the land here.
    const depth = texture(ground.texture, at.mul(ground.scale).add(0.5)).r.negate()
    const pixel = fwidth(depth)

    // Far away a ripple is smaller than a pixel and turns into a moire of the
    // sampling grid, so the waves flatten out with distance.
    const calm = gust.mul(0.04).add(0.03)
      .div(distance(cameraPosition, positionWorld).mul(0.012)
        .add(1))
      .mul(slick.mul(-0.6).add(1))

    // Under the ripples, the swell: long low backs that tilt the whole
    // picture in the water one way and then the other as they pass. It
    // stands up and is spent in the shallows, and far off it is finer than a
    // pixel and lies flat.
    const swell = swellNode(wind.direction, at, now)
    const heave = smoothstep(0, SURF_START * 1.5, depth).mul(fade(1.5, 4, length(fwidth(at))))
    const slope = swell.yz.mul(heave)

    const normal = normalize(vec3(
      along.mul(windX).sub(aside.mul(windZ))
        .mul(calm)
        .sub(slope.x),
      1,
      along.mul(windZ).add(aside.mul(windX))
        .mul(calm)
        .sub(slope.y),
    ))
    const view   = normalize(cameraPosition.sub(positionWorld))

    // The sea's own colour is how much of it there is to look through: pale
    // over the shelf, where the sand is close under it, and dark past the
    // drop. The hour leaves less of it as the light goes.
    const murk   = smoothstep(PALE, DEEP, depth)
    const facing = max(dot(normal, view), 0)
    const body   = mix(mix(shallow, deep, murk), deep, gust.mul(RUFFLE)).mul(nodes.seaTint)

    // Under a cloud, or in the boat's shadow, the water is duller: its own
    // colour is light that went into it and came back out.
    const light  = clouds.light(positionWorld)
    const shaded = fade(-0.3, 0.4, hullDistance(local.sub(boatShade)))
    const dulled = body.mul(mix(1 - GLOOM, 1, light)).mul(shaded.mul(light).mul(-SHADE)
      .add(1))

    // On top of that it gives back the world: the sky, the land, whatever
    // stands over it, upside down, more of it the flatter it is looked across
    // (Schlick's fresnel) and less where a gust has roughened it. The ripples
    // shake the picture, and the sun's or the moon's glint is on top.
    const mirrorUv    = mirrorAt.xy.div(mirrorAt.w).add(normal.xz.mul(WOBBLE))
    const mirrored    = texture(mirror.texture, vec2(mirrorUv.x, mirrorUv.y.oneMinus())).rgb
    const reflectance = pow(facing.oneMinus(), 3).mul(0.94)
      .add(0.06)
      .mul(MIRROR)
      .mul(gust.mul(-BREAK).add(1))
    const halfway = normalize(nodes.lightDirection.add(view))
    const glint   = nodes.seaGlint.mul(pow(max(dot(normal, halfway), 0), 220)).mul(0.9)
      .mul(light)
      .mul(light)

    const colour      = mix(dulled, mirrored, reflectance).add(glint)
      .add(roadOn(along))

    // The sea has no edge of its own: it thins over the last of the sand until
    // the sand is all there is. Over a couple of pixels at least, so the edge
    // stays soft from across the bay. The other way it closes early, at half
    // its darkness: a slanting look through the shallows runs on under the
    // deep water, where the terrain has built no floor to find. What it gives
    // back it gives back over the sand too.
    const veil  = max(reflectance, min(murk.mul(2), 1))
    const alpha = mix(1 - CLEAR, 1, veil).mul(smoothstep(0, pixel.mul(2).add(SHALLOWS), depth))

    const foam = foamOn({ at, depth, pixel, local, gust, swell: swell.x, chop: along.add(aside) })

    // Developed like the land, then the haze by hand: the same fog as the
    // land's, but into the sky's colour in the direction looked in, so toward
    // a low sun the far sea takes the glow that is on the horizon over it and
    // the two still meet as one.
    const lit = developed(mix(colour, white.mul(nodes.seaTint), foam))

    return vec4(hazed(lit, nodes.horizon.add(nodes.skyGlow(view.negate()))), mix(alpha, 1, foam))
  })

  const material = new NodeMaterial()

  material.name         = 'water'
  material.fragmentNode = surface()
  material.transparent  = true
  material.fog          = false

  return material
}

// perf: a dozen trig calls and four lookups a fragment (the land under it,
// the clouds over it, the mirror, what stands in it), with two more only near
// the shore or a stone. It covers a lot of screen, so keep it that small.
