#!/bin/sh
# Dev server launcher that survives the unaccepted-Xcode-licence state.
# /usr/bin/python3 is an Xcode shim and refuses to run until the licence is accepted (needs sudo).
# Pointing DEVELOPER_DIR at the Command Line Tools uses the same binaries with no licence gate.
[ -x /Library/Developer/CommandLineTools/usr/bin/git ] && export DEVELOPER_DIR=/Library/Developer/CommandLineTools
cd "$(dirname "$0")/.."
exec python3 -m http.server "${1:-8791}"
