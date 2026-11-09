#!/bin/sh
# One-command check for the verify-search-flow skill. Run from anywhere:
#   sh .claude/skills/verify-search-flow/check.sh            # summary
#   sh .claude/skills/verify-search-flow/check.sh -v         # also print TLC output
# Exit 0  = every rule that held at the sync commit still holds, and every
#           open finding still reproduces exactly as recorded.
# Exit 1  = REGRESSION: a rule that held now breaks (read the TLC trace).
# Exit 2  = an open finding no longer reproduces: if a fix was intended, move
#           its invariant into the "holds" config (see SKILL.md); else the
#           model drifted - recheck it against the code.
# Exit 3  = TLC could not run the model (parse/semantic error, or a finding
#           failed for a different reason than its own invariant).
set -u
here=$(cd "$(dirname "$0")" && pwd)
# TLC_SH lets you check an edited copy of the models kept outside the repo
tlc=${TLC_SH:-$here/../../verify/tlc.sh}
[ -x "$tlc" ] || { echo "check.sh: no TLC runner at $tlc (set TLC_SH=/path/to/.claude/verify/tlc.sh)" >&2; exit 3; }
verbose=${1:-}
status=0
log=$(mktemp "${TMPDIR:-/tmp}/verify-search-flow.XXXXXX")
trap 'rm -f "$log"' EXIT INT TERM

run() { # spec cfg
  "$tlc" "$here/$1" "$here/$2" >"$log" 2>&1
  code=$?
  [ "$verbose" = "-v" ] && cat "$log"
  return $code
}

# Rules that held at the sync commit: TLC must exit 0.
for pair in "SearchModalOpen.tla SearchModalOpen.cfg" "SearchResults.tla SearchResults.cfg"; do
  set -- $pair
  if run "$1" "$2"; then
    echo "HOLDS      $2"
  else
    if grep -q "is violated" "$log"; then
      echo "REGRESSION $2: $(grep -m1 'is violated' "$log")"; status=1
    else
      echo "ERROR      $2: TLC failed without a violation (deadlock or model error):"
      grep -m3 -E "Error|deadlock" "$log"; [ $status -eq 0 ] && status=3
    fi
    [ "$verbose" = "-v" ] || sed -n '/behavior up to this point/,/states generated/p' "$log"
  fi
done

# Open findings: TLC must report exactly this invariant violated.
for triple in \
  "SearchModalOpen.tla SearchModalOpen.focus.cfg FocusInBoxWhenOpen" \
  "SearchResults.tla SearchResults.noresults.cfg FailureNotShownAsNoResults" \
  "SearchResults.tla SearchResults.retry.cfg RetryAfterFailure" \
  "SearchResults.tla SearchResults.stale.cfg ResultsMatchQuery"; do
  set -- $triple
  if run "$1" "$2"; then
    echo "FIXED?     $3 now holds ($2) - see SKILL.md 'When a finding stops reproducing'"
    [ $status -eq 0 ] && status=2
  elif grep -q "Invariant $3 is violated" "$log"; then
    echo "FINDING    $3 still breaks ($2), $(($(grep -c '^State [0-9]*:' "$log") - 1))-step trace"
  else
    echo "ERROR      $2: expected $3 to break, got:"; grep -m3 -E "Error|deadlock" "$log"
    [ $status -eq 0 ] && status=3
  fi
done
exit $status
