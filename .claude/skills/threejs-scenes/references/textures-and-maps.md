# Textures and Maps

Surface texturing with diffuse, normal, ORM-packed maps, UV manipulation, and
runtime-generated textures. Textures here are generated, not downloaded: no remote assets,
and a bundled image only when it cannot be avoided and is small.

## Diffuse / Base Color

The base color channel. Author or generate in sRGB color space; three.js converts to linear
for lighting math automatically.

```ts
albedo.colorSpace = THREE.SRGBColorSpace
albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping
albedo.anisotropy = renderer.capabilities.getMaxAnisotropy()

const material = new THREE.MeshStandardMaterial({ map: albedo })
```

## Normal Map

Surface micro-detail without extra geometry. Always tangent-space (blue/purple). Color
space MUST stay `NoColorSpace` / linear — sRGB conversion destroys normals.

```ts
normalTex.colorSpace = THREE.NoColorSpace

material.normalMap = normalTex
material.normalScale.set(1, 1)
```

## ORM-Packed (Occlusion / Roughness / Metallic)

Pack Occlusion (R), Roughness (G), Metallic (B) into a single texture to halve sampler
count. Standard glTF convention.

```ts
orm.colorSpace = THREE.NoColorSpace

material.aoMap = orm
material.roughnessMap = orm
material.metalnessMap = orm
```

three.js samples the correct channel from `aoMap.r`, `roughnessMap.g`, and `metalnessMap.b`
automatically when you supply the same texture to all three.

## UV Offset and Tiling

`.offset` and `.repeat` on a Texture are baked into the UV transform matrix.

```ts
texture.repeat.set(4, 4)
texture.offset.set(0.25, 0)
```

For animated scroll or per-instance UV offsets, write a custom shader (see `shaders.md`)
and drive the offset from the frame.

## Procedural Texture Generation

For procedural patterns, gradients, noise fields, sprite atlases, or data lookup tables,
generate textures at runtime. Three options ranked by use case:

1. **`DataTexture`** — direct typed-array upload. Best for noise fields, palettes,
   instance lookup tables.
   `createNoiseTexture({ size, frequency, octaves, seed, channels })` from
   `threejs-scenes/primitives` builds a seeded noise `DataTexture` (returns `null` where
   there is no DOM, so degrade to a flat colour).
2. **Canvas2D (`OffscreenCanvas` / `CanvasTexture`)** — best for text labels, simple sprite
   glyphs, dynamic atlases, painted detail maps.
   `createProceduralTexture(key, paint, size?)` and `createTextureCache()` from
   `threejs-scenes/compose` paint once and cache by key; `paint` receives
   `(ctx2d, size)`. Draw with seeded randomness only.
3. **Render to a `WebGLRenderTarget`** — best for animated procedural textures (curl noise
   advection, flow maps, reaction-diffusion). Render a fullscreen quad with a
   `ShaderMaterial` into the target, then sample the target as a regular texture.

```ts
// near-white detail map: palette colour × detail keeps the saturation
const detail = createProceduralTexture('grass-detail', (c, size) => {
  const rand = mulberry32(seed)
  c.fillStyle = '#f2f2f2'
  c.fillRect(0, 0, size, size)
  for (let i = 0; i < 600; i++) {
    c.fillStyle = `rgba(200,200,200,${0.15 + rand() * 0.25})`
    c.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 3 + rand() * 6)
  }
}, 256)
if (detail) { detail.wrapS = detail.wrapT = THREE.RepeatWrapping; material.map = detail }
```

The shared cache (`proceduralTextureCache`) owns what it creates: do not dispose a cached
texture from a feature; create your own `CanvasTexture` and dispose it when the feature
must free it.

## Render-Target Procedural Textures

```ts
const target = new THREE.WebGLRenderTarget(512, 512, {
  format: THREE.RGBAFormat,
  type: THREE.FloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
})

const quadScene = new THREE.Scene()
const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const quad = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }),
)
quadScene.add(quad)

const previous = renderer.getRenderTarget()
renderer.setRenderTarget(target)
renderer.render(quadScene, quadCamera)
renderer.setRenderTarget(previous)

material.map = target.texture
```

## Filtering and Anisotropy

- `LinearFilter` / `LinearMipmapLinearFilter` (trilinear) — default, good for most surfaces.
- `NearestFilter` — pixelated look, voxel/retro aesthetics.
- `anisotropy = renderer.capabilities.getMaxAnisotropy()` — sharpens textures viewed at
  grazing angles (ground planes).

## Memory Footprint

Texture memory dominates GPU memory. A 4K RGBA mipmapped texture = ~85 MB. Keep generated
textures small; uncompressed is fine for procedural data textures at that size. If a binary
asset is unavoidable, a compressed `KTX2` file bundled with the repo is 4–8× smaller than
PNG (`KTX2Loader` from `three/addons/loaders/KTX2Loader.js` needs its transcoder files
served locally — no CDN).

## Common Pitfalls

- Wrong `colorSpace` on normal/ORM maps washes out lighting.
- Forgetting `texture.needsUpdate = true` after mutating a `DataTexture` array or painting a
  `CanvasTexture` again.
- Mipmaps on `DataTexture` with `NearestFilter` — disable with
  `texture.generateMipmaps = false`.
- Setting `anisotropy` to a value larger than `getMaxAnisotropy()` returns — silently capped.
- Painting canvas textures with `Math.random()` — use the seeded stream.
