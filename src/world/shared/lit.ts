// src/world/shared/lit.ts
import { cameraViewMatrix, clamp, diffuseColor, dot, float, max, mix, normalView, normalViewGeometry, normalWorldGeometry, positionViewDirection, positionWorld, pow, roughness, smoothstep, vec4 } from 'three/tsl'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial, PhysicalLightingModel } from 'three/webgpu'
import type { LightingModelDirectInput, MeshBasicNodeMaterialParameters, MeshStandardNodeMaterialParameters, Node, NodeBuilder } from 'three/webgpu'

import { GLOOM } from './cloud-shadow.ts'
import type { CloudShadow } from './cloud-shadow.ts'
import type { Daylight, DaylightNodes } from './daylight.ts'
import { developed, hazed } from './output.ts'
import { relief } from './surface.ts'
import type { Surface } from './surface.ts'
import type { Weather } from './weather.ts'

/**
 * How much faster than a lit face light through cloth falls off as the
 * cloth turns from it: it has more of the weave to cross. This is what
 * shows a fold in a sail with the sun behind it.
 */
const SLANT = 6

/**
 * What the rain does to a surface it soaks: how much of its colour is left
 * (wet stone and wet turf go darker and deeper), and how smooth it goes,
 * so a low light catches it and it shines.
 */
const SOAKED = 0.62
const SHEEN  = 0.34

/** How much of its colour is left to what sheds the rain (a leaf, a blade, wool, a feather): it darkens a little and keeps no film to shine with. */
const DAMP = 0.82

/**
 * Standing water over a surface (a puddle): how much of the ground under it
 * still shows, and how smooth it is. It gives back the sky like the sea.
 */
const DROWNED = 0.3
const STILL   = 0.06

/**
 * How much of the sky a wet face gives back looking straight at it, and a
 * wall's share of what a level face gives: water runs off a wall in a film,
 * and lies on a level face. Fresnel does the rest: across a wet slope seen
 * from low down it is half the sky.
 */
const FILM = 0.02
const WALL = 0.35

/**
 * How bright the sky is against a face the sun lights: the dome's colours
 * are what the eye is shown, and the sky itself is brighter than that next
 * to a lit field. And the least of it a puddle gives back however steeply
 * it is looked into: still water over dark earth is a mirror.
 */
const SKYLIGHT = 1.6
const MIRROR   = 0.32

/** The part of the world a material needs: the clouds that shade it, the hour, for the haze it fades into, and the rain, if it can be rained on. */
interface Air {
  clouds:   CloudShadow
  day:      Daylight
  weather?: Weather
}

/** What the rain has done to a surface, a fragment: how wet it is, how much water stands on it, and the sky it gives back. */
interface Soaking {
  wet:    Node<'float'>
  pooled: Node<'float'>
  day:    DaylightNodes

  /** How much of a film it holds, against bare stone's: less in turf, where the blades break it up. */
  film: Node<'float'> | number

  /** Whether water runs off it in drops instead of lying on it in a film (`sheds`). */
  sheds: boolean
}

/** What a material makes of the light it has gathered, on its way to the screen. */
type Shown = (light: Node<'vec3'>) => Node<'vec3'>

/** The light a surface has gathered, as three's lighting model keeps it while it adds the lights up. */
interface Gathered {
  directDiffuse:    Node<'vec3'>
  directSpecular:   Node<'vec3'>
  indirectDiffuse:  Node<'vec3'>
  indirectSpecular: Node<'vec3'>
}

/** One light's share, as three hands it to the lighting model: where it comes from, its colour after its shadow, and what has been gathered so far. */
interface Lighted {
  lightDirection: Node<'vec3'>
  lightColor:     Node<'vec3'>
  reflectedLight: Gathered
}

/**
 * three's own lighting, with the clouds' shadow laid over it.
 *
 * The lights' own share is dimmed after three has added it up, and a little of
 * the sky's with it, or a shadow on a slope already turned from the sun would
 * not show. What the shadow map says is left as it was.
 *
 * Cloth is thin: a share of the light that falls on its far side comes
 * through it (`through`), so a sail between the eye and a low sun glows
 * instead of standing dark. It takes the cloth's colour once going in and
 * again coming out, and so comes through warmer than it fell. Nothing for
 * anything else, and then no code.
 */
class CloudedLighting extends PhysicalLightingModel {
  private readonly lit: Node<'float'>

  private readonly through: number

  private readonly soaking: Soaking | null

