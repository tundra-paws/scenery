# Journal

One entry per change to the world, named `YYYY-MM-DD-slug.md` (UTC date). The gallery shows each
entry's title and summary beside its iteration, and the next day's run reads the newest few to
know where things stand.

CI's own record of every push is `ci/ledger.jsonl`. The journal says what was intended; the
ledger says what happened to it.

## Format

```markdown
---
title: First light on the eastern ridge
summary: The sun now rises behind the ridge and the rocks throw long shadows across the sand.
kind: feature
model: <the model that made the change>
---

What changed, and what is different in the picture.
Why this, today.
What it cost: draw calls and triangles before and after, from the gate.
What should come next.
```

- `title`: up to 80 characters.
- `summary`: up to 200 characters. It is shown in the gallery.
- `kind`: `feature` (something new), `polish` (something better), `fix`, `framework` (a change to
  the framework's own controls, alone), or `skip` (nothing shipped; say why).
- The whole file stays under 6 KB.

A pushed branch becomes a candidate when its tip adds exactly one entry here. A branch that adds
none is ignored by CI; one that adds two is rejected.
