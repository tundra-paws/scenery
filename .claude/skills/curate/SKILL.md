---
name: curate
description: The daily curation procedure for this repository's 3D world. Use when asked to curate, to run today's iteration, or to improve the world as the scheduled daily run. Covers orienting from the repository alone, looking at the world, choosing the day's major update, building it, verifying it with shots and the gate, recording it in the journal, shipping it by pushing a branch, and watching the pipeline until it has landed.
---

# Curate

You move this world forward by one **major update**, push it, and stay until the pipeline has
landed it. Nobody is watching and nobody will answer a question, so decide, verify, and write
down what you did. You start with no memory of earlier runs: everything you need is in this
repository.

`CLAUDE.md` holds the rules that do not bend. This file is the procedure.

## 0. Before anything

```sh
bun run setup
```

It checks for a browser, applies `lib-stack/`, writes the scene library's API digest to
`.scenery/api.md`, starts the reference build for `diff`, and prints the brief. If dependencies are missing, run
`bun install --frozen-lockfile` first.

If setup says the browser is **NOT FOUND**, you cannot take pictures. Do a day you can verify
without looking (a refactor, a cost cut, tests), use `bun run gate --quick`, and say so plainly
in the journal. Do not claim a visible change you could not see.

## 1. Orient

Read the brief top to bottom. It replaces searching.

- **Ledger.** The newest lines are what CI did with the last pushes.
  - `rejected`: that work did not land. The reasons are listed and the branch is still on the
    remote. Salvage it (`git fetch origin <branch>`, cherry-pick what was good, fix what failed)
    or start fresh. Do not repeat the change that was refused.
  - `infra-error`: the pipeline broke, not the world. If it says `publish`, that change is on
    `main` and only the site is behind; your push today republishes it. Carry on normally.
  - Nothing new since your last journal entry: the previous run did not push. Carry on.
- **Requests.** Open items in `REQUESTS.md` are the owner's wishes. They come before your ideas.
- **Roadmap.** Your own plan, left by earlier runs.
- **Budgets.** If any is above 80%, today's update must make room as well as use it.

Then read `VISION.md`, and only the source files today's update touches. Do not read the whole
journal: the brief shows the titles, open one entry if you need it.

**First run only** (the Direction section of `VISION.md` is empty): write it, within the owner's
constraints above it. Then make a first update that points that way.

## 2. Look

```sh
bun run shot                               # every view, desktop tier
bun run shot --tier mobile --views hero    # what a phone draws
```

Open the PNGs in `.scenery/shots/` and look at them. Say to yourself what the place is missing
most: what is empty, flat, static, repetitive, out of keeping with the vision, or simply wrong.

## 3. Choose: a major update, every day

**The owner asked for this in so many words: the daily changes were too minor.** A day is a
chapter, not a tweak. Someone flipping between yesterday's and today's thumbnail in the gallery
must see what happened at a glance, without being told where to look.

- **Major** is a new thing in the world that changes the `hero` picture (a landmark, a path
  with its waymarkers, a shelter, weather, a second island), or a system that changes the whole
  scene (wind in every tuft and on the sea, clouds crossing the sky, the light turning over the
  tour). Built complete: both tiers, a postcard that shows it, the tour passing it.
- **Not a day by itself:** one colour, one shader term, one small prop, a refactor, a cost cut.
  Fold those into the day's update as its supporting work.
- **Take a whole roadmap chapter, not its first bullet.** Bundle related items into one theme
  and finish the theme. Expect several files and a few hundred lines. If the finished diff is a
  dozen lines, the day is not done: build the next piece of the theme.
- **Major is not busy.** One bold thing done completely, not five scattered ones. The vision's
  quiet still holds, and so do the budgets, determinism and the still `hero` frame.

