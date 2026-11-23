// scripts/browser.ts
import { existsSync, readdirSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join, normalize, sep } from 'node:path'
import { chromium } from 'playwright-core'
import type { Browser } from 'playwright-core'

/**
 * Software rasterisation, on purpose.
 *
 * A real adapter draws the same scene slightly differently from one frame to
 * the next and very differently from one machine to the next, which makes every
 * visual diff a negotiation about how much noise counts as noise. SwiftShader
 * is slower and exactly reproducible, so a diff of zero means zero. It is also
 * the only renderer the cloud sandbox and the CI runner have.
 */
export const SOFTWARE_FLAGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-lcd-text',
]

/** A real GPU: faster, and not comparable between runs. For looking, never for diffing. */
export const GPU_FLAGS = [ '--ignore-gpu-blocklist', '--enable-gpu-rasterization' ]

export interface Server {
  port: number

  /** The address of the mount point, with a trailing slash. */
  url: string
  stop (): void
}

interface ServeOptions {

  /** 0 picks a free port, which is what a tool that may run beside another wants. */
  port?: number

  /** Path the directory is served under, such as `/scenery/`. */
  mount?: string
}

/**
 * A chromium this machine already has.
 *
 * `playwright-core` ships no browser on purpose: the cloud sandbox cannot reach
 * playwright's download host, and a hundred and fifty megabytes of browser has
 * no business in a repository whose own build is forty kilobytes. So the binary
 * is found rather than installed, most explicit source first: a named path, the
 * variable the cloud sandbox sets, the one GitHub's runners set, playwright's
 * own cache, then the browser the machine has for people to use.
 */
export function findChromium (): string {
  for (const name of [ 'PLAYWRIGHT_CHROMIUM', 'CHROME_PATH', 'CHROME_BIN' ]) {
    const named = process.env[name]

    if (named && existsSync(named))
      return named
  }

  const mac   = platform() === 'darwin'
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH ?? (mac
    ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
    : join(homedir(), '.cache', 'ms-playwright'))

  if (existsSync(cache)) {
    // Newest revision first: a cache that has been through a few playwright
    // upgrades holds several, and the old ones may not speak the current
    // protocol.
    const revisions = readdirSync(cache)
      .filter(name => name.startsWith('chromium-'))
      .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))

    for (const revision of revisions) {
      const candidates = mac
        ? [
          join(cache, revision, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          join(cache, revision, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        ]
        // Two layouts, because playwright renamed the directory partway
        // through the revisions this finder walks.
        : [
          join(cache, revision, 'chrome-linux64', 'chrome'),
          join(cache, revision, 'chrome-linux', 'chrome'),
        ]

      for (const candidate of candidates)
        if (existsSync(candidate))
          return candidate
    }
  }

  const installed = mac
    ? [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
    : [ '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser' ]

  for (const candidate of installed)
    if (existsSync(candidate))
      return candidate

  throw new Error('no chromium found · set PLAYWRIGHT_CHROMIUM=/path/to/chrome')
}

/** Run something with a browser, and close the browser whatever happens. */
export async function withBrowser<T> (gpu: boolean, run: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args:           gpu ? GPU_FLAGS : SOFTWARE_FLAGS,
  })

  try {
    return await run(browser)
  }
  finally {
    await browser.close()
  }
}

/**
 * Serve a directory and nothing else.
 *
 * Builds use relative paths throughout, so the same files work under any mount
 * point. Serving under one on purpose (`/scenery/`) is how a local check finds
 * the absolute path that would have worked at `/` and broken on Pages.
 */
export function serveStatic (dir: string, { port = 0, mount = '/' }: ServeOptions = {}): Server {
  const root = normalize(dir)

  const server = Bun.serve({
    port,
    hostname: '127.0.0.1',

    async fetch (request) {
      const path = decodeURIComponent(new URL(request.url).pathname)

      if (!path.startsWith(mount))
        return new Response('not found', { status: 404 })

      const inside = path.slice(mount.length)
      const target = normalize(join(root, inside.endsWith('/') || inside === '' ? `${inside}index.html` : inside))

      // A request may not climb out of the directory it was pointed at.
      if (target !== root && !target.startsWith(root + sep))
        return new Response('not found', { status: 404 })

      const file = Bun.file(target)

      return await file.exists() ? new Response(file) : new Response('not found', { status: 404 })
    },
  })

  const bound = server.port ?? port

  return { port: bound, url: `http://127.0.0.1:${bound}${mount}`, stop: () => void server.stop(true) }
}
