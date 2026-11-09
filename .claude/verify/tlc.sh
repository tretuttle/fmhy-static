#!/bin/sh
# Shared TLC runner for the .claude/skills/verify-* formal-verification skills.
#
#   .claude/verify/tlc.sh path/to/Model.tla [path/to/Model.cfg]
#
# Pins the same tools the /statechart skill uses: TLC (tla2tools) 1.7.4, checksum
# verified, and Temurin Java 25, both installed through mise on first use (needs
# the network once). Exit status is TLC's: 0 = every invariant held; non-zero =
# an invariant violation, a deadlock (a state with no step out; give correct end
# states a no-op "Done" action) or a model error. Read the printed trace.
set -eu

spec=${1:?usage: tlc.sh Model.tla [Model.cfg]}
cfg=${2:-${spec%.tla}.cfg}
[ -f "$spec" ] || { echo "tlc.sh: no such spec: $spec" >&2; exit 2; }
[ -f "$cfg" ] || { echo "tlc.sh: no such config: $cfg" >&2; exit 2; }
# absolute config path: TLC runs from the spec's folder, the config may live elsewhere
cfg=$(cd "$(dirname "$cfg")" && pwd)/$(basename "$cfg")

TLC_TOOL='http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4'
JAVA_TOOL='java@temurin-25'

if [ -z "${TLA2TOOLS:-}" ] || [ -z "${JAVA:-}" ]; then
  command -v mise >/dev/null || { echo "tlc.sh: needs mise (https://mise.jdx.dev), or set TLA2TOOLS and JAVA" >&2; exit 127; }
  mise where "$TLC_TOOL" >/dev/null 2>&1 && mise which java --tool "$JAVA_TOOL" >/dev/null 2>&1 \
    || mise install "$JAVA_TOOL" "$TLC_TOOL" >&2
  TLA2TOOLS=${TLA2TOOLS:-$(mise where "$TLC_TOOL")/tla2tools.jar}
  JAVA=${JAVA:-$(mise which java --tool "$JAVA_TOOL")}
fi

meta=$(mktemp -d "${TMPDIR:-/tmp}/tlc-meta.XXXXXX")
trap 'rm -rf "$meta"' EXIT INT TERM

cd "$(dirname "$spec")"
exec_status=0
"$JAVA" -XX:+UseParallelGC -Djava.io.tmpdir="$meta" -jar "$TLA2TOOLS" \
  -workers 1 -metadir "$meta" -config "$cfg" "$(basename "$spec")" || exec_status=$?
exit "$exec_status"
