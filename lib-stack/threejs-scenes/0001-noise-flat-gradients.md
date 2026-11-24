---
title: Simplex sampler reads its gradients from flat tables
kind: perf
base: 3.0.0
released:
---

`createNoise3D().sample` was the hottest function in a profile of scenery's page load: 183 to
189 ms of self time in a 375 ms boot (Firefox 162, Apple M3 Max, 2026-11-24). About 86 ms of
that was picking a gradient and taking its dot product: `perm[…] % 12` per corner, a read of a
row from the `GRAD3` array of arrays, and a call to `dot3`.

This keeps the algorithm and changes how the tables are stored:

- `permMod12` is filled once beside `perm`, so no corner divides.
- The twelve gradients are three typed arrays, one per axis, and the dot product is written out
  where it is used.
- The permutation is built by one module-level `permutation(seed)`, so a second sampler can
  share it.

**The output is bit-identical.** The three products are summed in the same order as `dot3`
summed them, and the permutation is drawn from the same stream. `0001-noise-flat-gradients.test.ts`
holds a copy of the 3.0.0 sampler and compares every value with `toBe`.

Not measured alone. Together with scenery sampling its ground once per grid corner instead of
five times, boot went from 258 ms to 169 ms in headless Chromium (journal, 2026-11-24).

## lib/procedural/noise.ts

```ts find
const GRAD3 = [
  [ 1, 1, 0 ], [ -1, 1, 0 ], [ 1, -1, 0 ], [ -1, -1, 0 ],
  [ 1, 0, 1 ], [ -1, 0, 1 ], [ 1, 0, -1 ], [ -1, 0, -1 ],
  [ 0, 1, 1 ], [ 0, -1, 1 ], [ 0, 1, -1 ], [ 0, -1, -1 ],
] as const
```

```ts replace
// The twelve gradient directions (the midpoints of a cube's edges), one typed
// array per axis: picking a gradient is three reads of a number, not a read of
// a row and three reads into it.
const GRAD_X = new Float64Array([ 1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0 ])
const GRAD_Y = new Float64Array([ 1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1 ])
const GRAD_Z = new Float64Array([ 0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1 ])
```

The helper goes after the interface, where the house lint order wants functions.

```ts find
/**
 * Seeded 3D simplex noise (classic Gustavson, seed-shuffled permutation
```

```ts replace
/**
 * The seed-shuffled permutation table (Fisher-Yates over 0..255, doubled so a
 * lookup never wraps), and the same table modulo 12: the gradient index, read
 * instead of divided out at every corner of every sample.
 */
function permutation (seed: number): { perm: Uint8Array, permMod12: Uint8Array } {
  const rng = mulberry32(seed >>> 0)
  const p   = new Uint8Array(256)
  for (let i = 0; i < 256; i++)
    p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = p[i] as number
    p[i]    = p[j] as number
    p[j]    = t
  }

  const perm      = new Uint8Array(512)
  const permMod12 = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i]      = p[i & 255] as number
    permMod12[i] = (perm[i] as number) % 12
  }

  return { perm, permMod12 }
}

/**
 * Seeded 3D simplex noise (classic Gustavson, seed-shuffled permutation
```

```ts find
  // seed-shuffled permutation table (Fisher-Yates over 0..255, doubled)
  const rng = mulberry32(seed >>> 0)
  const p   = new Uint8Array(256)
  for (let i = 0; i < 256; i++)
    p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = p[i] as number
    p[i]    = p[j] as number
    p[j]    = t
  }

  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++)
    perm[i] = p[i & 255] as number

  const F3 = 1 / 3
  const G3 = 1 / 6

  function dot3 (g: readonly [number, number, number] | (typeof GRAD3)[number], x: number, y: number, z: number): number {
    return g[0] * x + g[1] * y + g[2] * z
  }
```

```ts replace
  const { perm, permMod12 } = permutation(seed)

  const F3 = 1 / 3
  const G3 = 1 / 6
```

The four corners. Each sum keeps the order `dot3` had: x, then y, then z.

```ts find
      const gi = (perm[ii + (perm[jj + (perm[kk] as number)] as number)] as number) % 12
      n += t0 * t0 * dot3(GRAD3[gi] as (typeof GRAD3)[number], x0, y0, z0)
```

```ts replace
      const gi = permMod12[ii + (perm[jj + (perm[kk] as number)] as number)] as number
      n += t0 * t0 * ((GRAD_X[gi] as number) * x0 + (GRAD_Y[gi] as number) * y0 + (GRAD_Z[gi] as number) * z0)
```

```ts find
      const gi = (perm[ii + i1 + (perm[jj + j1 + (perm[kk + k1] as number)] as number)] as number) % 12
      n += t1 * t1 * dot3(GRAD3[gi] as (typeof GRAD3)[number], x1, y1, z1)
```

```ts replace
      const gi = permMod12[ii + i1 + (perm[jj + j1 + (perm[kk + k1] as number)] as number)] as number
      n += t1 * t1 * ((GRAD_X[gi] as number) * x1 + (GRAD_Y[gi] as number) * y1 + (GRAD_Z[gi] as number) * z1)
```

```ts find
      const gi = (perm[ii + i2 + (perm[jj + j2 + (perm[kk + k2] as number)] as number)] as number) % 12
      n += t2 * t2 * dot3(GRAD3[gi] as (typeof GRAD3)[number], x2, y2, z2)
```

```ts replace
      const gi = permMod12[ii + i2 + (perm[jj + j2 + (perm[kk + k2] as number)] as number)] as number
      n += t2 * t2 * ((GRAD_X[gi] as number) * x2 + (GRAD_Y[gi] as number) * y2 + (GRAD_Z[gi] as number) * z2)
```

```ts find
      const gi = (perm[ii + 1 + (perm[jj + 1 + (perm[kk + 1] as number)] as number)] as number) % 12
      n += t3 * t3 * dot3(GRAD3[gi] as (typeof GRAD3)[number], x3, y3, z3)
```

```ts replace
      const gi = permMod12[ii + 1 + (perm[jj + 1 + (perm[kk + 1] as number)] as number)] as number
      n += t3 * t3 * ((GRAD_X[gi] as number) * x3 + (GRAD_Y[gi] as number) * y3 + (GRAD_Z[gi] as number) * z3)
```

```ts find
// perf: medium. ~4 gradient dots per sample; fbm multiplies by octave count.
```

```ts replace
// perf: medium. ~4 gradient dots per sample, read from flat tables; fbm multiplies by octave count.
```
