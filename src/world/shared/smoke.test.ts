// src/world/shared/smoke.test.ts
import { describe, expect, test } from 'bun:test'
import * as THREE from 'three'

import { createWind } from './wind.ts'
import { createSmoke } from './smoke.ts'


describe('the smoke', () => {
  const wind     = createWind()
  const from     = new THREE.Vector3(56, 14, 55)
  const material = new THREE.MeshBasicMaterial()

  /** Where every puff is and how big, after `drift`. */
  function puffs (mesh: THREE.InstancedMesh): { at: THREE.Vector3, size: number }[] {
    const matrix = new THREE.Matrix4()

    return Array.from({ length: mesh.count }, (_, puff) => {
      mesh.getMatrixAt(puff, matrix)

      return { at: new THREE.Vector3().setFromMatrixPosition(matrix), size: matrix.getMaxScaleOnAxis() }
    })
  }

  test('is a pure function of time', () => {
    const smoke = createSmoke({ tier: 'desktop', seed: 7, wind, from, material })

    smoke.drift(10)

    const first = Array.from(smoke.mesh.instanceMatrix.array)

    // Asking for other moments in between must not change the answer.
    smoke.drift(3)
    smoke.drift(4000.5)
    smoke.drift(10)

    expect(Array.from(smoke.mesh.instanceMatrix.array)).toEqual(first)
  })

  test('rises from the chimney and goes with the wind, never against it', () => {
    const smoke = createSmoke({ tier: 'desktop', seed: 7, wind, from, material })

    for (const time of [ 0, 10, 37.3, 600 ]) {
      smoke.drift(time)

      for (const { at, size } of puffs(smoke.mesh)) {
        const downwind = (at.x - from.x) * wind.direction[0] + (at.z - from.z) * wind.direction[1]

        // A puff may wander a little, but only what has size can be seen to.
        if (size > 0.05) {
          expect(at.y).toBeGreaterThan(from.y - 1)
          expect(downwind).toBeGreaterThan(-1)
        }
      }
    }
  })

  test('stays inside the sphere it is culled by, whatever the wind does', () => {
    for (const tier of [ 'mobile', 'desktop', 'highEnd' ] as const) {
      const smoke  = createSmoke({ tier, seed: 7, wind, from, material })
      const sphere = smoke.mesh.boundingSphere!

      for (let time = 0; time < 120; time += 0.37) {
        smoke.drift(time)

        for (const { at, size } of puffs(smoke.mesh))
          expect(at.distanceTo(sphere.center) + size * 1.4).toBeLessThan(sphere.radius)
      }
    }
  })

  test('comes from nothing and thins to nothing: no puff ever blinks', () => {
    const smoke = createSmoke({ tier: 'mobile', seed: 7, wind, from, material })

    smoke.drift(0)

    let last = puffs(smoke.mesh).map(puff => puff.size)

    for (let frame = 1; frame < 60 * 30; frame += 1) {
      smoke.drift(frame / 60)

      const next = puffs(smoke.mesh).map(puff => puff.size)

      // A sixtieth of a second never changes a puff by more than a fifth of its fullest.
      next.forEach((size, puff) => expect(Math.abs(size - last[puff]!)).toBeLessThan(0.3))
      last = next
    }
  })
})
