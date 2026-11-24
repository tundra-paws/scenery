---
title: A faster start, and a stack of library improvements
summary: The world starts in two thirds of the time and a reload builds it once, not twice. Changes to the scene library now live in lib-stack/ until upstream ships them.
kind: framework
model: Claude Fable 5.2
---

**Why.** The owner profiled a reload of the site in Firefox. The world took 962 ms to appear,
430 ms of it a second boot that was thrown away; half of each 375 ms boot was the library's
noise function; and on a 120 Hz display every second frame drawn was a repeat. This is the
owner's change, made with them in one sitting, so it carries framework, shell and world
together where a curator's day would not.

**The picture is the same.** Before and after, `hero` and the ten other views are not told
apart by eye: 3 to 17% of pixels differ by an amount below `diff`'s threshold, all of it the
line where grass turns to rock. Every tuft, boulder and wave is where it was. 21 draws and
175k triangles on desktop, as before.

**What changed.**

- *One boot per reload* (`shell/shell.js`). Firefox puts the frame back where it was on a
  reload, while the page is still fresh in its cache; the shell then sent it there again.
  It now adopts a frame that is already showing the iteration. In headless Firefox, worlds
  started per reload: 2 before, 1 after. The shell also preloads its three modules and asks
  for `iterations.json` from the document's head.
- *One sample of the land per grid corner* (`shared/height-grid.ts`, on `world.grid`). The
  terrain asked `ground` five times a vertex, four of them for a slope, and the water asked
  again for its height map. Both read the grid now, bit for bit the same heights. The slope
  is taken across the grid's neighbours, which is the one thing that moved in the picture.
- *A slope only when someone asks* (`shared/scatter.ts`). `Spot.slope` is worked out on first
  read. The tuft rule tests the cheap things first. No draw of the stream changed.
- *A frame only when something moved* (`src/main.ts`). `renderOn: 'step'`: the world steps
  sixty times a second and is drawn that often, not at the display's rate. The canvas also
  has a pixel budget by tier; a window inside it is drawn exactly as before.

**The library stack.** `lib-stack/threejs-scenes/` holds improvements to the scene library as
markdown files: prose that argues for the change, and exact find and replace blocks against
the TypeScript the package ships in `lib/`, which is the text its own repository keeps.
`bun run stack` applies them in order and rebuilds `dist` for what changed, type-checked; it
runs after every install, before every build, and first in the gate. `bun run stack --to
<checkout>` applies the same files to the library's repository. `lib-stack/README.md` is the
manual. A curator adds an entry when the library is in the way; it is not a framework change.

Four entries, all opt-in or bit-identical:

1. `0001` the simplex sampler reads gradients from flat tables. A test holds a copy of the
   3.0.0 sampler and compares 240,000 values with `Object.is`.
2. `0002` `createNoise2D`. Not used yet: it is a different field, so using it is a world change.
3. `0003` `createApp` takes `renderOn: 'step'`, `fps`, and has `invalidate()`.
4. `0004` `createRenderer` takes `maxPixels`; `pixelRatioFor` is the rule as a function.

**What it cost, and saved.** Boot, headless Chromium on the GPU, median of 9 warm loads:

| Tier | Before | After |
| --- | --- | --- |
| highEnd | 258 ms | 169 ms |
| mobile | 131 ms | 114 ms |

Later runs on a busier machine read higher on both sides and kept the ratio: about a third
less on the largest tier. Frames drawn, with the display's rate limit off: 749 a second
before, 57 after, for a world that steps 60 times a second. Not re-profiled in Firefox, where
the original 375 ms was measured.

**Tried and dropped.** Compiling shaders after each feature, to link them while the next one
builds: the first frame took 35 ms in Chromium with it and without it.

**Next.** Profile again in Firefox from a clean profile. The first frame still waits on
shader linking there, and nothing in `budgets.json` guards how long a boot takes
(`ROADMAP.md`, known problems).