  constructor (lit: Node<'float'>, through: number, soaking: Soaking | null) {
    super()
    this.lit     = lit
    this.through = through
    this.soaking = soaking
  }

  // Called once for each light. A flat-shaded facet's normal is always
  // toward the eye, so light from behind it is light on its far side.
  override direct (input: LightingModelDirectInput, builder: NodeBuilder): void {
    super.direct(input, builder)

    if (this.through <= 0)
      return

    const { lightDirection, lightColor, reflectedLight } = input as unknown as Lighted

    reflectedLight.directDiffuse.addAssign(normalView.dot(lightDirection).negate()
      .clamp()
      .pow(SLANT)
      .mul(lightColor)
      .mul(diffuseColor.rgb)
      .mul(diffuseColor.rgb)
      .mul(this.through / Math.PI))
  }

  // Called once every light has been added and the sky's share worked out,
  // before they are summed.
  override indirect (builder: NodeBuilder): void {
    super.indirect(builder)

    const { reflectedLight } = (builder as unknown as { context: { reflectedLight: Gathered }}).context

    reflectedLight.directDiffuse.mulAssign(this.lit)
    reflectedLight.directSpecular.mulAssign(this.lit)
    reflectedLight.indirectDiffuse.mulAssign(mix(1, this.lit, GLOOM))

    if (this.soaking && !this.soaking.sheds)
      reflectedLight.indirectSpecular.addAssign(skyGivenBack(this.soaking).mul(mix(1, this.lit, GLOOM)))
  }
}

/**
 * The world's lit material: three's standard one as a node material, shaded
 * by the clouds as they pass.
 *
 * Everything on the island that the sun lights is one of these. Two that
 * are made alike are drawn with one program, whatever they are named: the
 * boulders, every placed stone, the sheep, the seals and the starlings are
 * all `createLitMaterial(world, { flatShading: true, roughness: 1 })`.
 */
export class LitMaterial extends MeshStandardNodeMaterial {
  private readonly cloudLight: Node<'float'>

  private readonly dyes: ((colour: Node<'vec3'>) => Node<'vec3'>)[] = []

  /** The share of the light on its far side that comes through it: nothing, unless it is cloth (`letThrough`). */
  private through = 0

  /** How wet it is, and the hour whose sky it gives back: none, unless it is out in the rain (`wets`). */
  private soaking: Soaking | null = null

  /**
   * The way to the screen (`shared/output.ts`): developed, then hazed into
   * the horizon's colour. Something far off that fades into more than that
   * (the land beyond) says its own.
   */
  shown: Shown

  constructor (cloudLight: Node<'float'>, shown: Shown, parameters?: MeshStandardNodeMaterialParameters) {
    super(parameters)
    this.cloudLight = cloudLight
    this.shown      = shown
  }

  override setupOutput (_builder: NodeBuilder, outputNode: Node<'vec4'>): Node<'vec4'> {
    return vec4(this.shown(outputNode.rgb), outputNode.a)
  }

  override setupLightingModel (): PhysicalLightingModel {
    return new CloudedLighting(this.cloudLight, this.through, this.soaking)
  }

  override setupDiffuseColor (builder: NodeBuilder): void {
    super.setupDiffuseColor(builder)

    for (const dye of this.dyes)
      diffuseColor.rgb.assign(dye(diffuseColor.rgb))

    if (this.soaking)
      diffuseColor.rgb.mulAssign(mix(1, this.soaking.sheds ? DAMP : SOAKED, this.soaking.wet).mul(mix(1, DROWNED, this.soaking.pooled)))
  }

  override setupVariants (builder: NodeBuilder): void {
    super.setupVariants(builder)

    if (this.soaking && !this.soaking.sheds)
      roughness.assign(mix(mix(roughness, SHEEN, this.soaking.wet.mul(this.soaking.film)), STILL, this.soaking.pooled))
  }

  /**
   * Let the rain at it: `wet` is how wet it is, 0 to 1, at each fragment,
   * and `pooled` how much water stands on it there (none, unless it is
   * the land), and `film` how much of a wet stone's sheen it has. Wet, it
   * is darker and gives back the hour's sky; under a puddle it is a
   * mirror. `null` keeps it dry.
   */
  wets (wet: Node<'float'> | null, day?: DaylightNodes, pooled: Node<'float'> = float(0), film: Node<'float'> | number = 1): void {
    this.soaking = wet && day ? { wet, pooled, day, film, sheds: false } : null
  }

