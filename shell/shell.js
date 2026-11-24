// shell/shell.js
// @ts-check
import { loadManifest, journalUrl, compareUrl } from './manifest.js'
import { watchFrame } from './health.js'
import { pick, make, formatDate, readPref, writePref } from './dom.js'

/** @typedef {import('./manifest.js').Iteration} Iteration */
/** @typedef {import('./health.js').Verdict} Verdict */

const PREF_CHROME   = 'scenery:chrome'
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

const REASONS = {
  failed:  'The live world could not start in this browser, so this is the picture taken when it was published.',
  lost:    'The graphics context was lost, so this is the picture taken when it was published.',
  timeout: 'The live world is taking too long to start, so this is the picture taken when it was published.',
}

const toggle        = pick('#chrome-toggle', HTMLButtonElement)
const banner        = pick('body > header', HTMLElement)
const panel         = pick('#chrome', HTMLElement)
const frame         = pick('#world', HTMLIFrameElement)
const fallback      = pick('main > section[data-view="fallback"]', HTMLElement)
const fallbackImage = pick('img', HTMLImageElement, fallback)
const fallbackText  = pick('p', HTMLParagraphElement, fallback)
const fallbackRetry = pick('button', HTMLButtonElement, fallback)
const notice        = pick('main > section[data-view="notice"]', HTMLElement)
const heading       = pick('#iteration-title', HTMLElement)
const meta          = pick('#meta', HTMLElement)
const summary       = pick('#summary', HTMLElement)
const links         = pick('#links', HTMLElement)
const prev          = pick('#prev', HTMLButtonElement)
const next          = pick('#next', HTMLButtonElement)
const strip         = pick('#strip', HTMLOListElement)
const status        = pick('#status', HTMLOutputElement)
const bar           = pick('main > progress', HTMLProgressElement)

/** @type {Iteration[]} */
let items = []
let repo  = ''
let index = -1

const watcher = watchFrame(frame, verdict => onVerdict(verdict))

/** @returns {number | null} */
function idFromUrl () {
  const raw = new URL(location.href).searchParams.get('i')
  const id  = raw === null || raw.trim() === '' ? NaN : Number(raw)
  return Number.isInteger(id) ? id : null
}

/** @returns {Iteration | undefined} */
function current () {
  return items[index]
}

/**
 * Where the first picture is on its way to the screen. The stylesheet draws the
 * bar from this alone: `gallery` is set by the page's head, before this module.
 *
 * @param {'world' | 'done' | null} stage  null when there is nothing to wait for
 */
function setLoading (stage) {
  if (stage)
    document.documentElement.dataset.loading = stage
  else
    delete document.documentElement.dataset.loading
}

/** @param {Verdict} verdict */
function onVerdict (verdict) {
  if (verdict === 'ready') {
    setLoading('done')
    return hideFallback()
  }
  setLoading(null)
  showFallback(verdict)
}

/** @param {'failed' | 'lost' | 'timeout'} reason */
function showFallback (reason) {
  const iteration = current()
  if (!iteration)
    return
  fallbackText.textContent = REASONS[reason]
  fallbackImage.hidden     = !iteration.hero
  if (iteration.hero) {
    fallbackImage.src = iteration.hero
    fallbackImage.alt = `Stored picture of iteration ${iteration.id}: ${iteration.title}`
  }
  fallback.hidden    = false
  status.textContent = REASONS[reason]
}

function hideFallback () {
  fallback.hidden = true
}

/**
 * Whether the frame is already showing a page.
 *
 * On a reload Firefox puts the frame back where it was by itself, before this
 * script has even arrived, as long as the page is still fresh in its cache.
 *
 * @param {string} url
 */
function frameIsAt (url) {
  try {
    return frame.contentWindow?.location.href === url
  }
  catch {
    return false
  }
}

/**
 * @param {string} url
 * @param {boolean} fresh  load it even if the frame is already there
 */
