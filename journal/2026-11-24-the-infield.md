---
title: The infield
summary: Below the house, a walled field of barley and potatoes on lazy beds, its gate left open; a fold across the path; and a head-dyke from the path to the sea. The barley ripples in the wind.
kind: feature
model: Claude
---

**What changed.** The island now has ground somebody worked, and the walls they built round it.

- *The field* (`features/infield/rigs.ts`). The slope between the path's foot, the top of the
  beach and the house is dug into lazy beds: long rigs of heaped earth between dark furrows,
  laid down the fall of the land so they drain, each stopping short of the dyke. Plots of
  barley, one of potatoes, one let go back to grass. Draped on the land as it is drawn
  (`grid.heightAt`, new, matches the terrain's triangles; tested against a raycast), so on a
  phone's coarse ground they lie on it, not under it.
- *The barley* (`barley.ts`). A clump of stalks at every vertex of a barley rig, one
  instanced mesh. Rigs and stalks bow together to one signal: the wind's gust, and a ripple
  carried at the wind's speed, where the ears bow over and pale. One new colour, `barley`.
- *The dyke* (`dyke.ts`, `shared/infield.ts`). Three courses and a cope of slabs set on
  edge, each stone standing on the land where it is, so the wall rides the hill. Some
  stones are the rock's darker grey, picked off the field. Round the field, with a gate in
  the top wall toward the house: two posts, and a driftwood gate swung open into the field
  (`gate.ts`). A worn track runs to it from the way to the door. A round fold on the shelf
  across the path, and the head-dyke: from across the path, along the fold's foot and the
  hill's break of slope, down into the sea. Boulders and tufts keep off the walls and out of
  the field ("the field was cleared into its dyke").
- *A postcard*, `infield`, off the beach below the field, up the rigs to the gate, the
  house and the cairn. It stands between `boat` and `hero` on the time of the one leg it
  splits, so the day did not move and every stop keeps its hour.

In `hero` the empty green under the house is now a walled field with gold rigs in it, the
track to its gate pale under the house, and a long wall crossing the left of the island
from the fold to the sea. `hero` has not moved.

**Why this, today.** No requests and a clean ledger. The roadmap's next chapter, the inside
of the shelter, would not show in `hero`; the owner asked for days you can see. The field
is the next thing the people who are never seen would have left, and the middle of the
`hero` frame was its empty ground.

**Found on the way.** The first line of the field's dyke stood in the swash: four corners
under a unit above the sea. A test now keeps the field and its dyke on dry land.

**What it cost.** From the gate, on `hero`: desktop 25 to 31 draw calls (of 160) and 269k to
400k triangles (of 800k); mobile 25 to 31 (of 100) and 167k to 201k (of 300k). The dyke's
some five hundred stones are 80 triangles on desktop and 20 on the phone. Programs 16 to 19.
Nothing per frame on the CPU: the barley's sway is in its shaders.

**Next.** The inside of the shelter; the sea answering to the boat, the stones and the dyke
that runs into it.