What to pick, in order: a failure from the ledger or something visibly broken (fix it, then
still make the day's update); an open request; the top chapter of the roadmap; your own idea in
the direction `VISION.md` sets.

Before building, write down the title, what will be different in the `hero` picture, and the
stages (three to six, each one verifiable). You will check the result against that sentence.

## 4. Build

Read `.claude/skills/threejs-scenes/SKILL.md` before writing world code, and grep
`.scenery/api.md` before writing a helper: the library may already have it. Never guess a
signature; the type declarations are in `node_modules`.

- Build in stages. After each: `bun run shot`, look, `bun run gate --quick`, commit locally. A
  branch may hold several commits; a stage that fails is dropped without losing the others.
- A new feature is a folder under `src/world/features/` and one line in `src/world/index.ts`.
- Colours come from `src/world/shared/palette.ts`. A change of mood is a change to that file.
- Things stand on `world.ground` (`heightAt`, `slopeAt`); place them with `scatterOnGround`.
- Time is `frame.frame * STEP`. Randomness is `ctx.rng.fork('feature:purpose')`.
- Many copies of a thing are one `InstancedMesh`. Count the draw calls you add.
- A new postcard goes in `src/world/views.ts`. `hero` stays where it is.
- The gate drives the page like a visitor: a drag on the canvas must still orbit, and the W
  key must still start a walk.
- Tiers: `world.quality.tier` is `mobile`, `desktop` or `highEnd`. Scale counts by it, and make
  sure the phone still gets the idea of the thing.
- Leave the code no worse: what you pass that can be smaller, cheaper or clearer, make so.
- The library is yours to improve. If `threejs-scenes` is slow, wrong, or lacks what any scene
  would want, write an entry in `lib-stack/` (its README says how), run `bun run stack`, use
  it today, and name it in the journal. Never work around it in silence or edit `node_modules`.

Run `bunx eslint --fix` on what you touch and `bun test` when you change `src/rig` or `shared/`.

## 5. Verify

```sh
bun run shot      # the same views again
bun run diff      # what moved since origin/main (run `git fetch origin main` first)
bun run gate      # everything CI will check
```

- **Look at the after-shots** against the sentence from step 3. Put the before and after `hero`
  side by side at thumbnail size: if you have to search for the difference, the update is not
  major yet. Build more of it.
- **`diff` says "nothing moved"** on a change meant to be visible: it is not visible. A failure.
- **The gate must be green.** If a check fails, fix the world, not the check.
- Look at one shot from the mobile tier before you finish. The phone is most visitors.

The gate takes a while under software rendering. Give it a long timeout or run it in the
background and wait; do not start a second browser tool while it runs.

If a stage cannot be made green: drop that stage, ship the rest if it is still a major update,
and write what is missing into `ROADMAP.md`. If nothing works, see "A day with nothing to ship".

## 6. Record

Write `journal/YYYY-MM-DD-slug.md` (UTC date, lowercase slug): exactly one new entry per branch.

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
- Update `ROADMAP.md`: remove what you did, add what you learned, keep it in chapters.
- Tick the request in `REQUESTS.md` if you fulfilled one, with the date.

## 7. Ship

Everything the pipeline will judge is decided before the push. In this order:

```sh
git switch -c claude/curate-$(date -u +%F)   # only if this branch is not under claude/
git add --all && git commit -m "feat(world): first light on the eastern ridge"
git fetch origin main                        # if main gained code, redo the work on top of it
bun run gate                                 # full, on the committed tree: green, nothing uncommitted
git push -u origin HEAD
```

A plain push of a `claude/` branch whose commits add one journal entry. No pull request, no
merge, no force. If the branch name is taken on the remote, add `-2`.

## 8. Watch it land

The push is not the end of the run. The pipeline takes three to five minutes and writes its
verdict on your commit to `ci/ledger.jsonl` on `main`. Wait for it (in the background if your
shell will not wait that long):

```sh
sha=$(git rev-parse HEAD)
timeout 900 bash -c "until git fetch -q origin main && git show origin/main:ci/ledger.jsonl | grep -q $sha; do sleep 30; done"
git show origin/main:ci/ledger.jsonl | grep "$sha" | tail -n 1
```

- **`published`** (`no-change` on a skip or framework day): done.
- **`rejected`:** `failed` names what was measured. Fix the world, commit on the same branch,
  keep the one journal entry (edit it, never add a second), run the gate, push plainly again and
  watch again. Two repairs at most; never loosen a check to get through.
- **`infra-error`:** the pipeline broke, not your change. If `failed` says `publish`, the commit
  is on `main` and only the site is behind. Do not push again. If you have a tool that can start
  a workflow, start `pipeline.yml` on `main` with `mode: republish` once and watch for its line;
  otherwise the watchdog does that the next morning.
- **No line after fifteen minutes:** read the run on GitHub if you can.

Anything but a clean landing, tell the owner: the verdict, the reasons, the run link, what you
did about it. Known causes of pipeline trouble are listed in `PROPOSALS.md`.

## Special days

**A day with nothing to ship.** Rare, and never the easy way out of a hard update. Commit only a
journal entry with `kind: skip` saying what you tried and why it did not work, and update the
roadmap. It lands, leaves the world as it was, and tells tomorrow what not to repeat.

**A framework change** (rule 7 in `CLAUDE.md`). Its own day: `kind: framework`, nothing under
`src/world` or `src/rig`, and a journal entry that argues for it. It is judged by the old gate
and the owner is told. Do not use it to make room for a change you already have in mind.

**Something you may not do** (a workflow change, a new package). Write it in `PROPOSALS.md`:
what, why, and what you did instead meanwhile.

**Tidying.** When a budget passes 80% or a file nears 666 lines, tidy as part of the day's
update, with a picture that is no worse. It does not replace the update.

## What a good day looks like

- The brief was read before any file was opened.
- One bold idea, stated before it was built, unmistakable in the `hero` thumbnail afterwards.
- Built in verified stages; the numbers in the journal come from the gate, not from memory.
- The ledger says `published` for your commit before the session ends.

## What a bad day looks like

- A tweak shipped as the day: one colour, one line of foam, one small prop.
- "Improved the lighting" with no before and after looked at.
- A budget raised, a test deleted, or a check skipped so the change would pass.
- Five unfinished things, or `hero`, the palette and the terrain all changed with no theme.
- A push to `main`, a force-push, a pull request, or leaving before the verdict.
