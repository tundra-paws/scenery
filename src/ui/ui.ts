// src/ui/ui.ts
import type { App } from 'threejs-scenes/core'

import type { WorldState } from '../world/world.ts'


/**
 * The page's own chrome: one button and its hints.
 *
 * It follows the same flow as everything else. A click writes app state from
 * outside the tick; the page then mirrors that state into attributes, and the
 * stylesheet decides what is visible from those.
 */
export function mountUi (app: App<WorldState>): void {
  const root   = document.documentElement
  const button = document.querySelector<HTMLButtonElement>('nav button')

  const mirror = (state: WorldState): void => {
    root.dataset.sceneryMode = state.explore ? 'explore' : 'tour'

    if (button) {
      button.setAttribute('aria-pressed', String(state.explore))
      button.textContent = state.explore ? 'Back to the tour' : 'Explore'
    }
  }

  button?.addEventListener('click', () => app.setState({ explore: !app.getState().explore }))

  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && app.getState().explore)
      app.setState({ explore: false })
  })

  app.store.subscribe(mirror)
  mirror(app.getState())
}

/** Say what went wrong where a person can see it. */
export function showFailure (message: string): void {
  const output = document.querySelector('output')

  if (output)
    output.textContent = message
}
