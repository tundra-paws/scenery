# Billboards

Camera-facing planes for sprites, trees, particles, markers.

## When to Use Each

- **`THREE.Sprite`** (built-in) — easy. Each sprite faces the camera, scales in screen
  space. Cost: one draw call per sprite unless batched. Use for < 100 sprites or simple
  markers.
- **Shader-based quad billboard on `InstancedMesh`** — fastest. One draw call for 100k+
  billboards. Use for grass, foliage cards, particle quads, far-distance decoration.
  (`createEmitter` in `particles.md` already is this for particles.)
- **`THREE.Points`** with a sprite texture — cheapest for tiny dots / stars / spark
  particles. Limited control over per-particle rotation.
- **Cylindrical billboard** (y-axis only) for trees/grass.
- **Spherical billboard** for markers and foliage cards that should always face the camera
  fully.

## GLSL Billboarding Math

The trick: in the vertex shader, take the instance center, build right/up vectors
orthogonal to the camera-to-instance direction, then offset the local quad vertex along
those axes. With a `ShaderMaterial` on an `InstancedMesh` the built-ins (`position`,
`modelViewMatrix`, `instanceMatrix`, `cameraPosition`) are already declared; only your own
attributes and uniforms are.

```glsl
// vertex shader — spherical billboard on a unit PlaneGeometry in an InstancedMesh
varying vec2 vUv;

void main () {
  vUv = position.xy + 0.5;
  // instance centre and scale come from the instance matrix
  vec3 center = instanceMatrix[3].xyz;
  vec2 scale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  // offset in view space → always faces the camera
  vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
  vec4 viewPos = viewCenter + vec4(position.xy * scale, 0.0, 0.0);
  gl_Position = projectionMatrix * viewPos;
}
```

Cylindrical (y-axis only): do it in world space and keep `up` fixed.

```glsl
void main () {
  vUv = position.xy + 0.5;
  vec3 center = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  vec2 scale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  vec3 toCam = cameraPosition - center;
  toCam.y = 0.0;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, toCam));
  vec3 world = center + right * position.x * scale.x + up * position.y * scale.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
```

For a `RawShaderMaterial` declare the attributes and uniforms yourself.

## Distance Fade

Fade billboards to alpha 0 near + far to avoid abrupt pop. Compute `smoothstep` on the
camera distance (a varying from the vertex shader) inside the fragment shader:

```glsl
uniform float uNearFade, uFarFade;
varying float vDistance;

float fade = smoothstep(uNearFade - 1.0, uNearFade, vDistance)
           * (1.0 - smoothstep(uFarFade - 5.0, uFarFade, vDistance));
gl_FragColor.a *= fade;
```

A billboard material that should also fog must include three's fog chunks (see
`shaders.md`).

## Atlas Sprites

For multiple sprite variants in one batch, pack into a texture atlas and use an
`aSpriteIndex` per-instance attribute to compute the atlas UV in the fragment shader (same
pattern as voxel atlasing — see `voxel-geometry.md`). Paint the atlas procedurally
(`createProceduralTexture`).

## Soft Particles

Hard quad edges look bad against scene geometry. Soft particles fade alpha based on the
depth difference between the quad fragment and the scene behind it:

```glsl
uniform sampler2D uSceneDepth;
uniform float uSoftness;
uniform vec2 uResolution;

float sceneDepth = texture2D(uSceneDepth, gl_FragCoord.xy / uResolution).r;
float quadDepth = gl_FragCoord.z;
float diff = (sceneDepth - quadDepth) * uSoftness;
gl_FragColor.a *= smoothstep(0.0, 1.0, diff);
```

Needs a `DepthTexture` bound on the main render target (see `post-processing.md`).

## Common Pitfalls

- Using `Sprite` for 10k+ markers — each is a draw call, FPS dies.
- Forgetting `transparent: true` on the billboard material — alpha cutoff breaks soft
  edges.
- `depthWrite: true` on alpha-blended billboards — they occlude each other weirdly; turn
  it off.
- Sorting issues with many overlapping translucent sprites — sort the `InstancedMesh`
  instance buffer back-to-front (expensive but fixes it) or accept the bug for foliage where
  it doesn't matter. An `alphaTest` cutout needs neither.
- Billboard math computed in JS each frame via `lookAt` — slow for high counts; do it in the
  shader.
