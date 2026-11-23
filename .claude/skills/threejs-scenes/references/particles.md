# Particles

Particle systems without WebGPU compute shaders.

## Sizing Strategy

| Count | Approach | API |
|-------|----------|-----|
| < 50k | CPU-simulated, GPU-billboarded instanced quads | `createEmitter` |
| 50k–1M+ | GPGPU ping-pong; positions live in float textures | `createGpuEmitter` |
| any, fixed motion | everything in the vertex shader from per-particle attributes | own `ShaderMaterial` |

```ts
import { createEmitter, createGpuEmitter, sampleCurve, bakeCurve } from 'threejs-scenes/raster'
```

(`createEmitter` and `createGpuEmitter` are also exported from the root `threejs-scenes`.)

## createEmitter (CPU, v2)

```ts
const rng = ctx.rng.fork('embers')
const embers = createEmitter({
  capacity:  2000,
  rate:      120,                                   // particles / second
  bursts:    [ { time: 0, count: 200 } ],
  lifetime:  [ 1.2, 2.4 ],                          // [min, max] seconds
  shape:     { kind: 'cone', angle: 0.4, radius: 0.5 },
  speed:     [ 0.6, 1.6 ],
  gravity:   [ 0, 0.4, 0 ],
  damping:   0.99,
  size:      0.12,
  sizeCurve: [ [ 0, 0.4 ], [ 0.2, 1 ], [ 1, 0 ] ],            // over lifetime
  color:     [ [ 0, '#ffd27a' ], [ 1, '#ff4a1a' ] ],
  alphaCurve: [ [ 0, 0 ], [ 0.1, 1 ], [ 0.7, 1 ], [ 1, 0 ] ],
  blending:  'additive',
  seed:      rng.int(1, 0x7fffffff),
})
ctx.scene.add(embers.object)
// update (_s, frame): embers.tick(frame)   // uses frame.delta
// also: embers.burst(n), embers.setRate(r), embers.dispose()
```

`EmitterShape` is one of `{ kind: 'point' }`, `{ kind: 'sphere', radius, shell? }`,
`{ kind: 'box', size: [x, y, z] }`, `{ kind: 'cone', angle, radius? }`,
`{ kind: 'disc', radius }`. Curves are `[t, value][]` (scalar) and `[t, colour][]` (colour),
baked into a lookup texture. Spawn randomness is hashed from `(seed, slot, cycle)`, so the
same seed and the same tick sequence give the same particles regardless of cadence.

Remove the object and call `dispose()` in the module's `dispose()`.

## createGpuEmitter (GPGPU, v2)

```ts
const motes = createGpuEmitter(ctx.renderer, { capacity: 200_000, shape: { kind: 'box', size: [ 40, 8, 40 ] }, seed })
```

Takes the CPU options minus `rate`, `bursts`, `rotation`. Capacity rounds up to a square
texture; it degrades to the CPU emitter when float render targets are unavailable. Same
`object` / `tick(frame)` / `dispose()` contract.

## Hand-rolled GPGPU Ping-Pong (100k+)

`GPUComputationRenderer` simulates particle physics by rendering to a `WebGLRenderTarget`
whose pixels hold position/velocity data. Each tick:

1. Read the previous frame's render target as input texture.
2. Run a fragment shader that updates position/velocity per fragment (one fragment = one
   particle).
3. Write the result to a new render target.
4. Swap.

Then a regular `Points` material samples the position texture in its vertex shader.

```ts
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'

const width = 512   // 512×512 = 262144 particles
const gpgpu = new GPUComputationRenderer(width, width, ctx.renderer)
const rng = ctx.rng.fork('gpgpu')

const positionTexture = gpgpu.createTexture()
const velocityTexture = gpgpu.createTexture()

const posArray = positionTexture.image.data as Float32Array
for (let i = 0; i < posArray.length; i += 4) {
  posArray[i + 0] = rng.range(-5, 5)   // x
  posArray[i + 1] = rng.range(-5, 5)   // y
  posArray[i + 2] = rng.range(-5, 5)   // z
  posArray[i + 3] = 1                  // life
}

const positionVar = gpgpu.addVariable('texturePosition', positionFragmentShader, positionTexture)
const velocityVar = gpgpu.addVariable('textureVelocity', velocityFragmentShader, velocityTexture)
gpgpu.setVariableDependencies(positionVar, [ positionVar, velocityVar ])
gpgpu.setVariableDependencies(velocityVar, [ positionVar, velocityVar ])

positionVar.material.uniforms.uTime = { value: 0 }
velocityVar.material.uniforms.uTime = { value: 0 }

const err = gpgpu.init()
if (err !== null) console.error(err)

// update (_s, frame)
positionVar.material.uniforms.uTime.value = frame.frame * STEP
gpgpu.compute()
pointsMaterial.uniforms.uPositionTexture.value = gpgpu.getCurrentRenderTarget(positionVar).texture
```

The render `Points` material samples that position texture:

```glsl
// vertex (ShaderMaterial)
uniform sampler2D uPositionTexture;
attribute vec2 aRef;   // particle's UV in the position texture
void main () {
  vec3 pos = texture2D(uPositionTexture, aRef).xyz;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 4.0 * (1.0 / -mv.z);
}
```

Dispose the `GPUComputationRenderer`'s variables' render targets and materials and the
`Points` geometry/material in `dispose()`.

## Sprite Rendering Tips

- Disable `depthWrite`, keep `depthTest` on for soft sort.
- `AdditiveBlending` for sparks/embers; `NormalBlending` with premultiplied alpha for
  smoke/clouds.
- Sort back-to-front only when truly translucent and depth-fighting; sorting kills perf on
  huge counts.
- Use a 1-channel alpha texture or signed-distance-field sprite to avoid sampler
  bandwidth; generate it procedurally (a radial `CanvasTexture`) rather than loading one.

## Pre-Computed Behavior

If particle motion is deterministic (linear trajectories, gravity), compute the entire
flight in the vertex shader from `aSpawnPos`, `aVelocity`, `aBirthTime` attributes:

```glsl
attribute vec3 aSpawnPos;
attribute vec3 aVelocity;
attribute float aBirthTime;
uniform float uTime;
void main () {
  float age = uTime - aBirthTime;
  vec3 pos = aSpawnPos + aVelocity * age + vec3(0.0, -4.9, 0.0) * age * age;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
```

This needs zero per-frame JS work — set the attributes once (from the seeded stream),
animate via `uTime = frame.frame * STEP`. Cheapest particle pattern in three.js.

## Common Pitfalls

- Writing `attribute.needsUpdate = true` for every frame on a huge buffer — uploads the
  entire array every frame. Upload a sub-range with `attribute.addUpdateRange(start, count)`.
- Using `Sprite` (not `Points` / `InstancedMesh`) for 10k+ particles — each `Sprite` is one
  draw call.
- Forgetting `depthWrite: false` on transparent particles — they occlude themselves and
  cause visual sorting bugs.
- Drawing randomness per particle per frame on the CPU — pre-bake it into attributes once.
