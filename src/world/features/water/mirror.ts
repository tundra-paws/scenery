// src/world/features/water/mirror.ts
import * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'

import { isKeptOutOfMirror } from '../../shared/mirror.ts'
import { drawMirror } from '../../shared/output.ts'


/** Clip space to texture space: [-1, 1] to [0, 1] on both axes. */
const BIAS = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
)

const UP = new THREE.Vector3(0, 1, 0)

/** Module-scope scratch, so a reflection allocates nothing. */
const eye      = new THREE.Vector3()
const ahead    = new THREE.Vector3()
const above    = new THREE.Vector3()
const size     = new THREE.Vector2()
const rotation = new THREE.Matrix4()
const surface  = new THREE.Plane()
const clip     = new THREE.Vector4()
const corner   = new THREE.Vector4()

/** The world as the sea gives it back, and how to find a point of the sea in it. */
export interface Mirror {

  /** The reflection, in linear light and not yet tone-mapped: the sea does that once, with its own colour. */
  texture: THREE.Texture

  /** World position to the reflection's projective texture coordinate: `uv = (m * p).xy / (m * p).w`. */
  matrix: THREE.Matrix4

  /** Draw the reflection for `viewer`, leaving out `sea` and whatever was kept out of the mirror. */
  reflect (renderer: WebGPURenderer, scene: THREE.Scene, viewer: THREE.Camera, sea: THREE.Object3D): void
  dispose (): void
}

interface MirrorOptions {

  /** Height of the water: the plane everything is turned over. */
  level: number

  /** Size of the reflection against the drawing buffer, on each axis. The ripples blur it anyway. */
  scale: number
}

/**
 * The sea's mirror: the world drawn once more from under the water, upside
 * down, into a texture the sea's shader looks itself up in.
 *
 * The camera's sums are three's `Reflector` add-on's (a camera turned over the
 * plane, and a near plane tilted onto the water so nothing under it is drawn),
 * but that add-on draws its own surface and keeps its texture matrix in that
 * surface's frame. The sea is a shader of its own, wants the matrix in world
 * space, and has to leave itself and the grass out of the picture, so the few
 * lines are here.
 */
export function createMirror ({ level, scale }: MirrorOptions): Mirror {
  const target                    = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true })
  const camera                    = new THREE.PerspectiveCamera()
  const matrix                    = new THREE.Matrix4()
  const hidden: THREE.Object3D[]  = []
  const held: THREE.LightShadow[] = []

  target.texture.name = 'mirror'

  function hide (object: THREE.Object3D): void {
    if (object.visible && isKeptOutOfMirror(object)) {
      object.visible = false
      hidden.push(object)
    }

    // A light's shadow map is already drawn for this frame: the mirror
    // reads it and does not draw it again.
    if (object instanceof THREE.DirectionalLight && object.shadow.autoUpdate) {
      object.shadow.autoUpdate = false
      held.push(object.shadow)
    }
  }

  /** Turn `viewer` over the water into `camera`, and tilt its near plane onto the surface. */
  function turnOver (viewer: THREE.PerspectiveCamera): void {
    rotation.extractRotation(viewer.matrixWorld)
    ahead.set(0, 0, -1).applyMatrix4(rotation)
      .add(eye)
    above.set(0, 1, 0).applyMatrix4(rotation)

    camera.position.set(eye.x, 2 * level - eye.y, eye.z)
    camera.up.set(above.x, -above.y, above.z)
    camera.lookAt(ahead.x, 2 * level - ahead.y, ahead.z)
    camera.far         = viewer.far
    camera.layers.mask = viewer.layers.mask
    camera.updateMatrixWorld()
    camera.projectionMatrix.copy(viewer.projectionMatrix)

    matrix.multiplyMatrices(BIAS, camera.projectionMatrix).multiply(camera.matrixWorldInverse)

    // The oblique near plane (Lengyel): the third row of the projection is
    // replaced so that the near plane is the water itself.
    surface.set(UP, -level).applyMatrix4(camera.matrixWorldInverse)
    clip.set(surface.normal.x, surface.normal.y, surface.normal.z, surface.constant)

    const projection = camera.projectionMatrix.elements

    corner.set(
      (Math.sign(clip.x) + projection[8]!) / projection[0]!,
      (Math.sign(clip.y) + projection[9]!) / projection[5]!,
      -1,
      (1 + projection[10]!) / projection[14]!,
    )
    clip.multiplyScalar(2 / clip.dot(corner))

    projection[2]  = clip.x
    projection[6]  = clip.y
    projection[10] = clip.z + 1
    projection[14] = clip.w
  }

  return {
    texture: target.texture,
    matrix,

    reflect (renderer, scene, viewer, sea) {
      if (!(viewer instanceof THREE.PerspectiveCamera))
        return

      eye.setFromMatrixPosition(viewer.matrixWorld)

      if (eye.y <= level)
        return

      renderer.getDrawingBufferSize(size)

      const width  = Math.max(1, Math.round(size.x * scale))
      const height = Math.max(1, Math.round(size.y * scale))

      if (target.width !== width || target.height !== height)
        target.setSize(width, height)

      turnOver(viewer)

      sea.visible = false
      scene.traverse(hide)

      const before = renderer.getRenderTarget()

      // In linear light, with no way to the screen: the sea develops it.
      drawMirror(true)
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.setRenderTarget(before)
      drawMirror(false)

      sea.visible = true

      for (const object of hidden)
        object.visible = true

      for (const shadow of held)
        shadow.autoUpdate = true

      hidden.length = 0
      held.length   = 0
    },

    dispose () {
      target.dispose()
    },
  }
}

// perf: the world again, once a frame, at a fraction of the picture's size:
// one more draw call for everything the camera sees over the water, less what
// was kept out of the mirror (the grass, the barley). No shadow pass: the
// sun's map is reused. A walk over the scene's few dozen objects to find what
// to hide; nothing allocated.
