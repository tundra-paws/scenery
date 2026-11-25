// src/world/shared/daylight.ts
import * as THREE from 'three'
import { dot, exp, length, max, normalize, pow } from 'three/tsl'
import type { Node } from 'three/webgpu'

import { heldColour, heldFloat, heldVec3 } from './nodes.ts'

import { HOURS } from './palette.ts'
import type { HourName } from './palette.ts'


/**
 * Seconds from one sunset to the next: the length of the tour's loop.
 *
 * A visit and a day are the same length on purpose, so the tour is a day at
 * this place and every stop on it has its own hour: in to the landing as the
 * sun goes down, up the path in the dusk, the cairn under the stars and the
 * moon over the sea, the island from the air by moonlight, round the far
 * shores as it gets light, and back to the boat in the afternoon. A test in
 * `rig/tour.test.ts` holds the two together: add a view, or change how long
 * a leg takes, and this is the number to change with it.
 */
export const DAY = 321.5

/** How far north the island lies, and how far north of the equator the sun is: a summer's day, with a low sun and a short night. */
const LATITUDE    = THREE.MathUtils.degToRad(58)
const DECLINATION = THREE.MathUtils.degToRad(12)

/**
 * Which way north is, as an angle on the ground from -z toward +x. The land
 * was made before it had a north: this puts the sunset where the first view
 * can see it, low over the sea to the left of the cairn.
 */
const NORTH = THREE.MathUtils.degToRad(8)

/** The pole the sky turns about: due north, as high as the island is far north. */
export const POLE = new THREE.Vector3(Math.sin(NORTH) * Math.cos(LATITUDE), Math.sin(LATITUDE), -Math.cos(NORTH) * Math.cos(LATITUDE))

/**
 * The slow part of the day, from a little past sunset to a little before
 * sunrise: how many seconds it lasts, and how far the sky turns in them.
 *
 * These two are what the tour's evening, night and morning stops are timed
 * by (the landing at sunset, the cairn under the stars, `ridge` half a
 * degree after sunrise), so they are the numbers that are typed in, and the
 * pace of the rest follows from them. A view added in the afternoon makes
 * `DAY` longer and nothing else: the night keeps its length and its pace,
 * every stop before `ridge` keeps its hour, and noon gives up the time.
 */
const NIGHT  = 177.65
const TURNED = THREE.MathUtils.degToRad(143.13)

/**
 * The day's pace, as multiples of an even turn. `EDGE` is how far from noon,
 * on an even turn, the day ends: a little past sunset one way and a little
 * before sunrise the other. From there right through the night the sky goes
 * at `SLOW`, and noon is what is left over, so that a day is still a day:
 * the evening, the night and the morning last, and the hours nobody stops
 * for are the quick ones. (78 degrees, 0.7 and 2.08 in a day of 313.5.)
 */
const EDGE = Math.PI * (1 - NIGHT / DAY)
const SLOW = TURNED / 2 / (Math.PI - EDGE)
const NOON = Math.PI * 2 / EDGE * (1 - SLOW) + SLOW

/**
 * How far the sky has turned from noon at second ten, when the postcards
 * are taken: picked by looking, like the wind's head start. The sun stands
 * ten degrees over the sea to the west, and every thumbnail in the gallery
 * has had it there.
 */
const TEN = THREE.MathUtils.degToRad(90.791)

/**
 * Where on its even round the sun is when the world begins, as an angle
 * from noon: wherever puts it at `TEN` ten seconds later, whatever the day's
 * length and pace have become.
 */
const OPENING = evenAt(TEN) - Math.PI * 2 * 10 / DAY

/** Sun elevation, in degrees, under which the moon is the body that lights the land. The light is out as it passes. */
const HANDOVER = -7

/** Degrees either side of the skyline over which a sun going behind the land on the horizon fades off the island. */
const BEHIND = 0.7

/** The lowest the light on the land is taken to stand, in degrees: a shadow can be long but not endless. */
const LOWEST = 7

/**
 * The hours, lowest sun first: the elevation each is reached at, in degrees,
 * how strong the light on the land and the fill from the sky are then, how
 * much of the light the clouds' near faces catch, and how strong the glow
 * along the horizon is on the sun's side.
 */
const STOPS: readonly Stop[] = [
  { hour: 'night', elevation: -15, light: 1.1, fill: 1.25, lit: 0.5, glow: 0 },
  { hour: 'dusk', elevation: HANDOVER, light: 0, fill: 1.4, lit: 0, glow: 0.55 },
  { hour: 'sunset', elevation: 0, light: 1.9, fill: 1.5, lit: 1, glow: 0.7 },
  { hour: 'gold', elevation: 9, light: 3.1, fill: 1.8, lit: 1, glow: 0.3 },
  { hour: 'day', elevation: 24, light: 3.2, fill: 1.7, lit: 1, glow: 0 },
]

