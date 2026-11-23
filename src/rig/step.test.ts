// src/rig/step.test.ts
import { describe, expect, test } from 'bun:test'
import { createGround } from '../world/shared/ground.ts'
import type { Pose } from '../world/views.ts'
import { EYE, ORBIT_IDLE, RETURN_TIME, createRigState, stepRig } from './step.ts'
import type { RigEnv, RigInput, RigState } from './step.ts'
import { createTour } from './tour.ts'


const STEP   = 1 / 60

const ground = createGround({ seed: 7 })

const POSES: Pose[] = [
  { position: [ 80, 30, 90 ], target: [ 0, 12, 20 ]},
  { position: [ -90, 28, 40 ], target: [ -10, 10, 0 ]},
  { position: [ 10, 40, -80 ], target: [ 20, 8, 30 ]},
]

/** Run a scripted session and return every pose it produced, flattened. */
type PlayReturnType = { trace: number[], state: RigState }

function quiet (): RigInput {
  return { dragX: 0, dragY: 0, zoom: 1, moveX: 0, moveZ: 0, lift: 0, sprint: false }
}

function env (explore = false): RigEnv {
  return { tour: createTour(POSES), ground, explore }
}

function play (frames: number, script: (frame: number, input: RigInput, at: RigEnv) => void): PlayReturnType {
  const state           = createRigState()
  const world           = env()
  const trace: number[] = []

  for (let frame = 1; frame <= frames; frame += 1) {
    const input = quiet()

    script(frame, input, world)
    stepRig(state, input, frame * STEP, STEP, world)
    trace.push(...state.pose.position, ...state.pose.target)
  }

  return { trace, state }
}

describe('stepRig', () => {
  test('with no input it is the tour', () => {
    const { state } = play(600, () => undefined)

    expect(state.mode).toBe('tour')
    expect(state.returning).toBe(false)
  })

  test('the same inputs give the same poses', () => {
    const script = (frame: number, input: RigInput, at: RigEnv): void => {
      if (frame > 30 && frame < 90)
        input.dragX = 4

      if (frame === 100)
        input.zoom = 1.2

      at.explore = frame > 700 && frame < 1100

      if (at.explore) {
        input.moveZ = 1
        input.dragY = frame % 7 === 0 ? -3 : 0
      }
    }

    expect(play(1400, script).trace).toEqual(play(1400, script).trace)
  })

  test('a drag takes the camera into orbit, stillness sends it back', () => {
    const idle = Math.ceil(ORBIT_IDLE / STEP)
    const back = Math.ceil(RETURN_TIME / STEP)

    const dragged = play(20, (frame, input) => {
      if (frame === 10)
        input.dragX = 30
    })

    expect(dragged.state.mode).toBe('orbit')

    const returned = play(10 + idle + back + 5, (frame, input) => {
      if (frame === 10)
        input.dragX = 30
    })

    expect(returned.state.mode).toBe('tour')
    expect(returned.state.returning).toBe(false)
  })

  test('nothing is ever not a number, and the camera never teleports', () => {
    const { trace } = play(2400, (frame, input, at) => {
      input.dragX = frame % 50 < 10 ? 6 : 0
      input.zoom  = frame % 400 === 0 ? 0.7 : 1
      at.explore  = frame > 1200 && frame < 1800

      if (at.explore) {
        input.moveZ  = 1
        input.moveX  = frame % 120 < 60 ? 1 : -1
        input.sprint = frame % 300 < 100
        input.lift   = frame % 500 < 80 ? 1 : 0
      }
    })

    for (const value of trace)
      expect(Number.isFinite(value)).toBe(true)

    for (let index = 12; index < trace.length; index += 12) {
      const moved = Math.hypot(
        trace[index]! - trace[index - 12]!,
        trace[index + 1]! - trace[index - 11]!,
        trace[index + 2]! - trace[index - 10]!,
      )

      // A 6 px drag swings the orbit by 0.027 rad; at the widest radius that is
      // about 6.5 units. Anything near that is a jump, not a move.
      expect(moved).toBeLessThan(7)
    }
  })

  test('exploring keeps the eye above whatever is underfoot', () => {
    const state = createRigState()
    const world = env(true)

    for (let frame = 1; frame <= 3000; frame += 1) {
      const input = quiet()

      input.moveZ  = 1
      input.sprint = true
      input.dragX  = frame % 90 < 20 ? 5 : 0

      stepRig(state, input, frame * STEP, STEP, world)

      const [ x, y, z ] = state.pose.position
      const floor       = Math.max(ground.heightAt(x, z), ground.waterLevel) + EYE

      expect(y).toBeGreaterThanOrEqual(floor - 1e-9)
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(ground.size * 0.49 + 1e-9)
    }

    expect(state.mode).toBe('explore')
  })

  test('leaving explore eases back onto the tour', () => {
    const { state } = play(900, (frame, _input, at) => {
      at.explore = frame < 300
    })

    expect(state.mode).toBe('tour')
    expect(state.returning).toBe(false)
  })
})
