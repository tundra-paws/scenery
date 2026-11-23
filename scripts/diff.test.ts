// scripts/diff.test.ts
import { describe, expect, test } from 'bun:test'
import { PNG } from 'pngjs'
import { compare } from './diff.ts'

/** A flat grey frame, with an optional rectangle of another brightness. */
type PatchType = { x: number, y: number, size: number, value: number }

function frame (width: number, height: number, patch?: PatchType): PNG {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const inside = patch && x >= patch.x && x < patch.x + patch.size && y >= patch.y && y < patch.y + patch.size
      const value  = inside ? patch.value : 128
      const offset = (y * width + x) * 4

      png.data[offset]     = value
      png.data[offset + 1] = value
      png.data[offset + 2] = value
      png.data[offset + 3] = 255
    }

  return png
}

describe('compare', () => {
  test('identical frames have not moved', () => {
    const measured = compare(frame(128, 96), frame(128, 96), 0.1)

    expect(measured.changed).toBe(0)
    expect(measured.maxBlock).toBe(0)
  })

  test('a small thing that changed completely shows in max block, not in changed', () => {
    const measured = compare(frame(320, 320), frame(320, 320, { x: 64, y: 64, size: 32, value: 255 }), 0.1)

    // One 32-pixel square of a 320-pixel frame is one percent of it.
    expect(measured.changed).toBeCloseTo(1, 1)
    expect(measured.maxBlock).toBe(100)
  })

  test('a change below the tolerance is not a change', () => {
    const measured = compare(frame(64, 64), frame(64, 64, { x: 0, y: 0, size: 64, value: 130 }), 0.1)

    expect(measured.changed).toBe(0)
  })
})
