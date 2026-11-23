// vite.config.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { HtmlTagDescriptor, Plugin } from 'vite'


const THREE_VERSION = (JSON.parse(readFileSync(at('node_modules/three/package.json'), 'utf8')) as { version: string }).version

/** Where the shared copy of three lives, relative to the site root. */
const VENDOR_DIR = `v/three@${THREE_VERSION}`

/** three's own minified build, entry first. The entry imports the core by relative path. */
const VENDOR_FILES = [ 'three.module.min.js', 'three.core.min.js' ]

/**
 * How far an iteration sits below the site root.
 *
 * Every iteration is published at `i/NNNN/`, two directories down, and the
 * vendor directory sits at the root beside `i/`. `vite preview` serves `dist`
 * at `/`, where the same `../../` clamps at the root and still lands on
 * `dist/v/`. So one HTML file is correct in both places and nothing downstream
 * ever has to rewrite it.
 */
const UP = '../../'

/** A path inside the repository, wherever the build is run from. */
function at (path: string): string {
  return fileURLToPath(new URL(path, import.meta.url))
}

/**
 * Ship three as a shared file instead of bundling it.
 *
 * A bundled three is 700 KB that changes hash whenever the world imports one
 * more class, which means every daily snapshot would carry its own copy and the
 * site would hit the Pages size cap in about three years. Left external and
 * resolved through an import map, it is the byte-for-byte npm build, stored once
 * per three version and shared by every iteration that used it.
 */
function vendorThree (): Plugin {
  return {
    name:  'scenery:vendor-three',
    apply: 'build',

    transformIndexHtml (): HtmlTagDescriptor[] {
      const map = { imports: { three: `${UP}${VENDOR_DIR}/${VENDOR_FILES[0]}` }}

      return [
        { tag: 'script', attrs: { type: 'importmap' }, children: JSON.stringify(map), injectTo: 'head-prepend' },
        ...VENDOR_FILES.map((file): HtmlTagDescriptor => ({
          tag:      'link',
          attrs:    { rel: 'modulepreload', href: `${UP}${VENDOR_DIR}/${file}` },
          injectTo: 'head',
        })),
      ]
    },

    generateBundle () {
      for (const file of VENDOR_FILES)
        this.emitFile({
          type:     'asset',
          fileName: `${VENDOR_DIR}/${file}`,
          source:   readFileSync(at(`node_modules/three/build/${file}`)),
        })
    },
  }
}

export default defineConfig({
  base: './',

  resolve: {
    // The frame loop the library uses ships its React hooks in the same module
    // as the loop itself, and React declares no `sideEffects`, so the import
    // survives tree-shaking and drags React into a page that never renders a
    // component. Nothing here calls those hooks; the shim exports the names and
    // nothing else.
    alias: { react: at('src/shims/react.ts') },
  },

  build: {
    assetsDir:       'a',
    rolldownOptions: { external: [ 'three' ]},
  },

  plugins: [ vendorThree() ],

  server:  { port: 4180, strictPort: true },
  preview: { port: 4180, strictPort: true },
})
