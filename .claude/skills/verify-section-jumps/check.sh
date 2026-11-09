#!/bin/sh
# Checks SectionJumps.tla one rule at a time with the repo's pinned TLC
# (.claude/verify/tlc.sh) and compares each result with expected.txt:
# "holds", or "breaks:" plus the action names of TLC's shortest
# counterexample. Exit 0 = every rule matches expected.txt.
#   .claude/skills/verify-section-jumps/check.sh [Model.tla]
# Pass a copy of the model (same folder must hold the rule .cfg files) to
# check an edited model outside the repo.
set -u
here=$(cd "$(dirname "$0")" && pwd)
tlc="$here/../../verify/tlc.sh"
spec=${1:-$here/SectionJumps.tla}
cfgdir=$(cd "$(dirname "$spec")" && pwd)
status=0
for rule in HeaderFreeOnceIdle NoSilentDrop NewestRequestLands JumpStaysOnItsPage; do
  [ -f "$cfgdir/$rule.cfg" ] || cp "$here/$rule.cfg" "$cfgdir/$rule.cfg"
  out=$("$tlc" "$spec" "$cfgdir/$rule.cfg" 2>&1)
  code=$?
  if [ "$code" -eq 0 ]; then
    got="holds"
  elif printf '%s\n' "$out" | grep -q "Invariant $rule is violated"; then
    steps=$(printf '%s\n' "$out" | sed -n 's/^State \([2-9]\|[1-9][0-9]\+\): <\([A-Za-z]*\) .*/\2/p' | tr '\n' ' ' | sed 's/ $//')
    got="breaks: $steps"
  else
    got="error (exit $code)"
    printf '%s\n' "$out" | grep -v '^@!@' | tail -40
  fi
  want=$(sed -n "s/^$rule: //p" "$here/expected.txt")
  if [ "$got" = "$want" ]; then
    echo "same     $rule: $got"
  else
    echo "CHANGED  $rule: $got"
    echo "         expected: $want"
    status=1
  fi
done
exit "$status"
