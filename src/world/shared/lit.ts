// src/world/shared/lit.ts
import { diffuseColor, mix, positionWorld, vec4 } from 'three/tsl'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial, PhysicalLightingModel } from 'three/webgpu'
import type { MeshBasicNodeMaterialParameters, MeshStandardNodeMaterialParameters, Node, NodeBuilder } from 'three/webgpu'

import { GLOOM } from './cloud-shadow.ts'
import type { CloudShadow } from './cloud-shadow.ts'
import type { Daylight } from './daylight.ts'
import { developed, hazed } from './output.ts'
import { relief } from './surface.ts'
import type { Surface } from './surface.ts'

/** The part of the world a material needs: the clouds that shade it, and the hour, for the haze it fades into. */
interface Air {
  clouds: CloudShadow
  day:    Daylight
}

/** What a material makes of the light it has gathered, on its way to the screen. */
type Shown = (light: Node<'vec3'>) => Node<'vec3'>

/** The light a surface has gathered, as three's lighting model keeps it while it adds the lights up. */
interface Gathered {
  directDiffuse:   Node<'vec3'>
  directSpecular:  Node<'vec3'>
  indirectDiffuse: Node<'vec3'>
}

/**
 * three's own lighting, with the clouds' shadow laid over it.
 *
 * The lights' own share is dimmed after three has added it up, and a little of
 * the sky's with it, or a shadow on a slope already turned from the sun would
 * not show. What the shadow map says is left as it was.
 */
class CloudedLighting extends PhysicalLightingModel {
  private readonly lit: Node<'float'>

  constructor (lit: Node<'float'>) {
    super()
    this.lit = lit
  }

  // Called once every light has been added and the sky's share worked out,
  // before they are summed.
  override indirect (builder: NodeBuilder): void {
    super.indirect(builder)

    const { reflectedLight } = (builder as unknown as { context: { reflectedLight: Gathered }}).context

    reflectedLight.directDiffuse.mulAssign(this.lit)
    reflectedLight.directSpecular.mulAssign(this.lit)
    reflectedLight.indirectDiffuse.mulAssign(mix(1, this.lit, GLOOM))
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
    return new CloudedLighting(this.cloudLight)
  }

  override setupDiffuseColor (builder: NodeBuilder): void {
    super.setupDiffuseColor(builder)

    for (const dye of this.dyes)
      diffuseColor.rgb.assign(dye(diffuseColor.rgb))
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

/** A lit material under this world's clouds. Flat-shaded and matt unless told otherwise: facets are the style. */
export function createLitMaterial ({ clouds, day }: Air, parameters: MeshStandardNodeMaterialParameters = {}): LitMaterial {
  return new LitMaterial(clouds.light(positionWorld), light => hazed(developed(light), day.nodes.horizon), { flatShading: true, roughness: 1, metalness: 0, ...parameters })
}

/** A material that gives its own light, hazed with distance like the rest. */
export function createUnlitMaterial ({ day }: Pick<Air, 'day'>, parameters: MeshBasicNodeMaterialParameters = {}): UnlitMaterial {
  return new UnlitMaterial(light => hazed(developed(light), day.nodes.horizon), parameters)
}

// perf: one lookup of the clouds' picture a fragment, its place worked out a
// vertex. Materials made alike share a program.
