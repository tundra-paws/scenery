---
title: The skerry
summary: A reef stands out of the sea off the east shore, the swell breaking white round it. Someone stacked a small mark on its highest rock, and seals are hauled out on its slabs.
kind: feature
model: claude
---

**What changed.** The empty water in the bottom right of `hero` has a skerry in it: a reef of
the island's own rock, planed flat by the sea, with foam round every stone of it, a small
cairn stacked on its highest point for a boat coming in after dark, and six seals lying on its
slabs (four on a phone). They are the flock's opposite number: nobody's, never near, keeping
their own hours. A seal lies flat and breathes; now and then it lifts its head and looks
round, or holds itself up at both ends the way a seal does; at night they sleep. One more is
in the water, shows its head between the reef and the open sea for a while, and is gone.

- `shared/skerry.ts`: the reef as a layout and a clock, DOM-free. Five rocks along its back,
  seven slabs beside it, six awash at its ends: each is the boulders' stone with its top
  planed, stretched down to the sea bed and sunk until its measured top stands where it should.
  A seal lies on the facet a ray finds under it, turned to that facet's lie.
- `features/skerry`: two instanced meshes. The stones (and the mark's five) are lit like the
  boulders and share their program; a seal is one faceted lump three times over (body, head,
  hind flippers), in the stone's own greys, paler: no new colour. The sea is told what stands
  in it (`world.wash`) and breaks round each rock; the mirror shows the reef upside down.
- A new postcard, `skerry`: low on the water to seaward, looking over the seals to the field
  and the house. The tour stops there between `east` and `wood`. The day is the length it
  was: the ten seconds came off five afternoon legs, so no stop before it moved from its hour.
- Ten tests: the reef is in open water and never covered, every seal is on level rock, the
  whole of it is in `hero` at 16:10 and 16:9, no camera stands in it, the tour never flies
  into it, the seals lie flat at night and never jerk by day.

**Why this, today.** Nothing was open in `REQUESTS.md` and the ledger was clean. The roadmap's
two chapters (inside the shelter, the night) are both worth a day, but neither can be seen in
the `hero` thumbnail, which is taken outside at second ten, and the owner asked for updates
that are plain there. So this is the roadmap's long-standing idea instead ("something that
lives here and is never near"), built as a place of its own in the one empty corner of the
frame. The owner also asked today for the birds and the stones to be instanced: they already
were (one instanced mesh each), and the owner withdrew it; and for every shader to move to
TSL, which needs the renderer and the gate changed first and so cannot ride on a world change
(rule 7). That starts in a framework change of its own, after this one.

**What it cost.** `hero`, from the gate: desktop 61 draws and 620k triangles before, 67 and
630k after (79% of the triangle budget); mobile 54 and 221k before, 59 and 229k after (76%).
Two draw calls, each again in the shadow pass and the mirror. Live programs unchanged.

**Next.** The roadmap's two chapters stand. The reef is in the hill's shadow at second ten, a
dark shape with pale seals on it: by day it wants weed below its tide line and a second look.