function navigateFrame (url, fresh) {
  // Sending the frame where it already is would build the same world a second
  // time and throw the first one away: 430 ms of a 962 ms reload, when measured.
  if (!fresh && frameIsAt(url))
    return

  if (!frame.getAttribute('src')) {
    frame.src = url
    return
  }
  // Replacing the frame's location keeps the browser's Back button for the
  // shell: assigning `src` would add a session-history entry per iteration.
  try {
    frame.contentWindow?.location.replace(url)
  }
  catch {
    frame.src = url
  }
}

/**
 * @param {Iteration} iteration
 * @param {{ fresh?: boolean }} [options]  `fresh` for a retry: the page that is there is the one that failed
 */
function loadFrame (iteration, { fresh = false } = {}) {
  const url = new URL(iteration.dir, document.baseURI).href
  hideFallback()
  frame.title = `Scenery iteration ${iteration.id}: ${iteration.title}`

  // The first world carries the bar on from where the gallery's stretch left
  // it. Any later one starts it again from nothing: cleared, then measured so
  // the browser has seen it empty before it is asked to grow.
  if (document.documentElement.dataset.loading !== 'gallery') {
    setLoading(null)
    bar.getBoundingClientRect()
  }
  setLoading('world')
  navigateFrame(url, fresh)
  watcher.start(url)
}

/**
 * @param {string} label
 * @param {string} href
 * @param {boolean} external
 */
function link (label, href, external) {
  const anchor = make('a', { href }, [ label ])
  if (external) {
    anchor.target = '_blank'
    anchor.rel    = 'noopener noreferrer'
  }
  return make('li', {}, [ anchor ])
}

/** @param {Iteration} iteration */
function renderInfo (iteration) {
  heading.textContent = iteration.title
  summary.textContent = iteration.summary
  summary.hidden      = !iteration.summary

  meta.replaceChildren(...[
    iteration.date && make('time', { datetime: iteration.date }, [ formatDate(iteration.date, { dateStyle: 'long' }) ]),
    iteration.kind && make('span', { 'data-field': 'kind', 'data-kind': iteration.kind }, [ iteration.kind ]),
    iteration.model && make('span', { 'data-field': 'model' }, [ iteration.model ]),
  ].filter(Boolean))

  const before  = items[index - 1]
  const journal = journalUrl(repo, iteration)
  const compare = before ? compareUrl(repo, before, iteration) : ''
  links.replaceChildren(...[
    journal && link('Journal entry', journal, true),
    compare && link(`Changes since #${before?.id}`, compare, true),
    link('Open on its own', iteration.dir, true),
  ].filter(Boolean))
}

function renderStrip () {
  strip.replaceChildren(...items.map((iteration, position) => {
    const frameBox = make('span', { 'data-field': 'thumb' })
    if (iteration.thumb) {
      const image = make('img', { src: iteration.thumb, alt: '', loading: 'lazy', decoding: 'async', width: '160', height: '90' })
      image.addEventListener('error', () => {
        image.hidden = true
      })
      frameBox.append(image)
    }

    const button = make('button', {
      'type':       'button',
      'tabindex':   '-1',
      'data-id':    String(iteration.id),
      'aria-label': [ `#${iteration.id}`, iteration.date, iteration.title ].filter(Boolean).join(', '),
    }, [
      frameBox,
      make('strong', {}, [ `#${iteration.id}` ]),
      make('time', { datetime: iteration.date }, [ iteration.date ]),
    ])
    button.addEventListener('click', () => show(position))
    return make('li', {}, [ button ])
  }))
}

function markCurrent () {
  for (const button of strip.querySelectorAll('button')) {
    const isCurrent = button.dataset.id === String(current()?.id)
    button.tabIndex = isCurrent ? 0 : -1
    if (isCurrent) {
      button.setAttribute('aria-current', 'true')
      button.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' })
    }
    else
      button.removeAttribute('aria-current')
  }
}

/**
 * Steps and the end buttons are disabled at the ends; if one of them holds
 * focus at that moment, focus moves to its sibling instead of being dropped.
 */
