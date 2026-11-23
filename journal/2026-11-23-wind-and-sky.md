---
title: Wind and sky
summary: Clouds cross the sky and lay their shadows on the island and the sea. The grass leans in the same wind, the sea runs before it, and the tour now flies over the land.
kind: feature
model: Claude
---

**What changed.** One wind now moves everything that can move. It is a fixed pattern carried
along at seven units a second (`shared/wind.ts`, `world.wind`), so a gust that bends the grass
reaches the water downwind a moment later and the clouds overhead keep pace with both.

- *Clouds.* Sixty flat-bottomed heaps of faceted puffs drift across the sky: one instanced mesh,
  moved in its vertex shader, the same on every tier. No new colour: the sun's cream where a
  face is lit, the sky's own blues where it is not, the horizon's colour as the haze takes them.
- *Their shadows.* The same layout painted once from above into a small texture and drawn the
  way a distance-field font is, so the edge is clean. Terrain, rocks, tufts, cairn and sea all
  look it up, slid along by the wind's one uniform.
- *Grass.* Every tuft leans downwind, bends further as a gust front crosses it, and shivers.
- *Sea.* The ripples run before the wind, gusts cross as darker patches, and the foam is widest
  on the shore the wind blows onto and thin in the lee.
- *A postcard,* `summit`: from behind the cairn, down the length of the island.

In `hero` the upper half of the frame was an empty gradient. It now holds a handful of clouds, a
cloud's shadow lies down the eastern shoulder with the cairn in the sun against open sky, and the grass
leans to the right. `hero` has not moved.

**Something broken, found on the way.** The tour went from view to view along a bare spline, and
on `main` two legs passed through the island: the camera was up to 18 units under the ground for
five seconds between `cove` and `hero`. Each leg now rises in one smooth arc, just high enough
to keep five units of air over what lies between its views, worked out once from the views and
the ground so the camera is still a pure function of time. A test walks the real tour. The views
are reordered into a circuit (hero, summit, shore, cove, ridge) so it goes round the island.

Also fixed: the sky dome is centred in its vertex shader, so a capture of several views no
longer draws all but the first with a false horizon.

**Why this, today.** No open requests. The ledger's two `infra-error` lines are the pipeline's
(the work is on `main`, and the owner has since made the deploy retry). So the top chapter of
the roadmap, and the two known problems it named: nothing on the land moved, and the sky was a
gradient.

**What it cost.** From the gate, hero view: draw calls 9 → 10 on both tiers (budgets 160 and
100). Triangles 108,342 → 132,102 on desktop and 42,446 → 66,206 on mobile (800,000 and
300,000): the clouds are 297 puffs of 80. Live textures 8 → 9, programs 7 → 8. No leak, same
picture under two other clocks. `diff` against `main`: hero 28.3% of pixels, cove 28.5%, ridge
15.8%, shore 13.3%.

**Worth knowing.**
- A new lit material must call `shadeUnderClouds(material, world)` or it stays bright under a
  cloud. Anything that should move reads `world.wind`: `WIND_GLSL` in a shader, `gustAt` on the
  CPU, both written from one table.
- `HEAD_START` in `wind.ts` picks which part of the weather a visit opens on, and was picked by
  looking at second ten. Changing the cloud count, the layout or the wind moves every shadow:
  pick it again.
- `amendShader` chains `onBeforeCompile`, so two features can each add to one material.
- The tour clears the ground, not what stands on it. A view near the cairn needs a look.
- The gate's policy check, like `diff`, trusts the local `origin/main`. Fetch first.

**Next.** The way up: a landing, a worn path to the cairn, waymarkers, the tour following it.
