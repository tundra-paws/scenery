# Code Style

`@tuomashatakka/eslint-config` for TypeScript + Semantic Nodes for CSS. `bun run lint`
runs `eslint . --max-warnings 0`, so a style warning fails the build as hard as an error.
Run `bunx eslint --fix <file>` before delivering code.

## TypeScript

- **No semicolons** at statement ends.
- **Two-space indent**.
- **Trailing commas** on multi-line arrays/objects (`only-multiline`).
- **Single quotes** for strings; backticks for template literals.
- **Spacing**: `[ a, b ]` inside array brackets, `{ a, b }` inside object braces, a space
  before the paren of a function (`function build (ctx) {`), arrow parens only when needed
  (`x => x * 2`), `stroustrup` brace style (`}` newline `else {`), two blank lines after the
  import block, no padded blocks, `key:  value` aligned in multi-line objects.
- **`function` keyword** for pure top-level utilities; arrow functions inside factories and
  as callbacks.
- **No `any`** — use `unknown` + narrowing, or a discriminated union.
- **Limits**: at most 666 lines per file (comments and blank lines excluded), complexity
  14, 40 statements per function. Split a module before it hits them.
- `tsc` runs with `strict`, `noUnusedLocals`, `noUnusedParameters` (prefix unused parameters
  with `_`) and `erasableSyntaxOnly`: no `enum`, no namespaces, no constructor parameter
  properties. Use `as const` objects and unions.

## TypeScript Specifics

- Union types and `as const` over `enum`.
- `Map` / `Set` over plain objects for keyed collections with churn.
- Discriminated unions over optional-prop overloading.
- Branded types for IDs (`type InstanceId = number & { __brand: 'instance' }`).
- Every public factory takes a typed options object as its single argument with defaults
  destructured in the signature.

```ts
type GrassFieldOptions = {
  count:  number
  radius: number
  seed?:  number
}

export function createGrassField ({
  count, radius, seed = 1,
}: GrassFieldOptions) { /* … */ }
```

## File Header

Every source file begins with a one-line path comment:

```ts
// src/world/features/grass-field/index.ts
```

## Module notes

Non-trivial modules end with a `// perf:` note: expected draw-call class, per-tick cost and
memory footprint, e.g. `// perf: medium. 1 draw call, O(capacity) CPU per tick.`

## Imports

- Third-party first, alphabetized.
- Blank line.
- Local imports, alphabetized.
- No barrel files (re-export-only `index.ts`) — they kill tree-shaking and break
  jump-to-definition. A feature's `index.ts` exports the feature factory itself.
- Three only as `'three'` and `'three/addons/...'`; library code from `'threejs-scenes'` or
  its subpaths (`/core`, `/primitives`, `/raster`, `/compose`, `/state`).

```ts
import * as THREE from 'three'
import { createNoise3D } from 'threejs-scenes/primitives'

import { createBillboardMaterial } from './material'
```

## Naming Conventions

- **`kebab-case.ts`** for all source files and directories.
- **`camelCase`** for variables, function names, factory outputs.
- **`PascalCase`** for types and classes.
- **`UPPER_SNAKE_CASE`** for module-level constants.
- **`u<Name>`** prefix for shader uniform names (`uTime`, `uIntensity`).
- **`a<Name>`** prefix for shader attribute names (`aPhase`, `aColor`).
- **`v<Name>`** prefix for shader varying names (`vUv`, `vNormal`).

## Tests

- Unit tests next to the file under test as `<name>.test.ts` (run with `bun test`; the
  determinism lint rules do not apply to tests).
- Pure math, RNG, and geometry-array builders are easy to test — write assertions for shape,
  count, and bounds.
- Skip tests for shader strings.
- Skip tests for entire scenes — write smoke tests that import the feature factory without
  throwing.

## CSS — Semantic Nodes Style Guide

DOM UI over the canvas lives in a single global stylesheet entrypoint that imports tokens,
base elements, and feature stylesheets.

- **HTML5 landmark elements**: `header`, `main`, `nav`, `dialog`, `article`, `section`,
  `aside`, `footer`. Avoid div-soup.
- **Tag selectors over class selectors**: style `button`, `h1`, `nav a` directly. Use
  classes only for variants that can't be modeled with attributes.
- **CSS custom-property tokens** for every value that might repeat. Define in `:root` under
  a single `@layer tokens`.
- **`@layer`** for cascade discipline: `@layer reset, tokens, base, layout, components,
  utilities;`.
- **CSS nesting** (native, not Sass) wherever it improves readability.
- **`@property`** for animated custom properties so they can be transitioned.
- **Mobile-first media queries**: base styles target small screens, scale up with
  `@media (min-width: …)`.
- **Use `block` / `inline-block`** before reaching for flex/grid.
- **Pointer events only** for any interaction, `touch-action: none` on the canvas.
- **System fonts only** (`system-ui`, `ui-monospace`): no web fonts, no font CDN.

## Forbidden

- **Tailwind**
- **Shadcn / Radix**
- **CSS Modules**
- **styled-components / emotion / vanilla-extract / any CSS-in-JS**
- **Inline `style=""` attributes** (except for values that must be set per tick from JS —
  and even then, prefer custom properties)
- **`className` as a styling prop**

## Example Token File

```css
/* style/tokens.css */
@layer tokens {
  :root {
    /* color */
    --color-bg:          oklch(8% 0.02 270);
    --color-fg:          oklch(95% 0.01 270);
    --color-accent:      oklch(72% 0.18 175);
    --color-accent-alt:  oklch(72% 0.16 290);

    /* typography */
    --font-display: system-ui, sans-serif;
    --font-body:    system-ui, sans-serif;
    --font-mono:    ui-monospace, monospace;

    /* space */
    --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
    --space-4: 16px; --space-6: 24px; --space-8: 32px;

    /* surfaces */
    --surface-glass: oklch(20% 0.03 270 / 0.6);
    --surface-line:  oklch(40% 0.02 270 / 0.4);

    /* motion */
    --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
    --duration-fast:  120ms;
    --duration-med:   280ms;
    --duration-slow:  680ms;
  }
}
```

## Example Base File

```css
/* style/base.css */
@layer base {
  html, body { margin: 0; height: 100%; background: var(--color-bg); color: var(--color-fg); font-family: var(--font-body) }
  canvas    { display: block; width: 100%; height: 100%; touch-action: none }
  h1, h2, h3 { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.02em }
  button    { background: transparent; color: inherit; font: inherit; border: 1px solid var(--surface-line); padding: var(--space-2) var(--space-4); cursor: pointer }
  button:hover { border-color: var(--color-accent) }
}
```
