# Props & factories

A **prop** bundles an `Object3D` with optional animation clips, embedded light sources,
and an instancing hint behind one declarative definition. From `threejs-scenes/compose`
(`defineProp`, `createProp`, `createInstancedProp`, `createPropComposite`, and the registry
functions; `defineProp`, `createProp`, `createInstancedProp` and `createPropComposite` are
also on the root).

## defineProp + createProp

```ts
import { defineProp, createProp, spinClip, bobClip } from 'threejs-scenes/compose'

const crystal = defineProp({
  name:   'crystal',
  build:  (_pc) => new THREE.Mesh(geo, mat),                       // _pc: PropContext { rng?, loop? }
  lights: (_root) => [ new THREE.PointLight('#79f7ff', 6, 6) ],
  clips:  (_root) => [ spinClip('y', 4), bobClip(0.25, 2) ],
})

// pass ONLY the rng: a PropContext without `loop` keeps the prop off ctx.loop
const inst = createProp(crystal, { rng: ctx.rng.fork('crystal') }, { autoplay: true })
ctx.scene.add(inst.object)
// inst = { object, controller?, lights, dispose }

// update (_s, frame):
inst.controller?.tick(frame)       // the controller only advances when you tick it
// dispose:
inst.object.removeFromParent()
inst.dispose()
```

**Do not pass the whole `SceneContext` to `createProp`.** A `SceneContext` satisfies
`PropContext`, and when `ctx.loop` is present `createProp` registers the animation
controller on it, which runs on raw frame deltas outside the fixed clock. Pass
`{ rng: ctx.rng.fork(name) }` (no `loop`) and tick `inst.controller` from the module's
`update`. Declared `lights` are parented under the object. By default every clip plays
looping.

`createProp(...).dispose()` disposes the controller, lights and `disposeScene(object)` —
which includes any shared or pooled material the prop used. Build props from materials
they own, or detach shared ones before disposing.

## Resolving props by source

```ts
import { registerProp, resolveProp, createPropRegistry } from 'threejs-scenes/compose'

registerProp('tree', treeFactory)
const a = await resolveProp(treeFactory, pc)        // a factory object
const b = await resolveProp('tree', pc)             // a registered name
```

`resolveProp` always returns `Promise<PropInstance>`; `registry.resolve(src)` is the
per-registry form (`createPropRegistry()` returns `{ register, get, resolve }`). Because it is
asynchronous, a feature whose output must be present on tick 0 builds its props
synchronously with `createProp` instead.

## Instancing a prop

```ts
import { createInstancedProp } from 'threejs-scenes/compose'

const forest = createInstancedProp(treeFactory, { count: 120, radius: 12, seed: rng.int(1, 0x7fffffff) }, { rng })
ctx.scene.add(forest.object)   // single-mesh prop → ONE InstancedMesh draw call
// forest = { object, dispose }
```

If the prop builds to a single `Mesh`, it routes through `createInstancedField` (one draw
call for the whole field). Otherwise it falls back to cloning the built group per instance —
fine for low counts, but keep the prop a single mesh if you want it cheap. Pass a
`place(index, rng, object, color)` callback for custom layout.

## Composites

```ts
import { createPropComposite } from 'threejs-scenes/compose'

const lamp = createPropComposite([
  { prop: post, position: [ 0, 0, 0 ] },
  { prop: bulb, position: [ 0, 2, 0 ] },
])
ctx.scene.add(lamp.object)
lamp.dispose()   // disposes every part exactly once
```

`CompositePart` is `{ prop: PropInstance, position?, rotation?, scale? }` — parts are
already-created `PropInstance`s. A composite is just a `Group` — no extra draw cost. Each
part keeps its own controller (tick each from `update`); disposing the composite disposes
all parts.

## Disposal contract

Every `PropInstance` / composite owns what it built. Call `dispose()` on teardown; it frees
the controller, geometry/materials and lights. Props built from shared/pooled materials
should not dispose those — keep shared materials out of the prop's `build`, or pool them
and dispose the prop's geometry yourself.
