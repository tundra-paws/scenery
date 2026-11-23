// shell/health.js
// @ts-check

const POLL_MS = 500

/** How long a page may take to report `ready` before the picture is shown. */
export const BOOT_TIMEOUT_MS = 20_000

/** @typedef {'ready' | 'failed' | 'lost' | 'timeout'} Verdict */

/**
 * What the page inside the frame says about itself, or '' when it cannot be
 * read yet (still navigating, still the previous page, or not same-origin).
 *
 * @param {HTMLIFrameElement} frame
 * @param {string} expected  absolute URL the frame was sent to
 * @returns {string}
 */
function readState (frame, expected) {
  try {
    const win = frame.contentWindow
    if (!win || !win.location.href.startsWith(expected))
      return ''
    return win.document.documentElement.dataset.sceneryState ?? ''
  }
  catch {
    return ''
  }
}

/**
 * Watches the page in a frame and reports changes of its verdict: `ready`,
 * `failed`, `lost`, or `timeout` when it never got to `ready` in time. A
 * `timeout` is not final; a slow page that gets there later reports `ready`.
 *
 * @param {HTMLIFrameElement} frame
 * @param {(verdict: Verdict) => void} onVerdict
 * @param {number} [timeoutMs]
 * @returns {{ start: (url: string) => void, stop: () => void }}
 */
export function watchFrame (frame, onVerdict, timeoutMs = BOOT_TIMEOUT_MS) {
  let timer     = 0
  let expected  = ''
  let startedAt = 0

  /** @type {Verdict | ''} */
  let last = ''

  const check = () => {
    const state = readState(frame, expected)

    /** @type {Verdict | ''} */
    let verdict = ''
    if (state === 'ready' || state === 'failed' || state === 'lost')
      verdict = state
    else if (last !== 'ready' && performance.now() - startedAt > timeoutMs)
      verdict = 'timeout'
    if (verdict && verdict !== last) {
      last = verdict
      onVerdict(verdict)
    }
  }

  const stop = () => {
    clearInterval(timer)
    timer = 0
  }

  frame.addEventListener('load', check)

  return {
    stop,
    start (url) {
      stop()
      expected = url
      startedAt = performance.now()
      last = ''
      timer = window.setInterval(check, POLL_MS)
    },
  }
}
