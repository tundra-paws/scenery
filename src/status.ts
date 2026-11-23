// src/status.ts
/** How many times a page may reload itself after losing its WebGL context. */
const MAX_RELOADS = 2

const RELOADS_KEY = 'scenery:context-reloads'

/**
 * What state the page is in, written where anything can read it.
 *
 * `<html data-scenery-state>` is how the capture tools know a frame exists, and
 * how the gallery around a published iteration knows to show the stored picture
 * instead when this page could not start on the visitor's device.
 */
export type Status = 'booting' | 'ready' | 'failed' | 'lost'

export function setStatus (status: Status): void {
  document.documentElement.dataset.sceneryState = status
}

function reloadsSoFar (): number {
  try {
    return Number(window.sessionStorage.getItem(RELOADS_KEY) ?? 0)
  }
  catch {
    // Storage can be blocked outright; treat that as having no budget left
    // rather than risking a reload loop nothing is counting.
    return MAX_RELOADS
  }
}

function countReload (count: number): void {
  try {
    window.sessionStorage.setItem(RELOADS_KEY, String(count))
  }
  catch {
    // Nothing to do: reloadsSoFar already reads a blocked store as spent.
  }
}

/**
 * React to the GPU taking the context away.
 *
 * A restored context has lost every buffer, texture and program. Rebuilding in
 * place would be a second way to construct the world that almost never runs and
 * so is never known to work; reloading runs the one path that is tested. The
 * reload budget keeps a device that loses the context every time from looping.
 */
export function watchContext (canvas: HTMLCanvasElement): void {
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    setStatus('lost')
  })

  canvas.addEventListener('webglcontextrestored', () => {
    const count = reloadsSoFar()

    if (count >= MAX_RELOADS)
      return

    countReload(count + 1)
    window.location.reload()
  })
}
