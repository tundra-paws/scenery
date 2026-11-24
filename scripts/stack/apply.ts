// scripts/stack/apply.ts
// Node built-ins only: the vite config imports this, and vite may run under node.
import type { Edit, Improvement } from './parse.ts'

/**
 * What became of one improvement.
 *
 * `applied`: every edit landed. `present`: the source already reads as the
 * improvement leaves it, which is what an upstream checkout says once the
 * change has been ported. `conflict`: an edit no longer fits, and none of the
 * improvement was written.
 */
export interface Outcome {
  id:       string
  status:   'applied' | 'present' | 'conflict'
  problems: string[]

  /** Files the improvement changed or created, relative to the package. */
  files: string[]

  /** Edits whose result was already in the source. Zero on a pristine package. */
  already: number
}

/** The sources an improvement is applied to: a package on disk, or a few strings in a test. */
export interface Sources {
  read (file: string): string | null
  write (file: string, text: string): void
}

type Step = { text: string, landed: boolean } | { problem: string }

function occurrences (text: string, find: string): number {
  let count = 0

  for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + find.length))
    count += 1

  return count
}

function stepOf (edit: Edit, current: string | null): Step {
  if (edit.kind === 'create') {
    if (current === null)
      return { text: edit.text, landed: true }

    return current === edit.text
      ? { text: current, landed: false }
      : { problem: `${edit.file} already exists and is not what line ${edit.line} would create` }
  }

  if (current === null)
    return { problem: `${edit.file} does not exist (line ${edit.line})` }

  const count = occurrences(current, edit.find)
  const there = edit.text.trim() !== '' && current.includes(edit.text)

  // Already applied: the result is there and the anchor is gone, or the edit
  // keeps its anchor and adds beside it, in which case the anchor still
  // matches afterwards and the edit must not land a second time.
  if (there && (count === 0 || edit.text.includes(edit.find)))
    return { text: current, landed: false }

  if (count === 1)
    return { text: current.replace(edit.find, () => edit.text), landed: true }

  return {
    problem: count === 0
      ? `${edit.file}: the "find" at line ${edit.line} is not in the file`
      : `${edit.file}: the "find" at line ${edit.line} occurs ${count} times; quote more of the place so it occurs once`,
  }
}

/**
 * Apply one improvement, whole or not at all.
 *
 * Edits are staged in order against what the earlier ones left, and written
 * only if every one of them fits. A half-applied improvement would be a third
 * version of the library that neither this repository nor upstream ever meant.
 */
export function applyImprovement (sources: Sources, improvement: Improvement): Outcome {
  const staged             = new Map<string, string | null>()
  const problems: string[] = []
  const changed            = new Set<string>()
  let already              = 0

  for (const edit of improvement.edits) {
    const current = staged.has(edit.file) ? staged.get(edit.file)! : sources.read(edit.file)
    const step    = stepOf(edit, current)

    if ('problem' in step) {
      problems.push(step.problem)
      continue
    }

    staged.set(edit.file, step.text)

    if (step.landed)
      changed.add(edit.file)
    else
      already += 1
  }

  if (problems.length > 0)
    return { id: improvement.id, status: 'conflict', problems, files: [], already }

  for (const file of changed)
    sources.write(file, staged.get(file)!)

  return { id: improvement.id, status: changed.size > 0 ? 'applied' : 'present', problems, files: [ ...changed ], already }
}

/** Sources held in memory over a reader, so a whole stack can be tried before a byte is written. */
export function overlay (read: (file: string) => string | null): Sources & { changed: Map<string, string> } {
  const changed = new Map<string, string>()

  return {
    changed,
    read:  file => changed.get(file) ?? read(file),
    write: (file, text) => void changed.set(file, text),
  }
}
