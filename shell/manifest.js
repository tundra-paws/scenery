// shell/manifest.js
// @ts-check

/**
 * One visible iteration, normalised from the manifest. Paths are relative to
 * the page; `hero` and `thumb` are already joined onto `dir` (or empty).
 *
 * @typedef {object} Iteration
 * @property {number} id
 * @property {string} dir
 * @property {string} date
 * @property {string} sha
 * @property {string} title
 * @property {string} summary
 * @property {string} kind
 * @property {string} model
 * @property {string} journal
 * @property {string} hero
 * @property {string} thumb
 */

/**
 * @typedef {object} Manifest
 * @property {string} repo
 * @property {Iteration[]} iterations  ascending by id, withdrawn ones removed
 */

const MANIFEST = 'iterations.json'
const REPO     = /^[\w.-]+\/[\w.-]+$/
const SHA      = /^[0-9a-f]{7,40}$/i

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord (value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function text (value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * A directory from the manifest, as a relative path ending in a slash, or ''
 * when it would leave this origin (the iframe is same-origin by design).
 *
 * @param {unknown} value
 * @returns {string}
 */
function localDir (value) {
  const dir = text(value)
  if (!dir)
    return ''
  try {
    const url = new URL(dir, document.baseURI)
    if (url.origin !== location.origin)
      return ''
  }
  catch {
    return ''
  }
  return dir.endsWith('/') ? dir : `${dir}/`
}

/**
 * @param {string} dir
 * @param {unknown} file
 * @returns {string}
 */
function shotPath (dir, file) {
  const name = text(file)
  return name ? `${dir}${name}` : ''
}

/**
 * @param {unknown} raw
 * @returns {Iteration[]}  zero or one entries, so it can feed a flatMap
 */
function toIteration (raw) {
  if (!isRecord(raw) || raw.withdrawn === true)
    return []

  const id  = typeof raw.id === 'number' ? raw.id : Number(text(raw.id) || NaN)
  const dir = localDir(raw.dir)
  if (!Number.isInteger(id) || !dir)
    return []

  const shots = isRecord(raw.shots) ? raw.shots : {}
  return [{
    id,
    dir,
    date:    text(raw.date),
    sha:     text(raw.sha),
    title:   text(raw.title) || `Iteration ${id}`,
    summary: text(raw.summary),
    kind:    text(raw.kind),
    model:   text(raw.model),
    journal: text(raw.journal),
    hero:    shotPath(dir, shots.hero),
    thumb:   shotPath(dir, shots.thumb),
  }]
}

/**
 * @param {unknown} raw
 * @returns {Manifest}
 */
export function parseManifest (raw) {
  const data = isRecord(raw) ? raw : {}
  const list = Array.isArray(data.iterations) ? data.iterations : []
  const repo = text(data.repo)
  return {
    repo:       REPO.test(repo) ? repo : '',
    iterations: list.flatMap(toIteration).sort((a, b) => a.id - b.id),
  }
}

/**
 * The request for the manifest: the one the page's head made before this
 * module had arrived (`index.html`), or a new one. The early one is taken
 * once, so asking again later asks the server again.
 *
 * @param {string} url
 * @returns {Promise<Response>}
 */
function request (url) {
  const page  = /** @type {{ sceneryManifest?: Promise<Response> }} */ /** @type {unknown} */ window
  const early = url === MANIFEST ? page.sceneryManifest : undefined

  delete page.sceneryManifest
  return early ?? fetch(url, { cache: 'no-cache' })
}

/**
 * @param {string} [url]
 * @returns {Promise<Manifest>}
 */
export async function loadManifest (url = MANIFEST) {
  const response = await request(url)
  if (!response.ok)
    throw new Error(`The manifest answered ${response.status}`)
  return parseManifest(await response.json())
}

/**
 * @param {string} repo
 * @param {Iteration} iteration
 * @returns {string}  '' when the journal link cannot be built
 */
export function journalUrl (repo, iteration) {
  if (!repo || !iteration.journal || !SHA.test(iteration.sha))
    return ''

  const path = iteration.journal.split('/').map(encodeURIComponent)
    .join('/')
  return `https://github.com/${repo}/blob/${iteration.sha}/${path}`
}

/**
 * @param {string} repo
 * @param {Iteration} from  the previous visible iteration
 * @param {Iteration} to
 * @returns {string}  '' when the diff link cannot be built
 */
export function compareUrl (repo, from, to) {
  if (!repo || !SHA.test(from.sha) || !SHA.test(to.sha))
    return ''
  return `https://github.com/${repo}/compare/${from.sha}...${to.sha}`
}