function updateSteps () {
  prev.disabled = index <= 0
  next.disabled = index >= items.length - 1
  if (document.activeElement === prev && prev.disabled)
    next.focus()
  else if (document.activeElement === next && next.disabled)
    prev.focus()
}

/**
 * @param {number} position  index into the visible iterations
 * @param {{ writeUrl?: boolean }} [options]
 */
function show (position, { writeUrl = true } = {}) {
  const iteration = items[position]
  if (!iteration || position === index)
    return

  const focusInStrip = strip.contains(document.activeElement)
  index = position

  renderInfo(iteration)
  markCurrent()
  updateSteps()
  loadFrame(iteration)
  document.title     = `#${iteration.id} ${iteration.title} · Scenery`
  status.textContent = `Showing iteration ${iteration.id}: ${iteration.title}`
  if (focusInStrip)
    pick('button[aria-current]', HTMLButtonElement, strip).focus({ preventScroll: true })

  if (writeUrl) {
    const url = new URL(location.href)
    url.searchParams.set('i', String(iteration.id))
    history.replaceState(null, '', url)
  }
}

/**
 * @param {number | null} id
 * @returns {number}  position of that iteration, or of the newest when unknown
 */
function positionOf (id) {
  const found = items.findIndex(iteration => iteration.id === id)
  return found === -1 ? items.length - 1 : found
}

/** @param {number} delta */
function step (delta) {
  show(Math.min(Math.max(index + delta, 0), items.length - 1))
}

/** @param {boolean} collapsed */
function setCollapsed (collapsed) {
  const hadFocus                          = panel.contains(document.activeElement)
  document.documentElement.dataset.chrome = collapsed ? 'hidden' : 'shown'
  panel.inert                             = collapsed
  toggle.setAttribute('aria-expanded', String(!collapsed))
  if (collapsed && hadFocus)
    toggle.focus()
}

function toggleChrome () {
  const collapsed = document.documentElement.dataset.chrome !== 'hidden'
  setCollapsed(collapsed)
  writePref(PREF_CHROME, collapsed ? 'hidden' : 'shown')
}

/** @param {KeyboardEvent} event */
function onKey (event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
    return

  const target = event.target
  if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable]'))
    return

  /** @type {Record<string, () => void>} */
  const actions = {
    ArrowLeft:  () => step(-1),
    ArrowRight: () => step(1),
    Home:       () => show(0),
    End:        () => show(items.length - 1),
    h:          toggleChrome,
    H:          toggleChrome,
  }
  const action = actions[event.key]
  if (!action)
    return
  event.preventDefault()
  action()
}

/**
 * @param {string} title
 * @param {string} message
 */
function showNotice (title, message) {
  pick('h2', HTMLElement, notice).textContent         = title
  pick('p', HTMLParagraphElement, notice).textContent = message
  notice.hidden                                       = false
  panel.hidden                                        = true
  setLoading(null)
}

async function start () {
  // decided before the manifest arrives, so the panel's space is reserved (or not) from the first paint
  setCollapsed(readPref(PREF_CHROME) === 'hidden')
  toggle.addEventListener('click', toggleChrome)
  pick('button', HTMLButtonElement, notice).addEventListener('click', () => location.reload())
  fallbackRetry.addEventListener('click', () => {
    const iteration = current()
    if (iteration)
      loadFrame(iteration, { fresh: true })
  })
  prev.addEventListener('click', () => step(-1))
  next.addEventListener('click', () => step(1))
  document.addEventListener('keydown', onKey)

  try {
    const manifest = await loadManifest()
    items = manifest.iterations
    repo = manifest.repo
  }
  catch {
    showNotice('The gallery could not be loaded', 'The list of iterations did not arrive. Check your connection and try again.')
    return
  }
  if (items.length === 0) {
    showNotice('Nothing here yet', 'The first iteration has not been published. Check back soon.')
    return
  }

  banner.hidden = false
  renderStrip()

  const requested = idFromUrl()
  show(positionOf(requested), { writeUrl: requested !== null })

  addEventListener('popstate', () => show(positionOf(idFromUrl()), { writeUrl: false }))
}

start()
