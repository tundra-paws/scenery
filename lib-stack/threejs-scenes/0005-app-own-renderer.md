---
title: createApp can be handed a renderer it did not build
kind: feat
base: 3.0.0
released:
---

`createApp` always builds its own `WebGLRenderer` through `createRenderer`. A scene written
with three's node materials (TSL) needs three's `WebGPURenderer` instead, which this library
does not construct, takes different options, and has to be awaited (`await renderer.init()`)
before its first frame. The only way to use one with the app shell was to give up the shell.

Seen in scenery (2026-11-24), moving its shaders to TSL: the world keeps the app's clock,
store, modules and `renderOn: 'step'`, and wants nothing changed but who makes the renderer.

One addition, opt-in:

- `rendererInstance`: a renderer the caller built and, if it needs it, initialised. The app
  sizes it to the canvas parent under the same pixel limits (`renderer.pixelRatioMax`,
  `renderer.maxPixels`), hands it to the modules as `ctx.renderer`, renders with it and
  disposes it. Everything else about it (tone mapping, colour space, shadows) is the
  caller's. Without the option, `createRenderer` is called exactly as in 3.0.0.

A renderer with no synchronous `compile` (WebGPURenderer compiles as it first draws) is not
asked to pre-compile. Covered by scenery's gate: the page boots, draws and is captured through
a renderer handed in this way.

## lib/core/app.ts

```ts find
import { createRenderer, attachResizeObserver } from './renderer.js'
```

```ts replace
import { createRenderer, attachResizeObserver, pixelRatioFor } from './renderer.js'
```

```ts find
  /** Renderer factory options forwarded to `createRenderer` (minus `canvas`). */
  renderer?: Omit<RendererOptions, 'canvas'>
```

```ts replace
  /** Renderer factory options forwarded to `createRenderer` (minus `canvas`). */
  renderer?: Omit<RendererOptions, 'canvas'>

  /**
   * A renderer the caller built, used instead of one from `createRenderer`:
   * for a renderer this library does not construct, such as three's
   * `WebGPURenderer` (initialise it first). The app sizes it under
   * `renderer.pixelRatioMax` and `renderer.maxPixels`, renders with it and
   * disposes it; its tone mapping, colour space and shadows are the caller's.
   */
  rendererInstance?: THREE.WebGLRenderer
```

```ts find
  renderer: rendererOptions,
  camera: cameraOptions,
```

```ts replace
  renderer: rendererOptions,
  rendererInstance,
  camera: cameraOptions,
```

```ts find
  const renderer   = createRenderer({ canvas, ...rendererOptions })
```

```ts replace
  const renderer = rendererInstance ?? createRenderer({ canvas, ...rendererOptions })

  if (rendererInstance) {
    const parent = canvas.parentElement ?? document.body

    renderer.setPixelRatio(pixelRatioFor(parent.clientWidth, parent.clientHeight, rendererOptions))
    renderer.setSize(parent.clientWidth, parent.clientHeight, false)
  }

```

```ts find
  renderer.compile(scene, camera)
```

```ts replace

  // A renderer handed in may have no synchronous compile: three's
  // WebGPURenderer compiles as it first draws.
  if (typeof renderer.compile === 'function')
    renderer.compile(scene, camera)
```
