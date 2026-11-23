// scripts/gate/instrument.ts
/** The instrument as source text, ready for `addInitScript`. */
export const INSTRUMENT = `(${instrument.toString()})()`

/**
 * What a frame cost, counted from outside the page's own code.
 *
 * `renderer.info` is the obvious source and the wrong one for a gate. It is
 * reported by the build being judged, it resets on every render call so a post
 * chain only ever shows its last pass, and it knows nothing about objects a
 * module created and forgot. These numbers come from the WebGL calls themselves.
 */
export interface Census {

  /** Draw calls since the last reset. */
  draws: number

  /** Triangles submitted since the last reset. */
  triangles: number

  /** GPU objects created and not yet deleted. */
  live: Record<LiveKind, number>
}

export type LiveKind = 'buffers' | 'textures' | 'programs' | 'framebuffers' | 'renderbuffers' | 'vertexArrays'

declare global {
  interface Window {
    __GL__?: { read (): Census, reset (): void }
  }
}

/**
 * Runs in the page before any of its scripts.
 *
 * It is serialised and injected, so it must not close over anything in this
 * file: everything it needs is inside it.
 */
export function instrument (): void {
  const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: never[]) => unknown>

  const live = { buffers: 0, textures: 0, programs: 0, framebuffers: 0, renderbuffers: 0, vertexArrays: 0 }

  let draws     = 0
  let triangles = 0

  // TRIANGLES is 4, TRIANGLE_STRIP 5, TRIANGLE_FAN 6. Points and lines are draw
  // calls but not triangles.
  const count = (mode: number, vertices: number, instances: number): void => {
    draws += 1

    if (mode === 4)
      triangles += Math.floor(vertices / 3) * instances
    else if (mode === 5 || mode === 6)
      triangles += Math.max(0, vertices - 2) * instances
  }

  const wrap = (name: string, before: (args: number[]) => void): void => {
    const original = proto[name]

    if (!original)
      return

    proto[name] = function wrapped (this: unknown, ...args: never[]) {
      before(args as unknown as number[])

      return original.apply(this, args)
    }
  }

  wrap('drawArrays', args => count(args[0]!, args[2]!, 1))
  wrap('drawElements', args => count(args[0]!, args[1]!, 1))
  wrap('drawRangeElements', args => count(args[0]!, args[3]!, 1))
  wrap('drawArraysInstanced', args => count(args[0]!, args[2]!, args[3]!))
  wrap('drawElementsInstanced', args => count(args[0]!, args[1]!, args[4]!))

  const pairs: [string, string, keyof typeof live][] = [
    [ 'createBuffer', 'deleteBuffer', 'buffers' ],
    [ 'createTexture', 'deleteTexture', 'textures' ],
    [ 'createProgram', 'deleteProgram', 'programs' ],
    [ 'createFramebuffer', 'deleteFramebuffer', 'framebuffers' ],
    [ 'createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers' ],
    [ 'createVertexArray', 'deleteVertexArray', 'vertexArrays' ],
  ]

  for (const [ create, destroy, kind ] of pairs) {
    wrap(create, () => {
      live[kind] += 1
    })

    wrap(destroy, args => {
      // Deleting null is legal and frees nothing.
      if (args[0])
        live[kind] -= 1
    })
  }

  // Multi-draw (what BatchedMesh uses) lives on an extension object rather than
  // the prototype, so it is wrapped as the extension is handed out. One call is
  // one draw however many ranges it carries.
  const getExtension = proto.getExtension

  if (getExtension)
    proto.getExtension = function wrapped (this: unknown, ...args: never[]) {
      const extension = getExtension.apply(this, args) as Record<string, unknown> | null
      const name      = String((args as unknown as string[])[0])

      if (extension && name === 'WEBGL_multi_draw' && !extension.__counted) {
        extension.__counted = true

        for (const method of [ 'multiDrawArraysWEBGL', 'multiDrawElementsWEBGL', 'multiDrawArraysInstancedWEBGL', 'multiDrawElementsInstancedWEBGL' ]) {
          const original = extension[method] as ((...inner: unknown[]) => unknown) | undefined

          if (!original)
            continue

          extension[method] = (...inner: unknown[]) => {
            const mode   = inner[0] as number
            const counts = inner[method.includes('Arrays') ? 3 : 1] as ArrayLike<number>
            const ranges = inner[inner.length - 1] as number

            draws += 1

            for (let index = 0; index < ranges; index += 1)
              if (mode === 4)
                triangles += Math.floor((counts[index] ?? 0) / 3)

            return original.apply(extension, inner)
          }
        }
      }

      return extension
    }

  window.__GL__ = {
    read: () => ({ draws, triangles, live: { ...live }}),

    reset () {
      draws     = 0
      triangles = 0
    },
  }
}
