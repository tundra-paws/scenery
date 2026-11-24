# The library stack

Improvements to the scene library (`threejs-scenes`) that this world needed before upstream
had them. Each one is a file in `lib-stack/threejs-scenes/`. Together, in order, they are
applied to the copy in `node_modules`, so the world builds on the improved library today, and
each is written so that upstream can take it as it stands and ship it in a release.

The curator adds to this stack. The owner moves it upstream.

## Why it works

The npm package ships its TypeScript source (`lib/`) beside its build (`dist/`), and that
source is the same text the library's own repository keeps. An improvement edits the source.
The tools then rebuild `dist` for the files that changed, with the compiler and options
upstream builds with. So one file is both what runs here and what upstream merges.

## When to add one

While building the day's update, when the library is what is in the way:

- it is slow, and a profile or the gate's numbers say so;
- it is wrong, and you found the line;
- it lacks something general that you were about to write in `src/world/shared/` and that any
  scene would want (if only this world wants it, it belongs in `src/world`).

Do not work around the library in silence and do not patch `node_modules` by hand. Write the
improvement, apply it, and use it, in the same day's change. It is not a framework change.

One idea per file, small enough to review in a minute. Not a rewrite, not a restyle.

## An improvement

`lib-stack/threejs-scenes/NNNN-short-name.md`, numbered in the order they apply:

````markdown
---
title: createRenderer can cap the drawing buffer by pixel count
kind: feat
base: 3.0.0
released:
---

Why upstream should want this: what was measured or what broke, where, with numbers.
What it changes, and what stays exactly as it was. This prose is the pull request.

## lib/core/renderer.ts

```ts find
  pixelRatioMax?: number
```

```ts replace
  pixelRatioMax?: number

  /** Upper bound on the drawing buffer in device pixels. */
  maxPixels?: number
```
````

- `title` is one line as it would read in a changelog. `kind` is `perf`, `feat` or `fix`.
  `base` is the library version you wrote it against (`package.json`). Leave `released` empty.
- A `## lib/…/file.ts` heading names the file. Under it, every `find` block is followed by its
  `replace`. A `create` block alone writes a new file. Untagged blocks are prose.
- **`find` must occur exactly once**, in the file as the earlier edits and earlier
  improvements left it. Quote enough lines to make it so. Nothing is matched loosely: an edit
  that does not fit fails, loudly, and nothing is written.
- Copy `find` text from `node_modules/threejs-scenes/lib/`, never from memory and never from
  `dist/`. Match its style in `replace`: two spaces, no semicolons, TSDoc on what is exported.
- A new export also needs its line in `lib/index.ts`, which lists exports by name.

Then:

```sh
bun run stack           # apply; says which edit does not fit, or which line does not type-check
bun run api:digest      # the digest now shows what you added
```

## What a good one is

- **Backwards compatible.** New behaviour is a new option or a new function, off by default.
  A faster version of something existing returns the same values, and a test proves it.
- **Tested.** `NNNN-short-name.test.ts` beside it, importing from `threejs-scenes` as the world
  does. `bun test` runs it here and CI runs it on every push. What cannot run without a
  browser is covered by the gate; say which check in the prose.
- **Argued with evidence.** Numbers from a profile or the gate, and how they were taken.
  If you could not measure a gain, there is no improvement: drop it and note it below.
- **Type-correct.** `bun run stack` type-checks every file it changes and refuses errors.

## Commands

```sh
bun run stack                  # make node_modules match the stack (also after every install, and before every build)
bun run stack --check          # say whether it does; change nothing
bun run stack --list           # the improvements, in order
bun run stack --restore        # the package as published, with no stack
bun run stack --to <checkout>  # apply the stack to a checkout of the library (--dry to only report)
```

## Moving it upstream (the owner)

```sh
bun run stack --to ../threejs-scenes-skill --dry    # what would land, what conflicts
bun run stack --to ../threejs-scenes-skill          # write it: source only
```

Each improvement lands whole or is reported as a conflict and left alone. In the library's
checkout: review the diff, build, test, release. The prose of each file is its changelog entry.

After the release, set `released: 3.1.0` in each file that shipped. Once this repository's
dependency is at that version or later (a framework change), `bun run stack` skips those files
and says they can be deleted.

## Wanted, not yet written

Ideas too big for the day they came up. One line each: what, and the evidence.

- _(nothing yet)_

## Tried and dropped

So nobody spends a second day on them.

- **Compiling shaders after each module** (`renderer.compile` per module, then `gl.flush()`),
  to link programs while later modules build. No gain in Chromium on Metal: the first frame
  took 35 ms with and without it (2026-11-24). Firefox, where the first frame blocked 87 to
  90 ms on linking, was not re-measured.
