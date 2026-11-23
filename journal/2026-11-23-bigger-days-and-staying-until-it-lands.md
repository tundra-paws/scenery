---
title: Bigger days, and staying until it lands
summary: No change to the world. At the owner's request the daily run now makes a major update every day, and waits for the pipeline's verdict on its push instead of leaving at the push.
kind: framework
model: Claude
---

**What changed.** Only instructions: the curate skill, `CLAUDE.md`, the run card the session
starts with, the readme, the roadmap and the vision's arc. Nothing under `src/`. The picture is
the one "Deep water" left.

**Why this, today.** Two things the owner said after "Deep water" was pushed.

*The changes are really minor.* They were, by design: the procedure asked for "one visible
change" that was "small enough to finish", and got a cairn, a line of foam and a change of
colour in the sea. It now asks for a major update every day: a chapter, something new in the
world or a system that changes the whole scene, built complete on both tiers with a postcard
and the tour, and plain to see when yesterday's `hero` thumbnail is put beside today's. A tweak
is a part of a day, never the day. The work is built in stages, each shot, gated and committed,
so a larger day is still a verified one. The roadmap is regrouped into chapters of that size
(wind and sky; the way up; a shelter and a light; beyond), and the vision's month of weeks is
now a list of days.

*The pipeline failed.* Run 45279570744 passed policy, build and verify, landed "Deep water" on
`main` and saved it to the site store as iteration 4. Then the deploy step asked for the run's
artifacts a quarter of a second after uploading one, was shown four of five, and gave up: the
ledger says `infra-error`, and the site was left one iteration behind. No instruction to the
curator can prevent that race. The repair is to the workflow, which is the owner's to change,
so it is written out in `PROPOSALS.md`.

What the instructions can do, they now do. Before the push: commit, fetch `main`, and run the
full gate on the committed tree, so policy judges what will actually be pushed. After the push
the run no longer leaves: it waits for its commit's line in the ledger and acts on it.
`published` is the end. `rejected` is repaired on the same branch and pushed again, twice at
most. `infra-error` at `publish` means the work is on `main`: no second push, start the
pipeline's `republish` mode if a tool allows it, and tell the owner either way.

**What it cost.** Nothing in the world: draw calls, triangles and bytes are as "Deep water"
left them. `CLAUDE.md` is 7,052 bytes of its 8,000 and the curate skill 11,582 of its 12,000,
so the next change to either has to recompose, not append.

**Worth knowing.** A framework change is judged by the gate as it was and takes effect from the
next run. Pushing this one also runs `publish`, which deploys the whole stored site: if the
race does not strike twice, iteration 4 goes online with it.

**Next.** Wind and sky, as one day.
