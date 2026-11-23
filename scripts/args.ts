// scripts/args.ts

/**
 * A parsed command line.
 *
 * Deliberately tiny and shared by every tool rather than pulled from a package:
 * the whole surface is `--flag` and `--key value`, and each of these scripts is
 * a debugging instrument that has to keep working when the dependency tree is
 * exactly what is under suspicion.
 */
export interface Args {
  has (name: string): boolean
  str (name: string, fallback: string): string
  str (name: string): string | undefined
  num (name: string, fallback: number): number

  /** A comma-separated value as a list, or the fallback when the flag is absent. */
  csv (name: string, fallback: readonly string[]): string[]

  /** Everything that was not a `--flag` or a flag's value. */
  rest: string[]
}

export function parseArgs (argv: readonly string[]): Args {
  const flags          = new Map<string, string[]>()
  const rest: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!

    if (!token.startsWith('--')) {
      rest.push(token)
      continue
    }

    // `--key=value` and `--key value` are the same thing. The second form is
    // what a person types and the first is what survives being pasted into a
    // shell script, so both have to work.
    const equals = token.indexOf('=')
    const name   = equals === -1 ? token.slice(2) : token.slice(2, equals)
    const next   = argv[index + 1]
    let value    = equals === -1 ? undefined : token.slice(equals + 1)

    if (value === undefined && next !== undefined && !next.startsWith('--')) {
      value = next
      index += 1
    }

    const held = flags.get(name) ?? []

    held.push(value ?? '')
    flags.set(name, held)
  }

  function str (name: string, fallback?: string): string | undefined {
    const held = flags.get(name)

    return held?.length ? held[held.length - 1] : fallback
  }

  return {
    rest,
    str: str as Args['str'],
    has: name => flags.has(name),

    num (name, fallback) {
      const value = Number(str(name))

      return str(name) !== undefined && Number.isFinite(value) ? value : fallback
    },

    csv (name, fallback) {
      const value = str(name)

      return value
        ? value.split(',').map(part => part.trim())
          .filter(Boolean)
        : [ ...fallback ]
    },
  }
}
