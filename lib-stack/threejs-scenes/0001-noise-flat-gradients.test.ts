// lib-stack/threejs-scenes/0001-noise-flat-gradients.test.ts
import { describe, expect, test } from 'bun:test'
import { createNoise3D, mulberry32 } from 'threejs-scenes/primitives'


const GRAD3 = [
  [ 1, 1, 0 ], [ -1, 1, 0 ], [ 1, -1, 0 ], [ -1, -1, 0 ],
  [ 1, 0, 1 ], [ -1, 0, 1 ], [ 1, 0, -1 ], [ -1, 0, -1 ],
  [ 0, 1, 1 ], [ 0, -1, 1 ], [ 0, 1, -1 ], [ 0, -1, -1 ],
] as const

const F3 = 1 / 3

const G3 = 1 / 6

/**
 * `sample` as threejs-scenes 3.0.0 shipped it, kept here as the thing the
 * improvement has to equal. Folded for length (one `corner` for the four), but
 * every sum and product is in the order 3.0.0 had it: run against the package
 * as published (`bun run stack --restore`) this test passes too, which is how
 * the copy was checked.
 */
function reference (seed: number): (x: number, y: number, z: number) => number {
  const rng = mulberry32(seed >>> 0)
  const p   = new Uint8Array(256)

  for (let i = 0; i < 256; i += 1)
    p[i] = i

  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const t = p[i]!

    p[i] = p[j]!
    p[j] = t
  }

  const perm = new Uint8Array(512)

  for (let i = 0; i < 512; i += 1)
    perm[i] = p[i & 255]!

  const corner = (x: number, y: number, z: number, hash: number): number => {
    const t = 0.6 - x * x - y * y - z * z

    if (t <= 0)
      return 0

    const g = GRAD3[hash % 12]!

    return t * t * (t * t) * (g[0] * x + g[1] * y + g[2] * z)
  }

  return (xin, yin, zin) => {
    const s  = (xin + yin + zin) * F3
    const i  = Math.floor(xin + s)
    const j  = Math.floor(yin + s)
    const k  = Math.floor(zin + s)
    const t  = (i + j + k) * G3
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const z0 = zin - (k - t)

    // the six orderings of x0, y0, z0, as [ i1, j1, k1, i2, j2, k2 ]
    const [ i1, j1, k1, i2, j2, k2 ] = x0 >= y0
      ? y0 >= z0 ? [ 1, 0, 0, 1, 1, 0 ] as const : x0 >= z0 ? [ 1, 0, 0, 1, 0, 1 ] as const : [ 0, 0, 1, 1, 0, 1 ] as const
      : y0 < z0 ? [ 0, 0, 1, 0, 1, 1 ] as const : x0 < z0 ? [ 0, 1, 0, 0, 1, 1 ] as const : [ 0, 1, 0, 1, 1, 0 ] as const

    const ii = i & 255
    const jj = j & 255
    const kk = k & 255

    let n = 0

    n += corner(x0, y0, z0, perm[ii + perm[jj + perm[kk]!]!]!)
    n += corner(x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, perm[ii + i1 + perm[jj + j1 + perm[kk + k1]!]!]!)
    n += corner(x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, perm[ii + i2 + perm[jj + j2 + perm[kk + k2]!]!]!)
    n += corner(x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, perm[ii + 1 + perm[jj + 1 + perm[kk + 1]!]!]!)

    return 32 * n
  }
}

describe('createNoise3D after 0001-noise-flat-gradients', () => {
  test.each([ 1, 42, 20_261_123, 0xffffffff ])('seed %i gives the values 3.0.0 gave, to the last bit', seed => {
    const noise  = createNoise3D(seed)
    const before = reference(seed)
    const place  = mulberry32(seed ^ 0x9e3779b9)
    let differ   = 0

    for (let index = 0; index < 60_000; index += 1) {
      // near and far, negative and positive, on and off the lattice
      const span = index % 3 === 0 ? 4 : index % 3 === 1 ? 300 : 40_000
      const x    = (place() - 0.5) * span
      const y    = (place() - 0.5) * span
      const z    = (place() - 0.5) * span

      if (!Object.is(noise.sample(x, y, z), before(x, y, z)))
        differ += 1
    }

    expect(differ).toBe(0)
  })

  test('the ground scenery stands on is sampled as before: a slice at constant y', () => {
    const noise  = createNoise3D(20_261_123)
    const before = reference(20_261_123)

    for (let x = -130; x <= 130; x += 6.5)
      for (let z = -130; z <= 130; z += 6.5)
        expect(noise.sample(x * 0.011, 0.5, z * 0.011)).toBe(before(x * 0.011, 0.5, z * 0.011))
  })

  test('fbm and ridged are still sums of sample', () => {
    const noise = createNoise3D(7)

    expect(noise.fbm(0.3, 0.5, -1.2, 3)).toBe(0.5 * noise.sample(0.3, 0.5, -1.2) + 0.25 * noise.sample(0.6, 1, -2.4) + 0.125 * noise.sample(1.2, 2, -4.8))
    expect(noise.ridged(0.3, 0.5, -1.2, 1)).toBe(0.5 * (1 - Math.abs(noise.sample(0.3, 0.5, -1.2))))
  })
})
