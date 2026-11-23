# Programmatic Generation

Any time you need more than ~20 entries — geometry vertices, instance transforms, texture
pixels, color palette entries, particle attributes — generate them in code from a
parameterized factory, not a static literal. The factory becomes the design surface.

## Seeded RNG

Every generator takes a `seed: number` option. Same seed → identical output. Critical for
testing, reproducibility, and shipping art that the team can review without re-rolling.

In a feature the seed always comes from the injected rng, never from a literal or the
clock:

```ts
// in build (ctx)
const rng = ctx.rng.fork('rocks')              // SeededRng: next, range, int, pick, fork
const seed = rng.int(1, 0x7fffffff)            // for APIs that take a numeric seed
const rand = () => rng.next()                  // for APIs that take a () => number
```

Library primitives (all from `threejs-scenes/primitives`):

```ts
import {
  createSeededRng, mulberry32, hash2, hash3, lerp, smoothstep,
  createNoise3D, poissonDisk, createNoiseTexture,
} from 'threejs-scenes/primitives'

const rngFn = mulberry32(seed)                 // () => number in [0, 1)
const noise = createNoise3D(seed)              // { sample, fbm, ridged }
noise.fbm(x, 0, z, 4)                          // fbm(x, y, z, octaves?, lacunarity?, gain?)
hash2(cx, cz)                                  // stateless per-cell value in [0, 1), unseeded
```

`hash2` / `hash3` are stateless: use them for cheap jitter keyed by coordinates. For a whole
stream per chunk or tile, fork by cell label (``rng.fork(`chunk:${cx}:${cz}`)``): a fork
depends on the parent's seed and the label only, so the result never depends on the order
cells are visited.

## Procedural Geometry

Pattern:

1. Accept typed options.
2. Build `positions`, `normals`, `indices` arrays.
3. Allocate typed arrays once, set as `BufferAttribute`s.
4. `geometry.computeBoundingSphere()` so frustum culling works.

```ts
// src/world/features/crystals/geometry.ts
export function buildCrystalGeometry ({ sides, height, radius }: CrystalOptions): THREE.BufferGeometry {
  const positions = new Float32Array((sides * 2 + 2) * 3)
  const indices: number[] = []
  // ... fill positions ring by ring, push triangles into indices ...
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
```

## Batch Creation Pattern

Always pair a config schema, a deterministic seed, and a single factory entry point. Same
seed → same scene.

```ts
export function createForestScene (ctx: SceneContext) {
  const rng = ctx.rng.fork('forest')
  return {
    trees: createInstancedTrees({ rng: rng.fork('trees'), count: 5000 }),
    rocks: createBatchedRocks({   rng: rng.fork('rocks'), variantCount: 8, instanceCount: 1200 }),
    grass: createGrassField({     rng: rng.fork('grass'), count: 50000 }),
  }
}
```

Fork per sub-consumer, not `seed + 1`: a fork is label-hashed, so inserting a new
consumer does not shift the others.

## Poisson Disk Sampling

For natural-looking placement (forests, rock fields), Poisson disk beats uniform random. It
guarantees minimum spacing while looking organic.

```ts
const points = poissonDisk({ width: 64, height: 64, minDist: 2.5, rng: rand, k: 30 })
// → Array<[x, y]> in [0, width) × [0, height); map y to z on the ground plane
```

`poissonDisk` consumes `rng` in a fixed order, so the same stream gives the same points.

## Render to Texture

For dynamic textures driven by compute or fullscreen shaders (flow maps, noise fields,
normal maps from heightmaps), render once at build into a `WebGLRenderTarget` and reuse:

```ts
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

const target = new THREE.WebGLRenderTarget(512, 512, { type: THREE.FloatType })
const fsQuad = new FullScreenQuad(material)
const previous = renderer.getRenderTarget()
renderer.setRenderTarget(target)
fsQuad.render(renderer)
renderer.setRenderTarget(previous)
// target.texture is now your generated texture; dispose target, fsQuad and material in dispose()
```

## Determinism Discipline

- The seed is `ctx.rng.fork('<feature name>')`; the label is part of the contract. Renaming
  a fork reshuffles that feature (only that one).
- Generators take their options as a typed object so a change is a diff of numbers.
- Keep generator output a pure function of `(seed, options)`: no reads of the clock,
  `navigator`, window size, or pointer.

## Common Pitfalls

- Using `Math.random()` directly instead of the seeded rng — lint error, and outputs are
  not reproducible.
- Forgetting `geometry.computeBoundingSphere()` — frustum culling silently fails.
- Allocating arrays with `Array.from({ length: N }, ...)` for typed-array use cases —
  slower than typed-array constructors and triggers extra GC.
- Hand-typing more than ~20 entries — switch to a factory.
- Re-running a non-deterministic generator every reload — wraps it in a cache and confuses
  everyone.