  /**
   * Say the rain runs off it in drops: a leaf, a blade of grass, a fleece,
   * a feather, cloth. It darkens a little when wet and does not shine.
   * Everything that sheds and is otherwise made alike is one program.
   */
  sheds (): void {
    if (this.soaking)
      this.soaking.sheds = true
  }

  /**
   * A last word on the surface's own colour, after three has multiplied in
   * the colours of its vertices and its instances and before any light
   * falls on it: where a crop pales as it bows, or the turf wears to earth.
   * Each is laid over the ones before it.
   */
  dye (change: (colour: Node<'vec3'>) => Node<'vec3'>): void {
    this.dyes.push(change)
  }

  /**
   * Say it is cloth, thin enough that this share of the light on one side
   * of it shows on the other. Every cloth that lets the same share through,
   * and is otherwise made alike, is one program.
   */
  letThrough (share: number): void {
    this.through = share
  }

  /**
   * Give the surface its texture (`shared/surface.ts`): the pattern's colour
   * as one more dye, and its relief as the normal the light is worked out
   * from, so a facet is no longer one flat tone.
   */
  finish (surface: Surface): void {
    this.dye(surface.colour)
    this.normalNode = relief(surface.height)
  }
}

/**
 * Something that gives its own light and takes none (the lamp's flame, the
 * window): three's basic material as a node material, on the same way to
 * the screen as everything lit.
 */
export class UnlitMaterial extends MeshBasicNodeMaterial {
  private readonly shown: Shown

  constructor (shown: Shown, parameters?: MeshBasicNodeMaterialParameters) {
    super(parameters)
    this.shown = shown
  }

  override setupOutput (_builder: NodeBuilder, outputNode: Node<'vec4'>): Node<'vec4'> {
    return vec4(this.shown(outputNode.rgb), outputNode.a)
  }
}

/**
 * The sky in a wet surface: the dome's own colours toward where the eye's
 * ray goes once it has glanced off the facet (its own normal, not its
 * grain's: water lies smooth over the grain, and a grain finer than a pixel
 * would only sparkle), the glow on the sun's
 * side, and the sun or the moon in it, as much of all that as Schlick's
 * fresnel says water gives back at that angle. A level face holds a film;
 * a wall less; a puddle is a mirror.
 */
function skyGivenBack ({ wet, pooled, day, film: holds }: Soaking): Node<'vec3'> {
  const ray     = positionViewDirection.negate().reflect(normalViewGeometry)
    .transformDirection(cameraViewMatrix)
  const up      = clamp(ray.y, 0, 1)
  const dome    = mix(day.horizon, day.zenith, pow(up, 0.55)).add(day.skyGlow(ray))
  const body    = max(dot(ray, day.bodyDirection), 0)
  const glare   = mix(day.sunDisc, day.moonDisc, day.night).mul(pow(body, 24).mul(0.6))
  const facing  = max(dot(normalViewGeometry, positionViewDirection), 0)
  const fresnel = pow(facing.oneMinus(), 5).mul(1 - FILM)
    .add(FILM)
  const film    = mix(WALL, 1, smoothstep(0.3, 0.85, normalWorldGeometry.y)).mul(wet)
    .mul(fresnel)
    .mul(holds)
  const mirror  = mix(MIRROR, 1, fresnel).mul(pooled)

  return dome.add(glare).mul(max(film, mirror))
    .mul(SKYLIGHT)
}

/** A lit material under this world's clouds, and in its rain when it is handed the weather. Flat-shaded and matt unless told otherwise (and dry): facets are the style. */
export function createLitMaterial ({ clouds, day, weather }: Air, parameters: MeshStandardNodeMaterialParameters = {}): LitMaterial {
  const material = new LitMaterial(clouds.light(positionWorld), light => hazed(developed(light), day.nodes.horizon), { flatShading: true, roughness: 1, metalness: 0, ...parameters })

  material.wets(weather?.nodes.wet ?? null, day.nodes)

  return material
}

/** A material that gives its own light, hazed with distance like the rest. */
export function createUnlitMaterial ({ day }: Pick<Air, 'day'>, parameters: MeshBasicNodeMaterialParameters = {}): UnlitMaterial {
  return new UnlitMaterial(light => hazed(developed(light), day.nodes.horizon), parameters)
}

// perf: one lookup of the clouds' picture a fragment, its place worked out a
// vertex. Materials made alike share a program.
