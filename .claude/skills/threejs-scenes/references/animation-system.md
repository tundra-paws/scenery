# Animation system

A convenience layer over three's `AnimationMixer` / `AnimationClip` / `AnimationAction`,
from `threejs-scenes/compose` (`createAnimationController` and the clip helpers are also on
the root).

## Controller

```ts
import { createAnimationController, spinClip, bobClip } from 'threejs-scenes/compose'

const ctrl = createAnimationController(root, [ spinClip('y', 4), bobClip(0.3, 2) ])
ctrl.play('spin', { loop: THREE.LoopRepeat })
ctrl.crossfade('spin', 'bob', 0.6)
// { mixer, actions, play, crossfade, stop, tick, dispose }

// update (_s, frame):
ctrl.tick(frame)                  // advances the mixer by frame.delta
// dispose:
ctrl.dispose()
```

- `createAnimationController(root, clips?, loop?)` builds a mixer and caches one action per
  clip name. **Leave `loop` out.** With a `FrameLoop` it would auto-register
  `mixer.update(delta)` on `ctx.loop`, which is off limits in this repo (raw deltas,
  outside the fixed clock). Call `ctrl.tick(frame)` from the module's `update` instead.
- `play(name, opts)` — `opts: { loop, fadeIn, reset, clampWhenFinished, timeScale }`.
- `crossfade(from, to, dur)` — blends actions; resets + plays the target.
- `dispose()` — unregisters, stops actions, `uncacheRoot`s the mixer. Always call it;
  mixers hold references.

## Programmatic clips

Author `AnimationClip`s in code — no imported model required:

```ts
import { spinClip, bobClip, pulseScaleClip, combineClips } from 'threejs-scenes/compose'

spinClip(axis = 'y', duration = 4, name?)             // seamless 360° rotation
bobClip(amp = 0.3, duration = 2, name?)               // vertical sine bob
pulseScaleClip(min = 0.9, max = 1.1, duration = 1.5, name?)
combineClips('idle', [ bobClip(0.4, 2), pulseScaleClip(0.9, 1.1, 2) ])  // merge tracks
```

Lower-level track constructors for custom motion:

```ts
import { numberTrack, vectorTrack, quaternionTrack, trackFromKeyframes, clipFromTracks } from 'threejs-scenes/compose'

const track = vectorTrack('.position', [ 0, 1, 2 ], [ 0, 0, 0,  0, 2, 0,  0, 0, 0 ])
const clip  = clipFromTracks('hop', 2, [ track ])
```

`trackFromKeyframes({ path, times, values, type? })` takes a `TrackSpec`.

## Playing a model's animations

```ts
import { loadGLTF, createAnimationController } from 'threejs-scenes/compose'

const { scene: model, animations } = await loadGLTF('models/robot.glb')   // a bundled file
const ctrl = createAnimationController(model, animations)
ctrl.play(animations[0].name, { loop: THREE.LoopRepeat })
```

`loadGLTF` (and `loadModel`, `createGLTFLoader`) wrap `GLTFLoader` and lazily wire the
optional DRACO / KTX2 / meshopt decoders. Loading is asynchronous: only use it for a bundled
asset that is ready before the app is built, never as something that lands mid-run.

## Perf

One mixer per animated root. `mixer.update` is cheap; cost scales with active tracks.
Crossfades blend on the CPU and free the faded-out action. Dispose controllers on teardown —
see `production-lessons.md` on disposal.