/** The colours of each stop, made once. */
const COLOURS = STOPS.map(stop => ({
  zenith:  new THREE.Color(HOURS[stop.hour].zenith),
  horizon: new THREE.Color(HOURS[stop.hour].horizon),
  light:   new THREE.Color(HOURS[stop.hour].light),
  fill:    new THREE.Color(HOURS[stop.hour].fill),
  ground:  new THREE.Color(HOURS[stop.hour].ground),
}))

const HIGHEST = STOPS.length - 1

/** Module-scope scratch, so asking the sun's height allocates nothing. */
const scratch = new THREE.Vector3()

/** How high the land on the horizon stands toward a bearing, in degrees; -90 where there is none. */
export type Skyline = (bearing: number) => number

interface Stop {
  hour:      HourName
  elevation: number
  light:     number
  fill:      number
  lit:       number
  glow:      number
}

/** What a shader reads of the hour. One object shared by reference, written once a step. */
export interface DaylightUniforms {

  /** Toward the sun, wherever it is, under the horizon too. */
  uSunDirection: { value: THREE.Vector3 }

  /** Toward the body that lights the land and the clouds: the sun, or at night the moon. */
  uBodyDirection: { value: THREE.Vector3 }

  /** The same, never lower than a shadow can be cast from. */
  uLightDirection: { value: THREE.Vector3 }
  uZenith:         { value: THREE.Color }
  uHorizon:        { value: THREE.Color }

  /** The sun's disc, the glow it leaves along the horizon, and the moon's disc. */
  uSunDisc:  { value: THREE.Color }
  uGlow:     { value: THREE.Color }
  uMoonDisc: { value: THREE.Color }

  /** A cloud's face toward the light, and away from it. */
  uCloudLit:   { value: THREE.Color }
  uCloudShade: { value: THREE.Color }

  /** What the hour leaves of the sea's own colours, what its surface gives back of the sky, and what glints off it. */
  uSeaTint:  { value: THREE.Color }
  uSeaSky:   { value: THREE.Color }
  uSeaGlint: { value: THREE.Color }

  /** 0 by day, 1 when the stars are out. */
  uNight: { value: number }
}

/** What a node material reads of the hour: every one of `DaylightUniforms`, by its name without the `u`. */
export interface DaylightNodes {
  sunDirection:   Node<'vec3'>
  bodyDirection:  Node<'vec3'>
  lightDirection: Node<'vec3'>
  zenith:         Node<'vec3'>
  horizon:        Node<'vec3'>
  sunDisc:        Node<'vec3'>
  glow:           Node<'vec3'>
  moonDisc:       Node<'vec3'>
  cloudLit:       Node<'vec3'>
  cloudShade:     Node<'vec3'>
  seaTint:        Node<'vec3'>
  seaSky:         Node<'vec3'>
  seaGlint:       Node<'vec3'>
  night:          Node<'float'>

  /**
   * The glow along the horizon: the warm light left low in the sky on the
   * side the sun is on, toward a direction. The dome adds it to its gradient
   * and the sea fades into it, so the two still meet in one colour.
   */
  skyGlow (direction: Node<'vec3'>): Node<'vec3'>
}

/**
 * The hour: where the sun is, and what that makes of the sky, the light on
 * the land and the fill in its shadows. Like the wind it is one signal that
 * everything reads, and nothing in it but the time.
 */
export interface Daylight {
  readonly uniforms: DaylightUniforms

  /** The same for a node material. */
  readonly nodes: DaylightNodes

  /** The one light that casts shadows: the sun, or the moon when the sun is well down. */
  readonly light: { direction: THREE.Vector3, colour: THREE.Color, intensity: number }

  /** The sky's light and the land's on what the light does not reach. */
  readonly fill: { sky: THREE.Color, ground: THREE.Color, intensity: number }

  /** The colour distance fades to: the horizon's. */
  readonly haze: THREE.Color

  /** 0 by day, 1 at night. A lamp is brighter to an eye that has opened to the dark. */
  night: number

  /** How far the sky has turned about its pole since noon, in radians. */
  hour: number

  /** Put the sun where it is at `time` seconds. */
  turn (time: number): void
}

/** How far the sky has really turned when an even turn would have gone `away` from noon (0 to pi): the pace, added up. */
function paced (away: number): number {
  const light = Math.min(away, EDGE)

  return (NOON + SLOW) / 2 * light + (NOON - SLOW) / 2 * EDGE / Math.PI * Math.sin(Math.PI * light / EDGE) + SLOW * (away - light)
}

