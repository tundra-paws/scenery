// src/world/shared/amend.ts
import type * as THREE from 'three'

/** What `onBeforeCompile` is handed: a built-in material's shader, still editable. */
export type Shader = Parameters<THREE.Material['onBeforeCompile']>[0]

/**
 * Add to a built-in material's shader, on top of whatever was added before.
 *
 * `onBeforeCompile` is a single slot, so two features that each want a say in
 * one material (the grass sways and is shaded by clouds) would otherwise
 * overwrite each other. `key` names the amendment for three's program cache:
 * two materials share a compiled program only if they were amended alike.
 */
export function amendShader (material: THREE.Material, key: string, amend: (shader: Shader) => void): void {
  const compile  = material.onBeforeCompile
  const cacheKey = material.customProgramCacheKey

  material.onBeforeCompile = function onBeforeCompile (shader, renderer) {
    compile.call(this, shader, renderer)
    amend(shader)
  }

  material.customProgramCacheKey = function customProgramCacheKey () {
    return `${cacheKey.call(this)}+${key}`
  }
}

/**
 * `source` with `addition` on the line after `anchor`.
 *
 * Throws when the anchor is missing. A shader chunk renamed by a three upgrade
 * should stop the build, not quietly leave the grass standing still.
 */
export function insertAfter (source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor))
    throw new Error(`the shader has no "${anchor}" to add after`)

  return source.replace(anchor, `${anchor}\n${addition}`)
}
