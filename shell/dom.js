// shell/dom.js
// @ts-check

/**
 * @template {Element} T
 * @param {string} selector
 * @param {new () => T} type
 * @param {ParentNode} [root]
 * @returns {T}
 */
export function pick (selector, type, root = document) {
  const found = root.querySelector(selector)
  if (!(found instanceof type))
    throw new Error(`The page is missing ${selector}`)
  return found
}

/**
 * Builds an element. Children given as strings become text nodes, never markup,
 * so nothing from the manifest is ever parsed as HTML.
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string>} [attrs]
 * @param {Array<Node | string>} [children]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function make (tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [ name, value ] of Object.entries(attrs))
    node.setAttribute(name, value)
  node.append(...children)
  return node
}

/**
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatDate (iso, options) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(date)
}

/**
 * @param {string} key
 * @returns {string | null}
 */
export function readPref (key) {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
export function writePref (key, value) {
  try {
    localStorage.setItem(key, value)
  }
  catch {
    // storage is blocked or full; the choice just will not be remembered
  }
}
