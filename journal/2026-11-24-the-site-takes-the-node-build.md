---
title: The site takes the node build
summary: The script that puts an iteration on the site can now add three's node renderer files to a three version it already holds. The TSL world is on main; this lets it be published.
kind: framework
model: claude
---

**What happened.** "Every shader in TSL" passed policy, build and verify, was promoted to
`main`, and was then not put on the site: the ledger says `infra-error` for
`b06f93b`, with no iteration number. Every job of run 45439156400 is green, because the step
that failed is allowed to fail. The site still ends at iteration 18.

**Why, and whose fault.** Mine. "Room for node materials" taught the gate's contract
(`scripts/gate/contract.ts`) that a build may ship `three.webgpu.min.js` and
`three.tsl.min.js`. It did not teach the script that publishes
(`scripts/site/apply.ts`), which keeps its own list of three's build files and its own rule
for the shared directory, and I did not look for a second list. Two things in it refused the
payload: the two files were not on its list, and a three version the site already holds
(`v/three@0.184.0/`, with the WebGL renderer's two files) could not be given a file it did not
have yet, only compared.

**What changed.**

- `scripts/site/apply.ts`: the list names the same eight files as the gate's contract. The
  shared directory of a version already on the site now takes the build files it lacks. A file
  that is already there must still be the same bytes, and nothing is ever removed, so every
  older iteration finds exactly what it loaded the day it was made.
- `scripts/site/apply.test.ts`: a test for that: a second payload at the same three version
  with the node build is published, the first's files are untouched, and a changed file is
  still refused.

Rehearsed on a copy of the real `site-store`, with the payload the gate made from `main`: it
publishes `i/0019/` and leaves four files in `v/three@0.184.0/`. With the script as it was, it
throws.

**Why this is not loosening a check.** "Published files never change" still holds and is still
tested. What is new is that a version's directory may grow, by files of the same package at
the same version that the gate has already compared with npm's byte for byte.

**What happens next.** This change's own run will be judged, and published, by the scripts as
they were, so it will most likely record a second `infra-error`: the world it builds is the
TSL one, which the old script still cannot publish. Once this is on `main` the fixed script is
what a run uses, and the pipeline's `republish` mode puts iteration 19 on the site. I will
start that once and watch for its line.
