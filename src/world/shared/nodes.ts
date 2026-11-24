// src/world/shared/nodes.ts
import type * as THREE from 'three'
import { attribute, positionLocal, reference, uniform } from 'three/tsl'
import { Node as NodeBase } from 'three/webgpu'
import type { Node, NodeMaterial, UniformNode } from 'three/webgpu'

/**
 * A value the world writes once a step and every shader that wants it reads:
 * `{ value }`, the shape a GLSL uniform had, and the one the CPU side still
 * writes (`world.wind`, `world.day`, `world.clouds`, `world.wash`).
 *
 * A held vector or colour becomes a node that *is* the object the world
 * writes with `.set` and `.copy`, so nothing is copied a step. A number has
 * no object to share, so it is read off its holder before each draw.
 */
export interface Held<T> {
  value: T
}

/** What says where a placed vertex goes. */
type Displace = (position: Node<'vec3'>) => Node<'vec3'>

/**
 * A node that moves the vertex when it is built, as three's own instancing
 * node does: put in the stack after that one, it is built after it.
 */
class DisplaceNode extends NodeBase {
  private readonly displace: Displace

  constructor (displace: Displace) {
    super('void')
    this.displace = displace
  }

  override setup (): null {
    positionLocal.assign(this.displace(positionLocal))

    return null
  }
}

export function heldVec2 (holder: Held<THREE.Vector2>): UniformNode<'vec2', THREE.Vector2> {
  return uniform(holder.value)
}

export function heldVec3 (holder: Held<THREE.Vector3>): UniformNode<'vec3', THREE.Vector3> {
  return uniform(holder.value)
}

export function heldVec4 (holder: Held<THREE.Vector4>): UniformNode<'vec4', THREE.Vector4> {
  return uniform(holder.value)
}

/** A held colour, as the three numbers it is in linear light. */
export function heldColour (holder: Held<THREE.Color>): Node<'vec3'> {
  // A colour is a vec3 to a shader; only the typings tell them apart.
  return uniform(holder.value) as unknown as Node<'vec3'>
}

export function heldMat4 (holder: Held<THREE.Matrix4>): UniformNode<'mat4', THREE.Matrix4> {
  return uniform(holder.value)
}

export function heldFloat (holder: Held<number>): Node<'float'> {
  return reference('value', 'float', holder)
}

/** A geometry's attribute of one number a vertex (or an instance), by name, typed as what it is. */
export function floatAttribute (name: string): Node<'float'> {
  return attribute(name, 'float') as unknown as Node<'float'>
}

/** A geometry's attribute of three numbers a vertex (or an instance), by name. */
export function vec3Attribute (name: string): Node<'vec3'> {
  return attribute(name, 'vec3') as unknown as Node<'vec3'>
}

/** A geometry's attribute of four numbers a vertex, by name. */
export function vec4Attribute (name: string): Node<'vec4'> {
  return attribute(name, 'vec4') as unknown as Node<'vec4'>
}

/**
 * Move an instanced material's vertices once each instance has been placed:
 * `displace` is given where a vertex is in the mesh's own space, after its
 * instance's matrix, and says where it goes.
 *
 * three's own `positionNode` is worked out before the instance matrix is
 * applied, in the one copy's space: right for a mesh that is not instanced,
 * and no use to a tuft that has to lean the way the wind blows whichever way
 * it was turned when it was planted. The shadow three draws of a material
 * does not go through this: use it for what casts none.
 */
export function displaceInstances (material: NodeMaterial, displace: Displace): void {
  const setupPosition = material.setupPosition.bind(material)

  material.setupPosition = builder => {
    const position = setupPosition(builder)

    new DisplaceNode(displace).toStack()

    return position
  }
}

// perf: trivial — a node a value, made once with the world.
