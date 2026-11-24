# Proposals

What the curator wants and may not do by itself: a change to a workflow under `.github/`, a new
npm package, or anything else the rules in `CLAUDE.md` reserve for the owner.

The curator adds an entry under **Open**: what it needs, why, and what it did in the meantime.
The owner answers by doing it, or by writing a line under the entry, and moves it to **Closed**.

## Open

### 2026-11-23 · the publish job loses a race with its own upload

What: in `.github/workflows/pipeline.yml`, job `publish`, let the deploy try twice. Change the
environment's `url` and replace the `Deploy to Pages` step:

```yaml
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url || steps.redeploy.outputs.page_url }}
```

```yaml
      - name: Deploy to Pages
        id: deploy
        continue-on-error: true
        uses: actions/deploy-pages@v5

      # The run's artifact list can lag the upload by a moment, and then the
      # first try finds no "github-pages" artifact. Wait, and try once more.
      - name: Let the artifact list catch up
        if: steps.deploy.outcome == 'failure'
        run: sleep 20

      - name: Deploy to Pages, second try
        id: redeploy
        if: steps.deploy.outcome == 'failure'
        uses: actions/deploy-pages@v5
```

Why: run 45279570744 ("Deep water") passed policy, build and verify, was promoted to `main` and
saved to `site-store` as iteration 4, and then failed to deploy: `No artifacts named
"github-pages" were found`. The upload finished at 22:28:02.41 and `deploy-pages` listed the
run's artifacts at 22:28:02.73 and was shown four; the fifth is there now. The run before it
asked 0.9 s after its upload and was shown five. Nothing a candidate does can cause or prevent
this. The ledger recorded `infra-error`, and two of those in a row stop the watchdog's retry.

Meanwhile: every pipeline run that reaches `publish` deploys the whole stored site, so the next
landed change puts a missed iteration online. The curate skill now waits for the verdict and,
on `infra-error` at `publish`, starts the pipeline's `republish` mode when it has a tool for it.

Curator, 2026-11-23: the owner has since made the deploy retry (`a54ec39`, "retry failed Pages
deployments"). Nothing is waiting on this any more; it can move to Closed.

### 2026-11-24 · textures from a package, from photographs, and real displacement

The owner asked for textures on everything, naming `tsl-textures` and ambientCG's maps, and
displacement for the land. Three parts of that are the owner's to decide, not the curator's:

- **`tsl-textures` as a dependency.** Rule 3: no new npm package. Say the word (add it to
  `package.json` on `main`) and the patterns in `src/world/shared/surface.ts` can be swapped
  for its.
- **Photographed maps (ambientCG and the like).** VISION's own constraint is "made from
  code", rule 4 forbids fetching at run time, and `budgets.json` allows 400 KB a file and
  1.5 MB an iteration: one 1K colour + normal + displacement set is most of that. If wanted:
  say which surfaces, and raise `bytes` in a framework change.
- **Displacement finer than the land's grid.** The land is 30k triangles drawn three times;
  displacement that reads needs several times that near the camera, and the budget is 800k
  with 76% used. Wants either a higher `render.desktop.triangles` or the mirror and shadow
  passes drawing a coarser land.

Meanwhile: every surface got a texture written here in TSL on three's own noise (what
`tsl-textures` is built on), with a bump-mapped normal from the same height; the land's rock
faces are displaced at the grid's own vertices; nothing is downloaded.

<!-- Example:
### 2026-12-09 · a smaller capture for the mobile tier
What: capture the mobile hero at 960x540 in `budgets.json` → `capture`.
Why: the phone tier is judged at a size no phone draws.
Meanwhile: nothing blocked; the mobile numbers are still within budget.
-->

## Closed

_(nothing yet)_
