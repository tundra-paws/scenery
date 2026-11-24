// vite.config.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { HtmlTagDescriptor, Plugin } from 'vite'

import { ensureStack } from './scripts/stack/install.ts'


const THREE_VERSION = (JSON.parse(readFileSync(at('node_modules/three/package.json'), 'utf8')) as { version: string }).version

/** Where the shared copy of three lives, relative to the site root. */
const VENDOR_DIR = `v/three@${THREE_VERSION}`

/** The core every build of three shares. Each entry imports it by relative path. */
const CORE_FILE = 'three.core.min.js'

/**
 * three's two renderers, each as its own minified entry.
 *
 * `three` itself is the WebGL renderer and its GLSL materials. `three/webgpu`
 * is the renderer that draws node materials, and `three/tsl` the language
 * they are written in (it imports `three/webgpu` by that name). A world uses
 * one or the other: which is read off what the bundle imports.
 */
const CLASSIC_FILE = 'three.module.min.js'
const NODES_FILE   = 'three.webgpu.min.js'
const TSL_FILE     = 'three.tsl.min.js'

/** What a world may import of three and leave to the import map. */
const NODE_ENTRIES = [ 'three/webgpu', 'three/tsl' ]
const SHARED       = [ 'three', ...NODE_ENTRIES ]

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

/** What `generateBundle` and `transformIndexHtml` are handed: enough of it to read each chunk's imports. */
type Bundle = Record<string, { type: string, imports?: string[] }>

/** A path inside the repository, wherever the build is run from. */
function at (path: string): string {
  return fileURLToPath(new URL(path, import.meta.url))
}

/** Whether the world is written in node materials: something in it imports `three/webgpu` or `three/tsl`. */
function usesNodes (bundle: Bundle | undefined): boolean {
  return Object.values(bundle ?? {}).some(chunk => chunk.type === 'chunk' && (chunk.imports ?? []).some(name => NODE_ENTRIES.includes(name)))
}

/** three's build files this world needs, entry first. */
function vendorFiles (nodes: boolean): string[] {
  return nodes ? [ NODES_FILE, TSL_FILE, CORE_FILE ] : [ CLASSIC_FILE, CORE_FILE ]
}

/**
 * Ship three as shared files instead of bundling it.
 *
 * A bundled three is 700 KB that changes hash whenever the world imports one
 * more class, which means every daily snapshot would carry its own copy and the
 * site would hit the Pages size cap in about three years. Left external and
 * resolved through an import map, it is the byte-for-byte npm build, stored once
 * per three version and shared by every iteration that used it.
 *
 * A world in node materials gets the node build for all three names, so
 * `three` and `three/webgpu` are one module and there is still one three.
 */
function vendorThree (): Plugin {
  const url = (file: string): string => `${UP}${VENDOR_DIR}/${file}`

  return {
    name:  'scenery:vendor-three',
    apply: 'build',

    transformIndexHtml: {
      order: 'post',

      handler (_html, { bundle }): HtmlTagDescriptor[] {
        const nodes   = usesNodes(bundle as Bundle | undefined)
        const imports = nodes
          ? { 'three': url(NODES_FILE), 'three/webgpu': url(NODES_FILE), 'three/tsl': url(TSL_FILE) }
          : { three: url(CLASSIC_FILE) }

        return [
          { tag: 'script', attrs: { type: 'importmap' }, children: JSON.stringify({ imports }), injectTo: 'head-prepend' },
          ...vendorFiles(nodes).map((file): HtmlTagDescriptor => ({
            tag:      'link',
            attrs:    { rel: 'modulepreload', href: url(file) },
            injectTo: 'head',
          })),
        ]
      },
    },

    generateBundle (_options, bundle) {
      for (const file of vendorFiles(usesNodes(bundle as Bundle)))
        this.emitFile({
          type:     'asset',
          fileName: `${VENDOR_DIR}/${file}`,
          source:   readFileSync(at(`node_modules/three/build/${file}`)),
        })
    },
  }
}

/**
 * Build on the library as the stack leaves it, never on a stale one.
 *
 * `lib-stack/` holds improvements to the scene library that upstream has not
 * shipped yet. They are applied to the installed package after every install;
 * this applies them again before every build and every dev server, which costs
 * a fingerprint when nothing changed and catches an entry edited since.
 */
function libraryStack (): Plugin {
  return {
    name: 'scenery:library-stack',

    async config () {
      const report = await ensureStack(at('.'))

      if (report.status === 'failed')
        throw new Error(`the library stack does not apply:\n  ${report.problems.join('\n  ')}\nfix the entry in lib-stack/ and run \`bun run stack\``)
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
    rolldownOptions: { external: SHARED },
  },

  plugins: [ libraryStack(), vendorThree() ],

  server:  { port: 4180, strictPort: true },
  preview: { port: 4180, strictPort: true },
})
