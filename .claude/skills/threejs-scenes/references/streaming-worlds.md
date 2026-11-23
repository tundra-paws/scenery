# Streaming worlds

How to build worlds that extend as the camera moves without dying: chunk streaming, pooling,
origin rebasing. (Distilled from the isometric / infinite-scene notes; the orthographic
camera math is dropped because this world is perspective, and the camera rig is framework
code.)

## Three Rules for Infinite Scenes

1. **Never move the camera infinitely** — `float32` precision rots past ~10⁴ units. Keep the
   camera near the origin and translate the world the opposite direction, or rebase
   periodically: when camera distance from origin exceeds a threshold, subtract that offset
   from camera + every chunk position.
2. **Chunk + pool**. Divide the world into fixed-size cells. Maintain a pool of pre-built
   chunk groups; recycle them as the camera moves instead of allocating/disposing.
3. **Content is a function of the cell, not of arrival order.** Give each chunk its own
   stream with ``rng.fork(`chunk:${cx}:${cz}`)`` (a fork depends on the parent's seed and the
   label only) so the same cell always generates the same content, whenever the camera
   reaches it.

## Chunk Manager

```ts
import { createChunkManager } from 'threejs-scenes/compose'

const rng = ctx.rng.fork('terrain')
const chunks = createChunkManager({
  chunkSize: 32,            // world units per chunk edge
  viewRadius: 4,            // chunks visible in any direction → (2r + 1)² chunks
  rebaseThreshold: 4096,    // rebase origin when the passed position exceeds this (default 4096)
  build: (cx, cz, chunk) => {
    const cell = rng.fork(`chunk:${cx}:${cz}`)    // order-independent stream for this cell
    // populate `chunk` (a pooled THREE.Group positioned at the chunk origin)
  },
})
ctx.scene.add(chunks.root)

// update (_s, frame)
void chunks.update(ctx.camera.position)    // returns a Promise; builds start synchronously
// dispose
chunks.dispose()
ctx.scene.remove(chunks.root)
```

What the implementation does (3.0.0):

- `update(cameraWorldPos)` computes the camera's cell, builds the missing chunks of the
  `viewRadius` square and releases the others. `build` is called synchronously, inside
  `update`; if it returns a promise the chunk pops in when that resolves.
- A released chunk has its **geometries disposed** and its children cleared, then goes back
  into the pool. Its **materials are not disposed** — share them across chunks and dispose
  them in your module's `dispose()`.
- Rebasing **mutates the vector you pass** (it subtracts the offset from it) and shifts every
  active chunk. If the rig owns the camera position, pass a copy; keep chunk content keyed by
  `(cx, cz)`, never by raw positions.
- `loadedCount` / `pooledCount` report the active and pooled chunk counts.
  `dispose()` releases every chunk.

Draw calls scale with the chunk count: `(2 × viewRadius + 1)²` chunks × the draw calls each
chunk holds. Budget it against `budgets.json` before choosing `viewRadius`
(`getQualitySettings(tier).chunkViewRadius` is 2 / 4 / 6 for mobile / desktop / highEnd).

## Infinite Ground

```ts
import { createInfiniteGround } from 'threejs-scenes/primitives'

const ground = createInfiniteGround({
  tileSize: 32, gridRadius: 2, segments: 32,
  displace: (x, z) => noise.fbm(x * 0.02, 0, z * 0.02, 4) * 6,    // world coordinates
  material,
})
ctx.scene.add(ground.object)
// update: ground.update(ctx.camera.position)
// anywhere: ground.heightAt(x, z)              // the same displace function
```

A fixed pool of `(2 × gridRadius + 1)²` displaced plane tiles that wrap around the centre:
tiles scrolling out of range are re-displaced on the far side. Displacement samples world
coordinates so seams line up. It is one mesh per tile, so five-by-five is 25 draw calls.
`displace` must be pure. Use `heightAt` to stand props on the terrain.

## Batching a chunk

Keep a chunk to a handful of draw calls: one `InstancedMesh` / `BatchedMesh` per material.

```ts
const fields = new Set<THREE.InstancedMesh>()          // everything we must free ourselves

build: (cx, cz, chunk) => {
  const cell = rng.fork(`chunk:${cx}:${cz}`)
  const field = createInstancedField({
    geometry: treeGeometry, material: sharedTreeMaterial, count: 40, radius: 16,
    seed: cell.int(1, 0x7fffffff),
  })
  field.frustumCulled = true                           // chunk-sized field: let it cull
  field.computeBoundingSphere()
  fields.add(field)
  chunk.add(field)
}
// dispose (): for (const f of fields) f.dispose(); then dispose treeGeometry and the material
```

The manager disposes the `.geometry` of every mesh in a released chunk and clears the group;
it never calls `InstancedMesh.dispose()`, so track the instanced meshes you create and
dispose them yourself (above). A geometry shared across chunks is disposed on each release
too; three re-uploads it on next use, so it stays correct but churns. (`createInstancedField`
sets `frustumCulled = false`, which suits a field covering a huge area, not a chunk.)

## Pooling

- Reuse chunk groups (the manager does) and share geometry and materials across chunks.
- Keep geometry that is identical for every chunk (a tree, a rock) as one shared
  `BufferGeometry` created once in `build`/the factory and disposed once in `dispose()`.
- Anything you cache across chunks is yours to dispose; the manager only knows `.geometry`.

## Perf Checklist

- Clamp the chunk view radius by tier; mobile gets `viewRadius - 2`.
- Mark whole chunks invisible (`group.visible = false`) instead of testing every child.
- Fade chunks in with fog, not with pop-in: match `scene.fog` far to the view distance.
- Keep generated chunk geometry cheap (flat-shaded, low segment counts).
- Do not generate off-thread by default. Worker results arrive on an arbitrary tick, so a
  capture stepped by `app.tick()` would differ run to run, and a worker cannot import
  `three` (import maps do not apply there). If it is ever justified, the worker builds plain
  typed arrays (`positions`, `indices`, `normals`, transferred with `postMessage(data, [buffer])`),
  the main thread wraps them in a `BufferGeometry`, and the result is applied at a
  state-gated point rather than on arrival.

## Common Pitfalls

- Letting the camera fly forever in world space — float precision rots, jitter appears around
  10⁴ units.
- Building chunks over several frames with random completion order — non-deterministic.
- Disposing and reallocating chunk meshes each move instead of pooling.
- Seeding chunk content from a shared stream consumed in visit order — use `hash2(cx, cz)`.
- Disposing a material that other chunks still use.
