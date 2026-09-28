#!/bin/sh
# Wrap the hub fragment (index.html) in the skeleton the Artifact publisher adds, so it can be opened locally:
#   tools/design/plans/simple-mode/vis/make-preview.sh   ->   vis/preview.html
# Serve the repo (tools/serve.sh 879N) and open /tools/design/plans/simple-mode/vis/preview.html.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
{
  printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  cat "$DIR/index.html"
  printf '%s\n' '</body></html>'
} > "$DIR/preview.html"
echo "wrote $DIR/preview.html"
