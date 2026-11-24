---
title: createRenderer can cap the drawing buffer by pixel count
kind: feat
base: 3.0.0
released:
---

`createRenderer` caps the pixel *ratio*. What a frame costs to fill is the pixel *count*, and
the two part ways on a large window: at a ratio of 2, a 1737 × 1130 window is a 3474 × 2260
buffer, 7.9 million pixels, antialiased (the window in a profile of scenery, 2026-11-24). A
fast GPU absorbs that. Nothing bounded it for a slow one.

- `maxPixels` lowers the ratio until width × height × ratio² fits. Unset, nothing changes.
- `pixelRatioFor(width, height, limits)` is the rule as a function, exported so an app that
  sizes its own render targets can ask the same question.
- `attachResizeObserver` takes the limits and applies them on every resize, since the budget
  depends on the size. `createApp` passes its renderer options through. Without `maxPixels`
  it leaves the ratio alone, as before.

Written on top of `0003-app-render-on-step` (it edits the resize call that entry rewrites).

## lib/core/renderer.ts

```ts find
  pixelRatioMax?: number
```

```ts replace
  pixelRatioMax?: number

  /**
   * Upper bound on the drawing buffer in device pixels (width × height). The
   * pixel ratio is lowered until the buffer fits, so a very large window costs
   * no more to fill than this many pixels.
   * @defaultValue unlimited
   */
  maxPixels?: number
```

```ts find
/**
 * Create a `WebGLRenderer` with production defaults: high-performance power
```

```ts replace
/**
 * The pixel ratio to render a `width` × `height` CSS-pixel canvas at: the
 * device's, capped at `pixelRatioMax`, and lowered further if the drawing
 * buffer would otherwise hold more than `maxPixels` device pixels.
 *
 * @param devicePixelRatio - Defaults to the window's. Pass it to ask about
 * another display, or outside a browser.
 */
export function pixelRatioFor (
  width: number,
  height: number,
  { pixelRatioMax = 2, maxPixels = Infinity }: Pick<RendererOptions, 'pixelRatioMax' | 'maxPixels'> = {},
  devicePixelRatio: number = window.devicePixelRatio,
): number {
  const ratio  = Math.min(devicePixelRatio, pixelRatioMax)
  const pixels = width * height * ratio * ratio

  return pixels > maxPixels ? ratio * Math.sqrt(maxPixels / pixels) : ratio
}

/**
 * Create a `WebGLRenderer` with production defaults: high-performance power
```

```ts find
  pixelRatioMax = 2,
  shadows = true,
```

```ts replace
  pixelRatioMax = 2,
  maxPixels,
  shadows = true,
```

```ts find
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioMax))

  const parent = canvas.parentElement ?? document.body
  renderer.setSize(parent.clientWidth, parent.clientHeight, false)
```

```ts replace
  const parent = canvas.parentElement ?? document.body
  renderer.setPixelRatio(pixelRatioFor(parent.clientWidth, parent.clientHeight, { pixelRatioMax, maxPixels }))
  renderer.setSize(parent.clientWidth, parent.clientHeight, false)
```

```ts find
 * `onResize` then runs for app-level work (ortho frustums, composers).
 *
 * @returns Detach function that disconnects the observer.
 */
export function attachResizeObserver (
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  onResize?: ResizeHandler,
): () => void {
```

```ts replace
 * `onResize` then runs for app-level work (ortho frustums, composers).
 *
 * @param limits - The renderer's pixel limits. With `maxPixels` set, the pixel
 * ratio is worked out again for every new size; without it the ratio is left
 * as it is.
 * @returns Detach function that disconnects the observer.
 */
export function attachResizeObserver (
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  onResize?: ResizeHandler,
  limits?: Pick<RendererOptions, 'pixelRatioMax' | 'maxPixels'>,
): () => void {
```

```ts find
    const { width, height } = entry.contentRect
    renderer.setSize(width, height, false)
```

```ts replace
    const { width, height } = entry.contentRect
    if (limits?.maxPixels !== undefined)
      renderer.setPixelRatio(pixelRatioFor(width, height, limits))
    renderer.setSize(width, height, false)
```

## lib/core/app.ts

```ts find
    dirty = true
    onResize?.(width, height)
  })
```

```ts replace
    dirty = true
    onResize?.(width, height)
  }, rendererOptions)
```

## lib/index.ts

```ts find
export { createRenderer, attachResizeObserver } from './core/renderer.js'
```

```ts replace
export { createRenderer, attachResizeObserver, pixelRatioFor } from './core/renderer.js'
```
