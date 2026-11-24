// scripts/stack/parse.ts
// Node built-ins only: the vite config imports this, and vite may run under node.

/** What an improvement may be. The word goes into the upstream changelog. */
export const KINDS = [ 'perf', 'feat', 'fix' ]

/** `lib/core/app.ts`: a TypeScript source inside the package, never a way out of it. */
const SOURCE = /^lib\/(?:[\w-]+\/)*[\w.-]+\.ts$/u

const VERSION = /^\d+\.\d+\.\d+$/u

/** `## lib/core/app.ts`, with or without backticks round the path. */
const HEADING = /^##\s+`?([^`\s]+)`?\s*$/u

const FENCE = /^(`{3,})(.*)$/u

const TAGS = [ 'find', 'replace', 'create' ]

/**
 * One exact change to one file.
 *
 * `replace` swaps the single place `find` occurs for `text`. `create` writes a
 * file that is not there yet. Nothing is matched loosely: an edit that no longer
 * fits says so instead of landing somewhere near.
 */
export interface Edit {
  file: string
  kind: 'replace' | 'create'
  find: string
  text: string

  /** Line of the block in the improvement's own file, for error messages. */
  line: number
}

/** One entry of the stack: a markdown file that is both the argument and the change. */
export interface Improvement {

  /** The file name without `.md`. It sorts, and the order is the order of application. */
  id:    string
  title: string
  kind:  string

  /** The package version the edits were written against. */
  base: string

  /** The upstream version that ships this, once one does. Empty until then. */
  released: string

  /** Everything between the front matter and the first file heading. */
  prose: string
  edits: Edit[]

  /** The file as written, which is what the stack's fingerprint is taken from. */
  source: string
}

interface Block {
  tag:  string
  text: string
  line: number
}

interface Section {
  file:   string
  blocks: Block[]
}

/** The `key: value` head of a file, what follows it, and how many lines the head took. */
interface FrontMatter {
  fields: Record<string, string>
  body:   string
  offset: number
}

/** The body of a file: the argument, then the sections that hold its edits. */
interface Body {
  prose: string
  found: Section[]
}

/** Why an improvement cannot be read or applied, in words its author can act on. */
export class StackError extends Error {
  override name = 'StackError'
}

function frontMatter (id: string, source: string): FrontMatter {
  const match = (/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u).exec(source)

  if (!match)
    throw new StackError(`${id}: no front matter (--- title / kind / base ---)`)

  const fields: Record<string, string> = {}

  for (const line of match[1]!.split(/\r?\n/u)) {
    const colon = line.indexOf(':')

    if (colon !== -1 && !line.trimStart().startsWith('#'))
      fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
        .replace(/^(["'])(.*)\1$/u, '$2')
  }

  return { fields, body: source.slice(match[0].length), offset: match[0].split('\n').length - 1 }
}

/** The tagged code blocks of the body, under the file heading each belongs to. */
function sections (id: string, body: string, offset: number): Body {
  const lines            = body.split(/\r?\n/u)
  const found: Section[] = []
  let prose              = lines.length

  for (let index = 0; index < lines.length; index += 1) {
    const heading = HEADING.exec(lines[index]!)
    const fence   = FENCE.exec(lines[index]!)

    if (heading) {
      prose = Math.min(prose, SOURCE.test(heading[1]!) ? index : prose)
      found.push({ file: heading[1]!, blocks: []})
      continue
    }

    if (!fence)
      continue

    const close = lines.findIndex((line, at) => at > index && line.startsWith(fence[1]!) && line.trim().replaceAll('`', '') === '')

    if (close === -1)
      throw new StackError(`${id}:${index + offset + 1}: a code block is never closed`)

    const tag = fence[2]!.trim().split(/\s+/u)
      .at(-1) ?? ''

    if (TAGS.includes(tag)) {
      const section = found.at(-1)

      if (!section || !SOURCE.test(section.file))
        throw new StackError(`${id}:${index + offset + 1}: a "${tag}" block needs a "## lib/…/file.ts" heading above it`)

      section.blocks.push({ tag, text: lines.slice(index + 1, close).join('\n'), line: index + offset + 1 })
    }

    index = close
  }

  return { prose: lines.slice(0, prose).join('\n')
    .trim(),
  found }
}

function editsOf (id: string, { file, blocks }: Section): Edit[] {
  const edits: Edit[] = []

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!
    const next  = blocks[index + 1]

    if (block.tag === 'create') {
      edits.push({ file, kind: 'create', find: '', text: `${block.text}\n`, line: block.line })
      continue
    }

    if (block.tag !== 'find' || next?.tag !== 'replace')
      throw new StackError(`${id}:${block.line}: blocks come as a "find" followed by its "replace", or as one "create"`)

    if (block.text.trim() === '')
      throw new StackError(`${id}:${block.line}: an empty "find" matches everywhere`)

    edits.push({ file, kind: 'replace', find: block.text, text: next.text, line: block.line })
    index += 1
  }

  return edits
}

/**
 * Read one improvement.
 *
 * The file is markdown on purpose: the prose is the argument a maintainer reads,
 * the fenced blocks are the change a tool applies, and source code inside a
 * fence needs no escaping, whatever backticks and `${}` it holds.
 */
export function parseImprovement (id: string, source: string): Improvement {
  const { fields, body, offset }                            = frontMatter(id, source)
  const { prose, found }                                    = sections(id, body, offset)
  const edits                                               = found.flatMap(section => editsOf(id, section))
  const { title = '', kind = '', base = '', released = '' } = fields

  if (!title)
    throw new StackError(`${id}: title is required (one line, as it would read in a changelog)`)

  if (!KINDS.includes(kind))
    throw new StackError(`${id}: kind must be one of ${KINDS.join(', ')}`)

  if (!VERSION.test(base))
    throw new StackError(`${id}: base must be the package version the edits were written against, such as 3.0.0`)

  if (released && !VERSION.test(released))
    throw new StackError(`${id}: released must be a version, such as 3.1.0, or be left empty`)

  if (edits.length === 0)
    throw new StackError(`${id}: no edits (a "## lib/…/file.ts" heading, then find and replace blocks)`)

  return { id, title, kind, base, released, prose, edits, source }
}

/** Whether version `a` is `b` or later. */
export function atLeast (a: string, b: string): boolean {
  const left  = a.split('.').map(Number)
  const right = b.split('.').map(Number)

  for (let index = 0; index < 3; index += 1)
    if ((left[index] ?? 0) !== (right[index] ?? 0))
      return (left[index] ?? 0) > (right[index] ?? 0)

  return true
}