/** The even turn by which the sky has really turned `hour` from noon. Found by halving: `paced` has no inverse to write down. */
function evenAt (hour: number): number {
  let under = 0
  let over  = Math.PI

  for (let halving = 0; halving < 50; halving += 1) {
    const middle = (under + over) / 2

    if (paced(middle) < hour)
      under = middle
    else
      over = middle
  }

  return (under + over) / 2
}

/**
 * The sky's turn at `time`: an angle from noon, in radians, that goes round
 * once a day, quickly through the middle of the day and slowly from evening
 * to morning.
 *
 * Its pace is half a cosine from `NOON` at noon down to `SLOW` at the day's
 * edge, and `SLOW` from there round to the other edge, so it never jumps.
 * This is that pace added up: the same forward and back from noon, and
 * exactly once round in a day.
 */
export function hourAt (time: number): number {
  const mean  = OPENING + time / DAY * Math.PI * 2
  const turns = Math.floor(mean / (Math.PI * 2) + 0.5)
  const from  = mean - turns * Math.PI * 2

  return turns * Math.PI * 2 + Math.sign(from) * paced(Math.abs(from))
}

/**
 * Toward the sun at `time`, as a unit vector into `out`.
 *
 * The sun rides a circle about the pole: highest in the south at noon, down
 * into the north-west, round under the northern horizon and up again in the
 * north-east.
 */
export function sunAt (time: number, out: THREE.Vector3): THREE.Vector3 {
  const hour  = hourAt(time)
  const round = Math.cos(DECLINATION)
  const pole  = Math.sin(DECLINATION)
  const south = round * Math.cos(hour) * Math.sin(LATITUDE) - pole * Math.cos(LATITUDE)
  const west  = round * Math.sin(hour)

  return out.set(
    -west * Math.cos(NORTH) - south * Math.sin(NORTH),
    round * Math.cos(hour) * Math.cos(LATITUDE) + pole * Math.sin(LATITUDE),
    south * Math.cos(NORTH) - west * Math.sin(NORTH),
  )
}

/** The sun's height over the horizon at `time`, in degrees. */
export function elevationAt (time: number): number {
  return THREE.MathUtils.radToDeg(Math.asin(sunAt(time, scratch).y))
}

/** The stop an elevation is at or over, short of the last: the lower of the two it is blended from. */
function stopUnder (elevation: number): number {
  let lower = 0

  while (lower < HIGHEST - 1 && elevation >= STOPS[lower + 1]!.elevation)
    lower += 1

  return lower
}

/** The bearing of a direction, in degrees from -z toward +x. */
function bearingOf ({ x, z }: THREE.Vector3): number {
  return THREE.MathUtils.radToDeg(Math.atan2(x, -z))
}

/**
 * The hour, under a sky whose horizon may not be level: `skyline` is the land
 * on it, which the sun goes down behind before it reaches the sea. The island
 * is then in that land's shadow, and the sea has no sun to glint with, while
 * the sky over them keeps the hour it has by the sun's height alone.
 */
