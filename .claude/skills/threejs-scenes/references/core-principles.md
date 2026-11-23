# Core Principles

The non-negotiable rules that apply to every three.js scene under this skill.

## Stack

- **Vanilla three.js only** — `import * as THREE from 'three'`. No React Three Fiber,
  no Drei, no JSX scene definitions.
- **WebGL2 via `WebGLRenderer`**. No WebGPU, no `three/webgpu`, no `three/tsl`, no
  node materials.
- **GLSL ES 3.00** shaders via `ShaderMaterial` / `RawShaderMaterial`.
- **three 0.184** (installed). `BatchedMesh`, `InstancedMesh`, `Data3DTexture` and the
  `three/addons` effects are all available.
- Add-ons come from `three/addons/...` (for example
  `three/addons/utils/BufferGeometryUtils.js`). Never `three/src/...`.

## Programming Style

- **Functional + modular**. Pure factory functions per concern (`createGrassField`).
  No classes unless extending a three.js base type or modeling a clear stateful
  entity.
- **One symbol per file** unless co-located subcomponents share a tightly-coupled
  lifecycle.
- **Lowercase-dashes** for files and directories (`features/grass-field/`).
- **Named exports**. A default export only for a single class.
- **Typed options object** as every factory's single argument, with defaults in the
  destructure.

## Anatomy of a feature

A feature is a factory that takes the `World` services object and returns an
`AppModule`. `World` is defined by this repo (read `src/world/index.ts` and one existing
feature for its real shape); `AppModule` comes from `threejs-scenes/core`.

```ts
// src/world/features/fireflies/index.ts
import * as THREE from 'three'
import { createEmitter } from 'threejs-scenes/raster'
import type { AppModule } from 'threejs-scenes/core'
// World: the services type this repo defines for features (see src/world/index.ts)

export function createFireflies (_world: World): AppModule {
  let emitter: ReturnType<typeof createEmitter> | null = null

  return {
    name: 'fireflies',
    build (ctx) {
      const rng = ctx.rng.fork('fireflies')            // never Math.random
      emitter = createEmitter({ capacity: 400, rate: 30, seed: rng.int(1, 0x7fffffff) })
      emitter.object.userData.module = 'fireflies'
      ctx.scene.add(emitter.object)
    },
    update (_state, frame) {
      emitter?.tick(frame)                             // time comes from the frame
    },
    dispose () {
      emitter?.object.removeFromParent()
      emitter?.dispose()
      emitter = null
    },
  }
}

// perf: medium. One instanced draw call, CPU integration O(capacity) per tick.
```

Register the feature in `src/world/index.ts`. `build` runs once, `update(state, frame, ctx)`
runs once per fixed simulation tick, `dispose` frees what the module created.

## Performance Discipline

- **Programmatic generation > static data.** Geometry, textures, particle attribute
  buffers, palettes, and instance transforms are generated at runtime from typed
  arrays, noise functions, or seeded RNGs. Hand-typing more than ~20 entries is a
  code smell.
- **Mutate, don't reallocate.** Inside `update`, reuse module-scope scratch
  `Vector3` / `Matrix4` / `Quaternion` / `Color` instances. Never `new` per frame.
- **Share materials, share geometries.** A new `MeshStandardMaterial` per mesh
  defeats three.js's auto-batching.
- **Dispose everything you own.** Every `geometry.dispose()`, `material.dispose()`,
  `texture.dispose()`, `renderTarget.dispose()` is paired with its allocation in
  the module's `dispose()`.

## Input

World code does not own the canvas listeners or the camera; the rig does. When a
feature or UI does handle input:

- **Pointer events only.** `pointerdown` / `pointermove` / `pointerup` /
  `pointercancel` + `wheel`. `mousedown` / `mousemove` / `mouseup` and `touchstart` /
  `touchmove` / `touchend` are forbidden — pointer events unify them and respect pen,
  stylus, and accessibility hardware.
- **Handle `pointercancel` as `pointerup`.** iOS fires it aggressively.
- **Pointer capture** via `target.setPointerCapture(e.pointerId)` so drags don't
  break when the pointer leaves the canvas.
- **Multi-touch** (pinch, two-finger pan) by tracking active pointers in a
  `Map<number, PointerState>`. `attachPointerGesture(el, { onDrag, onPinch, onTap, onWheel })`
  from `threejs-scenes/core` does this and returns a detach function.
- **`{ passive: false }`** on the wheel listener so `preventDefault` works.
- **`touch-action: none`** on the canvas so iOS does not fight the handlers.
- **Inertia / damping** on every drag, pan, and rotate; raw input feels jittery on
  touchscreens.
- **NDC from the canvas rect**, not the window: `(e.clientX - rect.left) / rect.width * 2 - 1`.
- **`ResizeObserver` on the canvas parent**, never `window.resize`.

## Render Loop

`createApp` owns the single frame loop, the fixed clock, and the render call. A module
animates in its `update` hook. Never start a second `requestAnimationFrame`, never use
`ctx.loop`, never use timers. See `production-lessons.md`.

## Async Asset Loading

Procedural first. A binary asset only when unavoidable and small, bundled with the
repo — no CDN URLs, no remote assets, no web fonts. `build` is synchronous and a capture
steps the app deterministically, so nothing may depend on a promise resolving mid-run and
half-loaded assets never enter the scene. glTF goes through `GLTFLoader`
(`threejs-scenes/compose` has `loadGLTF`).

## Style Guarantees

Every output produced under this skill must:

- Follow `@tuomashatakka/eslint-config` (no semicolons, single quotes, two-space
  indent, no `any`). See `code-style.md`.
- Apply Semantic Nodes style to all non-3D UI (HTML5 landmarks, design-token CSS,
  tag selectors over class selectors).
- No Tailwind, Shadcn, Radix, CSS Modules, styled-components, or `className`-as-
  styling-prop anywhere.
- Use `pointer*` events exclusively.
- Cap `setPixelRatio` at 2 (the framework's `createRenderer` already does).

## The Five Questions Before Writing Code

1. **Is there an existing primitive in the codebase that already solves part of
   this?** Reuse + extend before duplicating.
2. **What's the perf class — cheap / medium / expensive?** Annotate this in a
   `// perf:` comment at the bottom of the module.
3. **Is the data shape closed (config) or open (procedural)?** Closed → static
   config object. Open → seeded factory.
4. **Does this need to work on touch?** Default answer: yes.
5. **What's the dispose path?** Every allocation has a paired teardown.
