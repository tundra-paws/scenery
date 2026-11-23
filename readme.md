# scenery

A 3D world created and improved upon by a daily LLM curator run.

**[See it →](https://tundra-paws.github.io/scenery/)**

[![The world as of the latest iteration](https://tundra-paws.github.io/scenery/latest.webp)](https://tundra-paws.github.io/scenery/)

Once a day an unattended Claude session looks at the world, takes on its next major update,
builds it, checks its own work, and pushes a branch. CI judges the branch, lands it, and
publishes it as an iteration that never changes again. The site shows the newest one and every
one before it.

## How a day goes

1. The curator reads the brief (what happened yesterday, what was asked for, what was planned),
   photographs the world, and chooses the day's major update: a chapter, not a tweak.
2. It builds the update in stages, photographs the world again, and runs the same gate CI will
   run.
3. It writes a journal entry, pushes a `claude/…` branch, and waits for the verdict.
4. CI checks the branch with the rules and tools that are already on `main`: what it touches,
   that it builds, that it draws something, that it draws the same thing twice, what it costs,
   and that the camera still answers a drag and a walk.
5. If it passes, `main` is fast-forwarded to it, it gets the next iteration number, and the site
   is redeployed. Either way a line goes into `ci/ledger.jsonl`, which is how tomorrow's run
   finds out.

## Steering it

- **Ask for something:** add a line to [`REQUESTS.md`](REQUESTS.md). Edit it whenever you like, even while a
  run is under way: a change to a document never invalidates the day's work.
- **Set the direction:** edit [`VISION.md`](VISION.md). The constraints at the top are yours.
- **Pause it:** set the repository variable `SCENERY_PAUSED` to `true`, or turn the routine off.
- **Approve each day by hand:** add yourself as a required reviewer on the `promotion`
  environment. Every candidate then waits for you.
- **Undo a day:** revert its commit on `main`. The revert is published as a new iteration; the
  old ones stay where they are.

The curator may edit anything except `.github/`, `ci/`, and the list of npm packages. Changes to
the framework's own controls (the gate, the budgets, its own instructions) land alone, are
judged by the gate as it was before, and are reported in an issue.

## Running it yourself

```sh
bun install
bun run dev      # the world, with hot reload
bun run shot     # photograph every view into .scenery/shots/
bun run gate     # everything CI checks
bun run site     # the published site, assembled locally
```

Needs [bun](https://bun.sh) and a Chrome or Chromium on the machine.

## What is where

| | |
|---|---|
| `src/world/` | The world: features, postcard views, the shape of the land. |
| `src/rig/` | The camera: tour, orbit, walk and fly. |
| `shell/` | The gallery around the iterations. |
| `scripts/` | Shots, diffs, the gate, and the site assembly. |
| `journal/` | What changed each day, in the curator's words. |
| `ci/ledger.jsonl` | What CI did with each push. |
| `CLAUDE.md`, `.claude/skills/` | The curator's rules and procedure. |

Built on [three.js](https://threejs.org) and [threejs-scenes](https://www.npmjs.com/package/threejs-scenes).
