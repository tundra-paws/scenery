#!/bin/bash
# PreToolUse hook for Claude Code cloud sessions (the daily curator run).
#
# Work lands on main through CI, which judges a pushed claude/ branch before
# anything reaches main or the site. The rules in CLAUDE.md say so; this makes
# the two that matter most hold even on a day the rules are misread:
#
#   - a push goes to the session's own branch, plainly: not to main, not to
#     the site's storage branch, not forced, no tags, no deletions
#   - .github/ and ci/ are not edited (GitHub would refuse the result anyway)
#
# It does nothing outside cloud sessions, so a person working locally is not
# in its way. Exit code 2 blocks the tool call and shows the message to Claude.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

input="$(cat)"

field () {
  # jq when it is there; otherwise a pattern good enough for a flat string field.
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null
  else
    printf '%s' "$input" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1
  fi
}

refuse () {
  echo "$1" >&2
  exit 2
}

tool="$(field '.tool_name' 'tool_name')"

case "$tool" in
  Edit|Write|NotebookEdit)
    path="$(field '.tool_input.file_path' 'file_path')"
    path="${path#"${CLAUDE_PROJECT_DIR:-}"/}"

    case "$path" in
      .github/*|ci/*)
        refuse "$path is not the curator's to change: workflows are changed by the owner and ci/ledger.jsonl is written by CI. Describe what you need in PROPOSALS.md instead."
        ;;
    esac
    ;;

  Bash)
    command="$(field '.tool_input.command' 'command')"

    # Only the part of the command that is a push, up to the next separator.
    # Between `git` and `push` there may be options (some of which, like -C and
    # -c, take a value) but nothing else: a commit message that happens to
    # contain the word is not a push.
    push="$(printf '%s' "$command" | grep -oE 'git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+push([[:space:]][^;&|]*)?' | head -n 1)"

    [ -z "$push" ] && exit 0

    if printf '%s' "$push" | grep -qE '(^|[[:space:]])(--force|--force-with-lease[^[:space:]]*|-f|--mirror|--all|--tags|--delete|-d)([[:space:]]|$)|[[:space:]]\+[^[:space:]]|[[:space:]]:[^[:space:]]'; then
      refuse "This push is forced, wide, or deletes something. Push only your own branch, plainly: git push -u origin HEAD"
    fi

    if printf '%s' "$push" | grep -qE '(^|[[:space:]:/])(main|site-store)([[:space:]]|$)|refs/tags/'; then
      refuse "Work reaches main through CI, not by pushing to it. Push your own claude/ branch (git push -u origin HEAD) and the pipeline lands it."
    fi

    branch="$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)"

    case "$branch" in
      main|site-store)
        refuse "You are on $branch. Create a branch first (git switch -c claude/curate-$(date -u +%F)) and push that."
        ;;
    esac
    ;;
esac

exit 0
