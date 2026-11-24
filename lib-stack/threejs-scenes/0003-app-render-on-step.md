---
title: createApp can skip the render on a frame where nothing stepped
kind: perf
base: 3.0.0
released:
---

`createApp`'s `pump` advances the clock, runs zero or more simulation steps, then always
renders. With `createClock({ mode: 'fixed', step: 1 / 60 })` on a 120 Hz display every second
animation frame runs no step and draws the picture that is already on screen.

Seen in a profile of scenery (Firefox 162, 120 Hz, 2026-11-24): 840 animation frames in 7.0 s,
every sample inside `step` on an even-numbered frame (23 of 23), samples inside
`renderer.render` on both (91 even, 102 odd). The compositor's render thread was busy 51% of
the time presenting them.

Measured after, in Chromium with the display's rate limit off, on a world that steps 60 times
a second: 749 renders a second with `renderOn: 'frame'`, 57 with `'step'`.

Three additions, all opt-in, so an app that animates through `ctx.loop` on raw frame deltas
still gets a render per frame unless it asks otherwise:

- `renderOn: 'step'` skips the render on a frame whose clock emitted no step. The default,
  `'frame'`, is the behaviour of 3.0.0.
- `app.invalidate()` asks for the next frame to render regardless: for a camera moved by an
  input handler, or anything else changed outside a module's `update`. A resize invalidates by
  itself, because `setSize` clears the canvas. An explicit `app.tick()` always renders.
- `fps` is forwarded to `createFrameLoop`, which already supports a cap that `createApp` gave
  no way to reach.

## lib/core/app.ts

```ts find
  /** Injectable time source. Pass createClock({ mode: 'fixed' }) for determinism. */
  clock?: Clock
```

```ts replace
  /** Injectable time source. Pass createClock({ mode: 'fixed' }) for determinism. */
  clock?: Clock

  /**
   * Cap the frame loop at this many frames a second. The cap is set on the
   * loop every app on the page shares, so it applies to all of them.
   * @defaultValue uncapped: one frame per display refresh
   */
  fps?: number

  /**
   * When a frame is drawn. `'frame'` renders on every animation frame.
   * `'step'` renders only on a frame where the clock emitted a simulation
   * step or something called `invalidate()`: with a fixed clock on a display
   * faster than the step, the frames in between would repeat the last picture.
   * @defaultValue 'frame'
   */
  renderOn?: 'frame' | 'step'
```

```ts find
  /** Detach from the frame loop; state and scene stay intact. */
  stop (): void
}
```

```ts replace
  /** Detach from the frame loop; state and scene stay intact. */
  stop (): void

  /**
   * Ask for a render on the next frame even if the simulation does not step.
   * Only matters with `renderOn: 'step'`: call it after changing the picture
   * outside a module's `update` (a camera moved by an input handler, a
   * uniform set from the page).
   */
  invalidate (): void
}
```

```ts find
  clock = createClock(),
  renderer: rendererOptions,
```

```ts replace
  clock = createClock(),
  fps,
  renderOn = 'frame',
  renderer: rendererOptions,
```

```ts find
  const loop   = createFrameLoop()
```

```ts replace
  const loop   = createFrameLoop({ fps })
```

```ts find
  const detachResize = attachResizeObserver(renderer, camera, canvas, onResize)
```

```ts replace
  // The picture is stale for a reason other than a simulation step: nothing
  // has been drawn yet, the canvas was resized (which clears it), or the app
  // said so through invalidate().
  let dirty = true

  const detachResize = attachResizeObserver(renderer, camera, canvas, (width, height) => {
    dirty = true
    onResize?.(width, height)
  })
```

```ts find
  function pump (realDelta: number): void {
    for (const delta of clock.advance(realDelta))
      step(delta)
    if (render)
```

```ts replace
  function pump (realDelta: number): void {
    const steps = clock.advance(realDelta)
    for (const delta of steps)
      step(delta)

    // A fixed clock emits no step on some frames of a display faster than its
    // step. Nothing moved, so the frame on screen is still the right one.
    if (renderOn === 'step' && steps.length === 0 && !dirty)
      return
    dirty = false

    if (render)
```

```ts find
    tick (realDelta = 1 / 60) {
      pump(realDelta)
    },
    start: () => loop.start(),
    stop:  () => loop.stop(),
```

```ts replace
    tick (realDelta = 1 / 60) {
      // asked for by name, so it always draws
      dirty = true
      pump(realDelta)
    },
    start: () => loop.start(),
    stop:  () => loop.stop(),
    invalidate () {
      dirty = true
    },
```

```ts find
// Fixed-clock mode may run 0..maxSubSteps sim ticks per rAF but still renders once.
```

```ts replace
// Fixed-clock mode may run 0..maxSubSteps sim ticks per rAF and renders once;
// with renderOn: 'step', not at all on a frame with no tick and nothing invalidated.
```
