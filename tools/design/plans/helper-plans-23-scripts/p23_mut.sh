#!/bin/bash
# usage (from the repo root, on a tree with ALL FIVE patches applied and the P23 tests appended):  bash p23_mut.sh
# Each line: mutate.sh --only "<test title substring>" <file> "<old>" "<new>" "<expected failing test>"; CAUGHT is the pass.
export FM_CHROME="${FM_CHROME:-}"
m() { timeout 590 tools/mutate.sh --only "$1" "$2" "$3" "$4" "$1" 2>&1 | grep -E "CAUGHT|SURVIVED|REFUSE|❌|✅" | head -3; }
echo "== #1093"
m "P23 #1093" js/collab-media.js "return n > MAX_PIXELS;" "return n > MAX_PIXELS * 1000;"
m "P23 #1093" js/collab-media.js "if (e.kind === 'image' && await tooManyPixels(file)) {" "if (false && e.kind === 'image' && await tooManyPixels(file)) {"
m "P23 #1093" js/collab-media.js $'      ctl.failed++;\n      ctl.dirty = true;\n      M.ui.sync(ctl);\n      return false;' $'      ctl.dirty = true;\n      M.ui.sync(ctl);\n      return false;'
echo "== #1092"
m "P23 #1092" js/collab-ui.js "when they try to join, even if you do not let them in." "when they join."
m "P23 #1092" js/collab-ui.js "can see your internet address when" "can see the internet address of each device that joins when"
echo "== #1090"
m "P23 #1090" js/collab-session.js "'fromTemplate', 'notes'];" "'fromTemplate'];"
m "P23 #1090" js/collab-host.js "C.DENY.indexOf(op.p[1]) >= 0) return 'private';" "C.DENY.indexOf(op.p[1]) >= 99) return 'private';"
echo "== #1091"
m "P23 #1091" js/storage.js "e.collab.roExport === false);" "e.collab.roExport === 'no');"
m "P23 #1091" js/storage.js "e.collab.role === 'viewer' || e.collab.role === 'commenter') &&" "e.collab.role === 'viewer') &&"
m "P23 #1091" js/collab-session.js "!FM.projects.canKeepLinked(gpid)) return Promise.resolve(null);" "false) return Promise.resolve(null);"
m "P23 #1091" js/collab-session.js "FM.projects.patchCollab(S.gpid, { roExport: rs.roExport });" "void 0;"
m "P23 #1091" js/storage.js "['ended', 'seen', 'roExport'].forEach" "['ended', 'seen'].forEach"
