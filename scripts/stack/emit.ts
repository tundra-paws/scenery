// scripts/stack/emit.ts
// Node built-ins and typescript only: the vite config imports this, and vite may run under node.
import { join } from 'node:path'

/**
 * The compiler options the library is built with upstream (`tsconfig.json` in
 * its repository), so a file rebuilt here reads like the files beside it that
 * were built there.
 */
const OPTIONS = {
  target:                           'ES2022',
  module:                           'ESNext',
  moduleResolution:                 'bundler',
  lib:                              [ 'ES2022', 'DOM', 'DOM.Iterable' ],
  types:                            [],
  declaration:                      true,
  declarationMap:                   true,
  sourceMap:                        true,
  outDir:                           'dist',
  rootDir:                          'lib',
  strict:                           true,
  noImplicitAny:                    true,
  noUncheckedIndexedAccess:         false,
  exactOptionalPropertyTypes:       false,
  esModuleInterop:                  true,
  skipLibCheck:                     true,
  forceConsistentCasingInFileNames: true,
  verbatimModuleSyntax:             false,
  isolatedModules:                  true,
  jsx:                              'react-jsx',
  jsxImportSource:                  'threejs-scenes/jsx',

  paths: {
    'threejs-scenes/jsx/jsx-runtime': [ './lib/jsx/jsx-runtime.ts' ],
    'threejs-scenes/jsx':             [ './lib/jsx/index.ts' ],
  },
}

/** What `tsc` writes for one source file, relative to the package. */
export function outputsOf (file: string): string[] {
  const stem = file.replace(/^lib\//u, 'dist/').replace(/\.ts$/u, '')

  return [ `${stem}.js`, `${stem}.js.map`, `${stem}.d.ts`, `${stem}.d.ts.map` ]
}

/**
 * Rebuild `dist` for the sources the stack changed, and say what is wrong with them.
 *
 * The package ships its TypeScript beside its build, and the stack edits the
 * TypeScript: that is the text upstream keeps, so an improvement moves there
 * unchanged. Everything here runs on the build, so the build is made again
 * from the edited source, with the compiler and the options upstream uses.
 *
 * Nothing is written unless every changed file is free of errors: a library
 * that fails its own type check is not an improvement, here or upstream.
 *
 * @returns Problems, one per line. Empty when the files were written.
 */
export async function emit (home: string, files: readonly string[]): Promise<string[]> {
  // Loaded here, not at the top: an install whose stack is already in place
  // must not pay for the compiler.
  const { default: ts } = await import('typescript')
  const { options }     = ts.convertCompilerOptionsFromJson(OPTIONS, home)
  const program         = ts.createProgram(files.map(file => join(home, file)), options)
  const problems        = []

  for (const file of files) {
    const source = program.getSourceFile(join(home, file))

    if (!source) {
      problems.push(`${file}: not part of the program`)
      continue
    }

    for (const diagnostic of [ ...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source) ]) {
      const line = diagnostic.start === undefined ? 0 : source.getLineAndCharacterOfPosition(diagnostic.start).line + 1

      problems.push(`${file}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`)
    }
  }

  if (problems.length > 0)
    return problems

  for (const file of files)
    program.emit(program.getSourceFile(join(home, file)))

  return []
}
