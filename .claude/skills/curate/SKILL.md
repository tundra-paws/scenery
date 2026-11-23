---
name: curate
description: The daily curation procedure for this repository's 3D world. Use when asked to curate, to run today's iteration, or to improve the world as the scheduled daily run. Covers orienting from the repository alone, looking at the world, choosing one change, building it, verifying it with shots and the gate, recording it in the journal, and shipping it by pushing a branch.
---

# Curate

You improve this world by one step, then push. Nobody is watching and nobody will answer a
question, so decide, verify, and write down what you did. You start with no memory of earlier
runs: everything you need is in this repository.

`CLAUDE.md` holds the rules that do not bend. This file is the procedure.

## 0. Before anything

```sh
bun run setup
```

It checks for a browser, writes the scene library's API digest to `.scenery/api.md`, starts the
reference build for `diff`, and prints the brief. If dependencies are missing, run
`bun install --frozen-lockfile` first.

If setup says the browser is **NOT FOUND**, you cannot take pictures. Do a day you can verify
without looking (a refactor, a cost cut, tests), use `bun run gate --quick`, and say so plainly
in the journal. Do not claim a visible change you could not see.

## 1. Orient

Read the brief top to bottom. It replaces searching.

- **Ledger.** The newest lines are what CI did with the last pushes.
  - `rejected`: yesterday's work did not land. The reasons are listed and the branch is still on
    the remote. Decide: salvage it (`git fetch origin <branch>`, cherry-pick what was good, fix
    what failed) or start fresh. Do not repeat the change that was refused.
  - `infra-error`: the pipeline broke, not the world. Carry on normally.
  - Nothing new since your last journal entry: the previous run did not push. Carry on.
- **Requests.** Open items in `REQUESTS.md` are the owner's wishes. They come before your ideas.
- **Roadmap.** Your own plan, left by earlier runs.
- **Budgets.** If any is above 80%, today's change must make room, not use it.

Then read `VISION.md`, and only the source files the change you are about to make touches.
Do not read the whole journal: the brief shows the titles, open one entry if you need it.

**First run only** (the Direction section of `VISION.md` is empty): write it. Mood, palette,
what this place is and is not, the motifs worth repeating, and a rough arc for the first month.
Keep to the owner's constraints above it. Then make a first small change that points that way.

## 2. Look

```sh
bun run shot                               # every view, desktop tier
bun run shot --tier mobile --views hero    # what a phone draws
```

Open the PNGs in `.scenery/shots/` and look at them. Say to yourself what is weakest: what is
empty, flat, repetitive, out of keeping with the vision, or simply wrong. That is your shortlist.

## 3. Choose

**One visible change, plus one thing that leaves the code smaller, cheaper or clearer.**

Order of priority:

1. A failure from the ledger, or something visibly broken.
2. An open request.
3. The top of the roadmap.
4. Your own idea, in the direction `VISION.md` sets.

The change must be small enough to finish and verify in this session, and visible from at least
one postcard view. A day that adds one thing well beats a day that adds four things half-made.

Before building, write down the title, what will be different in the picture, and the task list
(three to six lines). You will check the result against that sentence.

## 4. Build

Read `.claude/skills/threejs-scenes/SKILL.md` before writing world code, and grep
`.scenery/api.md` before writing a helper: the library may already have it. Never guess a
signature; the type declarations are in `node_modules`.

- A new feature is a folder under `src/world/features/` and one line in `src/world/index.ts`.
- Colours come from `src/world/shared/palette.ts`. A change of mood is a change to that file.
- Things stand on `world.ground` (`heightAt`, `slopeAt`); place them with `scatterOnGround`.
- Time is `frame.frame * STEP`. Randomness is `ctx.rng.fork('feature:purpose')`.
- Many copies of a thing are one `InstancedMesh`. Count the draw calls you add.
- A new postcard goes in `src/world/views.ts`. `hero` stays where it is.
- The gate drives the page like a visitor: a drag on the canvas must still orbit, and the W
  key must still start a walk. Whatever you change in the rig or the page, keep both.
