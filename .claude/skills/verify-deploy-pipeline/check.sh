#!/bin/sh
# Runs every config of the deploy-pipeline model through .claude/verify/tlc.sh
# and compares each result with the "\* expect:" line at the top of the config.
#   MC.cfg              expect: pass  -> TLC must exit 0 (rules the code keeps today)
#   finding-*.cfg       expect: Rule  -> TLC must report "Invariant Rule is violated"
# Exit 0 only when every config matches. Usage, from anywhere:
#   sh .claude/skills/verify-deploy-pipeline/check.sh [config ...]
# TLC output for each config is kept in $OUT (default: a temp dir) as NAME.out.
set -u
here=$(cd "$(dirname "$0")" && pwd)
tlc=${TLC_SH:-$here/../../verify/tlc.sh}   # TLC_SH: run a copy of this folder elsewhere
OUT=${OUT:-$(mktemp -d "${TMPDIR:-/tmp}/verify-deploy-pipeline.XXXXXX")}
mkdir -p "$OUT"

if [ $# -eq 0 ]; then
  set -- "$here/MC.cfg" "$here"/finding-*.cfg
fi

bad=0
for cfg in "$@"; do
  case $cfg in /*) ;; *) cfg="$here/$(basename "$cfg")" ;; esac
  name=$(basename "$cfg" .cfg)
  expect=$(sed -n 's/^\\\* expect: *//p' "$cfg" | head -n 1)
  sh "$tlc" "$here/DeployPipeline.tla" "$cfg" >"$OUT/$name.out" 2>&1
  status=$?
  got=$(sed -n 's/^Error: Invariant \([A-Za-z0-9_]*\) is violated.*/\1/p' "$OUT/$name.out" | head -n 1)
  if [ "$status" -eq 0 ]; then got=pass
  elif [ -z "$got" ]; then got="error(exit $status)"; fi
  if [ "$got" = "$expect" ]; then mark=ok; else mark=MISMATCH; bad=1; fi
  printf '%-8s %-44s expect %-28s got %s\n' "$mark" "$name" "$expect" "$got"
done
echo "TLC output: $OUT"
exit $bad
