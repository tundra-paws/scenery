---
title: createNoise2D, a seeded 2D simplex sampler
kind: feat
base: 3.0.0
released:
---

A heightfield is a function of two coordinates. With only `createNoise3D` to hand, scenery's
ground calls the 3D sampler with a constant `y` to get one, which sums four corners in three
dimensions for a field that has two. A 2D simplex sums three corners in two.

`createNoise2D(seed)` has the same shape as `createNoise3D`: `sample`, `fbm`, `ridged`, the same
seed-shuffled permutation, output roughly in [-1, 1].

**It is a different field from a slice of the 3D one.** Swapping it into an existing world
changes that world. It is here for new work, not as a silent replacement.

Depends on `0001-noise-flat-gradients` for `permutation` and the flat gradient tables.

## lib/procedural/noise.ts

```ts find
  return { sample, fbm, ridged }
}
```

```ts replace
  return { sample, fbm, ridged }
}

/** Seeded 2D simplex noise field with fractal `fbm` and `ridged` sums. */
export interface Noise2D {

  /** Single octave, output roughly in [-1, 1]. */
  sample (x: number, y: number): number

  /** Fractal Brownian motion, output roughly in [-1, 1]. */
  fbm (x: number, y: number, octaves?: number, lacunarity?: number, gain?: number): number

  /** Ridged multifractal, output in [0, 1] — sharp crests, good for mountains. */
  ridged (x: number, y: number, octaves?: number, lacunarity?: number, gain?: number): number
}

/**
 * Seeded 2D simplex noise (classic Gustavson, the same seed-shuffled
 * permutation as {@link createNoise3D}): the field for anything that is a
 * function of two coordinates — a heightfield, a scatter mask, a texture.
 * Three corners a sample instead of four, in two dimensions instead of three.
 *
 * @param seed - Any integer; same seed → same field.
 * @returns A {@link Noise2D} with `sample`, `fbm`, and `ridged`.
 * @remarks Not a slice of the 3D field: `createNoise2D(s).sample(x, y)` and
 * `createNoise3D(s).sample(x, 0, y)` are unrelated values.
 */
export function createNoise2D (seed = 1): Noise2D {
  const { perm, permMod12 } = permutation(seed)

  const F2 = 0.5 * (Math.sqrt(3) - 1)
  const G2 = (3 - Math.sqrt(3)) / 6

  function sample (xin: number, yin: number): number {
    const s  = (xin + yin) * F2
    const i  = Math.floor(xin + s)
    const j  = Math.floor(yin + s)
    const t  = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)

    // which of the two triangles of the skewed cell the point is in
    const i1 = x0 > y0 ? 1 : 0
    const j1 = 1 - i1

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255

    let n  = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      t0 *= t0

      const gi = permMod12[ii + (perm[jj] as number)] as number
      n += t0 * t0 * ((GRAD_X[gi] as number) * x0 + (GRAD_Y[gi] as number) * y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      t1 *= t1

      const gi = permMod12[ii + i1 + (perm[jj + j1] as number)] as number
      n += t1 * t1 * ((GRAD_X[gi] as number) * x1 + (GRAD_Y[gi] as number) * y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      t2 *= t2

      const gi = permMod12[ii + 1 + (perm[jj + 1] as number)] as number
      n += t2 * t2 * ((GRAD_X[gi] as number) * x2 + (GRAD_Y[gi] as number) * y2)
    }
    return 70 * n
  }

  function fbm (x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let sum  = 0
    let amp  = 0.5
    let freq = 1
    for (let o = 0; o < octaves; o++) {
      sum  += amp * sample(x * freq, y * freq)
      freq *= lacunarity
      amp  *= gain
    }
    return sum
  }

  function ridged (x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let sum  = 0
    let amp  = 0.5
    let freq = 1
    for (let o = 0; o < octaves; o++) {
      sum  += amp * (1 - Math.abs(sample(x * freq, y * freq)))
      freq *= lacunarity
      amp  *= gain
    }
    return sum
  }

  return { sample, fbm, ridged }
}
```

## lib/index.ts

```ts find
export { createNoise3D } from './procedural/noise.js'
```

```ts replace
export { createNoise2D, createNoise3D } from './procedural/noise.js'
```
