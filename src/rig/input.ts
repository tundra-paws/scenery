// src/rig/input.ts
import { attachPointerGesture } from 'threejs-scenes'
import type { RigInput } from './step.ts'

/**
 * Input adapters.
 *
 * Pointer, wheel, pinch, keys and the touch stick all do one thing: write into
 * a `RigInput`. They never move the camera. The rig reads the input once per
 * simulation step and clears it, so what the camera does is decided inside the
 * tick, on the fixed clock, whatever rate the events arrived at.
 */

const FORWARD = [ 'KeyW', 'ArrowUp' ]

const BACK    = [ 'KeyS', 'ArrowDown' ]

const LEFT    = [ 'KeyA', 'ArrowLeft' ]

const RIGHT   = [ 'KeyD', 'ArrowRight' ]

const UP      = [ 'Space' ]

const DOWN    = [ 'KeyC', 'ControlLeft' ]

const FAST    = [ 'ShiftLeft', 'ShiftRight' ]

const MOVEMENT = new Set([ ...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...UP, ...DOWN ])

interface AttachOptions {
  canvas: HTMLCanvasElement

  /** The on-screen stick for touch, when the page has one. */
  stick: HTMLElement | null
  input: RigInput

  /** Called when the visitor starts to move, so the app can switch to explore. */
  onMove: () => void
}

export function createInput (): RigInput {
  return { dragX: 0, dragY: 0, zoom: 1, moveX: 0, moveZ: 0, lift: 0, sprint: false }
}

/** Forget what was accumulated since the last step. Held keys stay held. */
export function clearInput (input: RigInput): void {
  input.dragX = 0
  input.dragY = 0
  input.zoom  = 1
}

function clamp (value: number): number {
  return Math.min(1, Math.max(-1, value))
}

function typing (target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function attachInput ({ canvas, stick, input, onMove }: AttachOptions): () => void {
  const held = new Set<string>()
  const pad  = { x: 0, y: 0 }

  const pressed = (codes: readonly string[]): number =>
    codes.some(code => held.has(code)) ? 1 : 0

  const refresh = (): void => {
    input.moveX  = clamp(pressed(RIGHT) - pressed(LEFT) + pad.x)
    input.moveZ  = clamp(pressed(FORWARD) - pressed(BACK) - pad.y)
    input.lift   = pressed(UP) - pressed(DOWN)
    input.sprint = pressed(FAST) === 1
  }

  const detachGesture = attachPointerGesture(canvas, {
    onDrag (dx, dy) {
      input.dragX += dx
      input.dragY += dy
    },

    onPinch (scale) {
      input.zoom /= scale
    },

    onWheel (delta) {
      input.zoom *= 1 + delta * 0.001
    },
  })

  const onKeyDown = (event: KeyboardEvent): void => {
    if (typing(event.target) || event.metaKey || event.altKey)
      return

    if (FAST.includes(event.code))
      held.add(event.code)

    if (MOVEMENT.has(event.code)) {
      // Arrow keys and space would otherwise scroll whatever page embeds this one.
      event.preventDefault()
      held.add(event.code)
      onMove()
    }

    refresh()
  }

  const onKeyUp = (event: KeyboardEvent): void => {
    held.delete(event.code)
    refresh()
  }

  const release = (): void => {
    held.clear()
    pad.x = 0
    pad.y = 0
    refresh()
  }

  const onStick = (event: PointerEvent): void => {
    if (!stick)
      return

    const box    = stick.getBoundingClientRect()
    const radius = box.width / 2
    const x      = (event.clientX - box.left - radius) / radius
    const y      = (event.clientY - box.top - radius) / radius
    const length = Math.max(1, Math.hypot(x, y))

    pad.x = x / length
    pad.y = y / length

    // The knob follows the thumb through two custom properties, not inline style.
    stick.style.setProperty('--stick-x', String(pad.x))
    stick.style.setProperty('--stick-y', String(pad.y))
    refresh()
  }

  const onStickDown = (event: PointerEvent): void => {
    stick?.setPointerCapture(event.pointerId)
    onMove()
    onStick(event)
  }

  const onStickMove = (event: PointerEvent): void => {
    if (stick?.hasPointerCapture(event.pointerId))
      onStick(event)
  }

  const onStickUp = (): void => {
    pad.x = 0
    pad.y = 0
    stick?.style.setProperty('--stick-x', '0')
    stick?.style.setProperty('--stick-y', '0')
    refresh()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', release)
  stick?.addEventListener('pointerdown', onStickDown)
  stick?.addEventListener('pointermove', onStickMove)
  stick?.addEventListener('pointerup', onStickUp)
  stick?.addEventListener('pointercancel', onStickUp)

  return () => {
    detachGesture()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', release)
    stick?.removeEventListener('pointerdown', onStickDown)
    stick?.removeEventListener('pointermove', onStickMove)
    stick?.removeEventListener('pointerup', onStickUp)
    stick?.removeEventListener('pointercancel', onStickUp)
  }
}
