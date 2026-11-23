#!/bin/bash
# SessionStart hook for Claude Code cloud sessions (the daily curator run).
# Installs dependencies when a file that decides them has changed, then prints
# the run card and the brief, so the session starts with the commands and the
# state of the repository in context instead of rediscovering them.
#
# It never fails the session: a run that starts without its dependencies can
# still read this and install them itself.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Install only if something that decides what gets installed has changed.
hashes=node_modules/.session-start.sha256

if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"

  if bun install --frozen-lockfile >/dev/null 2>&1; then
    sha256sum .claude/hooks/session-start.sh package.json bun.lock > "$hashes" 2>/dev/null || rm -f "$hashes"
  else
    echo "dependencies did not install: run 'bun install --frozen-lockfile' and read the error"
  fi
fi

cat <<'CARD'
== scenery run card (from .claude/hooks/session-start.sh) ==

procedure    .claude/skills/curate/SKILL.md      the whole daily run, in order
rules        CLAUDE.md                            what does not bend
direction    VISION.md · REQUESTS.md · ROADMAP.md

start        bun run setup                        browser check, API digest, reference build, brief
look         bun run shot                         every view, desktop tier -> .scenery/shots/*.png
             bun run shot --tier mobile --views hero
compare      bun run diff                         what moved on screen since origin/main
verify       bun run gate                         everything CI checks (--quick: no browser)
             bunx eslint --fix <file> · bun test <file>
preview      bun run site                         the published site, assembled locally
ship         one journal/YYYY-MM-DD-slug.md, one commit, one plain push of this claude/ branch

one visible change + one thing made smaller · deterministic · inside budgets.json · hero stays put
never: force-push, push main, open or merge a PR, touch .github/ or ci/, add a package
traps: one software-rendered browser at a time · give the gate a long timeout · read the PNGs

CARD

bun scripts/brief.ts 2>/dev/null || echo "brief unavailable: run 'bun run brief'"

exit 0