- Tiers: `world.quality.tier` is `mobile`, `desktop` or `highEnd`. Scale counts by it, and make
  sure the phone still gets the idea of the thing.

Run `bunx eslint --fix` on what you touch and `bun test` when you change `src/rig` or `shared/`.

## 5. Verify

```sh
bun run shot      # the same views again
bun run diff      # what moved since origin/main, as numbers and diff images
bun run gate      # everything CI will check
```

- **Look at the after-shots.** Compare them with the sentence you wrote in step 3. If the change
  is not clearly an improvement in the picture, it is not one yet: adjust, or shrink the idea.
- **`diff` says "nothing moved"** on a change meant to be visible: it is not visible. That is a
  failure, not a detail.
- **The gate must be green.** If a check fails, fix the world, not the check. The failures name
  what they measured.
- Look at one shot from the mobile tier before you finish. The phone is most visitors.

The gate takes a while under software rendering. Give the command a long timeout or run it in
the background and wait for it; do not start a second browser tool while it runs.

If you cannot get it green: undo the part that fails, ship the part that works, and write the
rest into `ROADMAP.md`. If nothing works, see "A day with nothing to ship".

## 6. Record

Write `journal/YYYY-MM-DD-slug.md` (UTC date, lowercase slug). It is what the gallery shows and
what tomorrow's run reads.

```markdown
---
title: First light on the eastern ridge
summary: The sun now rises behind the ridge and the rocks throw long shadows across the sand.
kind: feature
model: <the model you are>
---

What changed, and what is different in the picture.
Why this, today (the request, the ledger line, the roadmap item, or what you saw).
What it cost: draw calls and triangles before and after, from the gate.
What you would do next.
```

- `title` up to 80 characters, `summary` up to 200. `kind` is `feature`, `polish`, `fix`,
  `framework` or `skip`. The whole file stays under 6 KB.
- Update `ROADMAP.md`: remove what you did, add what you learned, keep it short.
- Tick the request in `REQUESTS.md` if you fulfilled one, with the date.

## 7. Ship

```sh
git add --all
git commit -m "feat(world): first light on the eastern ridge"
git push -u origin HEAD
```

Push the branch this session is on, once, when everything above is done. If the session's
branch is not under `claude/`, push to `claude/curate-<date>` instead. Then stop: CI lands it.
Do not open a pull request, do not merge, do not wait for the pipeline.

## Special days

**A day with nothing to ship.** Commit only a journal entry with `kind: skip` saying what you
tried and why it did not work, and update the roadmap. It lands, leaves the world as it was,
and tells tomorrow what not to repeat.

**A framework change** (rule 7 in `CLAUDE.md`). Its own day: `kind: framework`, nothing under
`src/world` or `src/rig`, and a journal entry that argues for it. It is judged by the old gate
and the owner is told. Do not use it to make room for a change you already have in mind; make
the change fit.

**Something you may not do** (a workflow change, a new package). Write it in `PROPOSALS.md`:
what, why, and what you did instead meanwhile.

**Tidying.** When a budget passes 80%, a file nears 666 lines, or the roadmap's list of known
problems is longer than its list of ideas, the day's change is the tidying. It still needs a
picture that is no worse.

## What a good day looks like

- The brief was read before any file was opened.
- One idea, stated before it was built, visible in a shot afterwards.
- The numbers in the journal come from the gate, not from memory.
- The code is no larger than the idea needed, and something else got smaller.
- One push.

## What a bad day looks like

- "Improved the lighting" with no before and after looked at.
- A budget raised, a test deleted, or a check skipped so the change would pass.
- Three unfinished features and a roadmap that grew.
- A change to `hero`, the palette and the terrain at once, so nobody can tell what did what.
- A push to `main`, a force-push, a pull request, or a second push after the first.
