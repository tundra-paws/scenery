# Shaders

Custom GLSL via `ShaderMaterial` and `RawShaderMaterial`. WebGL2 only; no TSL, no node
materials.

## Philosophy

Treat shaders as composable units. Each material factory takes typed options and returns
a `ShaderMaterial` with named uniforms. Reuse GLSL chunks (noise, easing, math helpers)
via template literal imports.

## ShaderMaterial vs RawShaderMaterial

- **`ShaderMaterial`** — three.js injects its built-in attributes (`position`, `normal`,
  `uv`), uniforms (`modelMatrix`, `viewMatrix`, `projectionMatrix`, `modelViewMatrix`,
  `normalMatrix`, `cameraPosition`), and `#define` flags (`instanceMatrix` under
  instancing). Use this 95% of the time. Do not redeclare those names.
- **`RawShaderMaterial`** — nothing is injected; you write every line, including
  `precision` and every attribute / uniform declaration. Use only when you need full
  control.

## Standard ShaderMaterial Pattern

```ts
// src/world/features/<name>/material.ts
const uniforms = {
  uTime:            { value: 0 },
  uBaseColor:       { value: new THREE.Color('#79f7ff') },
  uFresnelStrength: { value: 2 },
  uScanlineDensity: { value: 40 },
}

const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  vertexShader: /* glsl */`
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main () {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform float uFresnelStrength, uScanlineDensity;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main () {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), uFresnelStrength);
      float scan = sin(vWorldPosition.y * uScanlineDensity + uTime * 2.0) * 0.5 + 0.5;
      vec3 color = uBaseColor * (scan + 0.5) + uBaseColor * fresnel * 2.0;
      gl_FragColor = vec4(color, fresnel * 0.8);
    }
  `,
})
```

The `/* glsl */` annotation enables syntax highlighting in editors.
`createHolographicMaterial()` (`threejs-scenes/primitives`) is this shader prebuilt.

## Fog and tone mapping in custom materials

A custom material that should fog must include three's fog chunks, set `fog: true`, and
merge the fog uniforms. Without them the material ignores `scene.fog` and shows up as a
hard-edged object in the haze.

```ts
const material = new THREE.ShaderMaterial({
  fog: true,
  uniforms: THREE.UniformsUtils.merge([ THREE.UniformsLib.fog, { uTime: { value: 0 } } ]),
  vertexShader: /* glsl */`
    #include <fog_pars_vertex>
    void main () {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: /* glsl */`
    #include <fog_pars_fragment>
    void main () {
      gl_FragColor = vec4(0.4, 0.6, 0.3, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
})
```

`fog_vertex` reads a variable named `mvPosition`; `fog_fragment` writes `gl_FragColor.rgb`
and must come last. `tonemapping_fragment` and `colorspace_fragment` match the built-in
materials when rendering straight to the screen; leave them out when an `OutputPass` does
that job. Instanced draws (`InstancedMesh`) multiply `instanceMatrix` into `mvPosition`
the way the built-in `project_vertex` chunk does.

## Reusable GLSL Chunks

Keep noise, hash, easing, and color-space helpers as exported template literals in a
shared module of the feature (for example `src/world/features/<name>/glsl.ts`) and
inject them into shader strings.

```ts
// src/world/features/<name>/glsl.ts
export const valueNoise3 = /* glsl */`
  float hash3 (vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float valueNoise3 (vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash3(i);
    float n100 = hash3(i + vec3(1, 0, 0));
    float n010 = hash3(i + vec3(0, 1, 0));
    float n110 = hash3(i + vec3(1, 1, 0));
    float n001 = hash3(i + vec3(0, 0, 1));
    float n101 = hash3(i + vec3(1, 0, 1));
    float n011 = hash3(i + vec3(0, 1, 1));
    float n111 = hash3(i + vec3(1, 1, 1));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
`

export const fbm = /* glsl */`
  float fbm (vec3 p, int octaves) {
    float total = 0.0, amp = 0.5, freq = 1.0, norm = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      total += amp * valueNoise3(p * freq);
      norm += amp;
      amp *= 0.5; freq *= 2.0;
    }
    return total / norm;
  }
`
```

Compose: `fragmentShader: /* glsl */\`uniform float uTime; ${valueNoise3} ${fbm} void main () { ... }\``.

## Uniforms

- `{ value: ... }` is the required wrapper shape.
- Mutate `uniform.value` directly each frame; no need for `needsUpdate`.
- `uTime` comes from the frame (`frame.frame * STEP`), never from a wall clock.
- Three.js auto-converts `Color` / `Vector3` / `Matrix4` to uniform-friendly forms.
- For arrays, use `uniform.value = new Float32Array(...)` and declare
  `uniform float uMyArray[16];` in GLSL.
- Naming: `u<Name>` uniforms, `a<Name>` attributes, `v<Name>` varyings.

## Modifying Built-In Materials with `onBeforeCompile`

When you want PBR lighting + small custom tweak, don't write a full ShaderMaterial. Hook
`onBeforeCompile` on `MeshStandardMaterial` (fog, shadows and lights keep working):

```ts
const material = new THREE.MeshStandardMaterial({ color: 0x447777 })
const timeUniform = { value: 0 }

material.onBeforeCompile = shader => {
  shader.uniforms.uTime = timeUniform
  shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
    '#include <begin_vertex>',
    /* glsl */`
      #include <begin_vertex>
      transformed.y += sin(position.x * 4.0 + uTime) * 0.1;
    `,
  )
}

// per tick, from the module's update hook
timeUniform.value = frame.frame * STEP
```

Sharing the uniform object (`timeUniform`) avoids stashing the compiled `shader` on
`userData`.

## Shader Precompilation

The first time three.js renders a new material it compiles the shader on the GPU, which
can stall ~100ms on complex shaders. `createApp` calls `renderer.compile` after the
modules' `build`, so create the materials in `build` and every program is warm before the
first visible frame.

## Common Pitfalls

- Forgetting `transparent: true` when fragment alpha < 1.
- `ShaderMaterial` in WebGL2 is compiled as GLSL ES 3.00 with compatibility defines:
  `gl_FragColor`, `attribute`, `varying` and `texture2D` all work. With
  `glslVersion: THREE.GLSL3` set, those defines are dropped and you declare your own
  `out` variable. `RawShaderMaterial` always needs the full declarations.
- Uniform name mismatches between JS and GLSL (no error, just silent failure).
- Redeclaring `position`, `modelViewMatrix`, etc. in a `ShaderMaterial` — compile error.
- Computing per-fragment work that could be per-vertex (lighting, normal transforms when
  normals don't curve much).
- Sampling a texture in a loop with non-constant index — kills perf and may not compile
  on older drivers.
- A material that should fog but has no fog chunks (see above).