export function createDaylight (skyline: Skyline = () => -90): Daylight {
  const uniforms: DaylightUniforms = {
    uSunDirection:   { value: new THREE.Vector3(0, 1, 0) },
    uBodyDirection:  { value: new THREE.Vector3(0, 1, 0) },
    uLightDirection: { value: new THREE.Vector3(0, 1, 0) },
    uZenith:         { value: new THREE.Color() },
    uHorizon:        { value: new THREE.Color() },
    uSunDisc:        { value: new THREE.Color() },
    uGlow:           { value: new THREE.Color() },
    uMoonDisc:       { value: new THREE.Color() },
    uCloudLit:       { value: new THREE.Color() },
    uCloudShade:     { value: new THREE.Color() },
    uSeaTint:        { value: new THREE.Color() },
    uSeaSky:         { value: new THREE.Color() },
    uSeaGlint:       { value: new THREE.Color() },
    uNight:          { value: 0 },
  }

  const sunDirection = heldVec3(uniforms.uSunDirection)
  const glow         = heldColour(uniforms.uGlow)

  const nodes: DaylightNodes = {
    sunDirection,
    bodyDirection:  heldVec3(uniforms.uBodyDirection),
    lightDirection: heldVec3(uniforms.uLightDirection),
    zenith:         heldColour(uniforms.uZenith),
    horizon:        heldColour(uniforms.uHorizon),
    sunDisc:        heldColour(uniforms.uSunDisc),
    glow,
    moonDisc:       heldColour(uniforms.uMoonDisc),
    cloudLit:       heldColour(uniforms.uCloudLit),
    cloudShade:     heldColour(uniforms.uCloudShade),
    seaTint:        heldColour(uniforms.uSeaTint),
    seaSky:         heldColour(uniforms.uSeaSky),
    seaGlint:       heldColour(uniforms.uSeaGlint),
    night:          heldFloat(uniforms.uNight),

    skyGlow (direction) {
      const ahead  = direction.xz.div(max(length(direction.xz), 0.0001))
      const toward = dot(ahead, normalize(sunDirection.xz)).mul(0.5)
        .add(0.5)

      return glow.mul(pow(toward, 4)).mul(exp(max(direction.y, 0).mul(-5)))
    },
  }

  const light = { direction: uniforms.uLightDirection.value, colour: new THREE.Color(), intensity: 0 }
  const fill  = { sky: uniforms.uSeaSky.value, ground: new THREE.Color(), intensity: 0 }
  const noon  = COLOURS[HIGHEST]!
  const moon  = COLOURS[0]!.light
  const floor = Math.sin(THREE.MathUtils.degToRad(LOWEST))

  const day: Daylight = {
    uniforms,
    nodes,
    light,
    fill,
    haze:  uniforms.uHorizon.value,
    night: 0,
    hour:  0,

    turn (time) {
      const sun       = sunAt(time, uniforms.uSunDirection.value)
      const elevation = THREE.MathUtils.radToDeg(Math.asin(sun.y))
      const lower     = stopUnder(elevation)
      const from      = STOPS[lower]!
      const to        = STOPS[lower + 1]!
      const low       = COLOURS[lower]!
      const high      = COLOURS[lower + 1]!
      const part      = THREE.MathUtils.clamp((elevation - from.elevation) / (to.elevation - from.elevation), 0, 1)
      const lit       = THREE.MathUtils.lerp(from.lit, to.lit, part)

      day.hour  = hourAt(time)
      day.night = 1 - THREE.MathUtils.smoothstep(elevation, STOPS[0]!.elevation, HANDOVER)

      uniforms.uNight.value = day.night
      uniforms.uZenith.value.lerpColors(low.zenith, high.zenith, part)
      uniforms.uHorizon.value.lerpColors(low.horizon, high.horizon, part)

      // The body: the full moon stands opposite the sun, so it comes up as
      // the sun goes down, and the light is out at the moment they change.
      const body = uniforms.uBodyDirection.value.copy(sun)

      if (elevation < HANDOVER)
        body.negate()

      // The light on the land comes from no lower than `LOWEST`, turned
      // toward the body all the same.
      light.direction.copy(body)

      if (body.y < floor) {
        const flat = Math.hypot(body.x, body.z)

        light.direction.set(body.x / flat * Math.sqrt(1 - floor * floor), floor, body.z / flat * Math.sqrt(1 - floor * floor))
      }

      light.colour.lerpColors(low.light, high.light, part)
      light.intensity = THREE.MathUtils.lerp(from.light, to.light, part)

      if (elevation >= HANDOVER) {
        const ridge = skyline(bearingOf(sun))

        light.intensity *= THREE.MathUtils.smoothstep(elevation, ridge - BEHIND, ridge + BEHIND)
      }

      fill.sky.lerpColors(low.fill, high.fill, part)
      fill.ground.lerpColors(low.ground, high.ground, part)
      fill.intensity = THREE.MathUtils.lerp(from.fill, to.fill, part)

      // The discs. The sun's is its light's colour until it is down; the
      // moon's is pale while there is still day in the sky.
      uniforms.uSunDisc.value.copy(elevation < HANDOVER ? COLOURS[1]!.light : light.colour)
      uniforms.uGlow.value.copy(uniforms.uSunDisc.value).multiplyScalar(THREE.MathUtils.lerp(from.glow, to.glow, part))
      uniforms.uMoonDisc.value.copy(moon).multiplyScalar(0.35 + 0.65 * day.night)

      // A cloud has no colour of its own: the sky's where it is turned away,
      // and the light's where it faces it, as far as there is light to catch.
      uniforms.uCloudShade.value.lerpColors(fill.sky, uniforms.uHorizon.value, 0.3)
      uniforms.uCloudLit.value.lerpColors(uniforms.uCloudShade.value, light.colour, lit)

      // The sea is its own colours by day and keeps as much of them as there
      // is sky to light it: the fill's share of what it is at noon.
      uniforms.uSeaTint.value.setRGB(
        fill.sky.r / noon.fill.r,
        fill.sky.g / noon.fill.g,
        fill.sky.b / noon.fill.b,
      ).multiplyScalar(fill.intensity / STOPS[HIGHEST]!.fill)

      uniforms.uSeaGlint.value.copy(light.colour).multiplyScalar(light.intensity / STOPS[HIGHEST]!.light)
    },
  }

  day.turn(0)

  return day
}

// perf: trivial — one sine and cosine pair and a dozen colour blends a step,
// into uniforms every material that reads the hour shares. Nothing allocated.
