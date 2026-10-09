#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au8; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A2_rename_uncut js/storage.js "      name = cardName(name, e.name || 'Untitled');   // AU8-1
" "" "AU8-1" "AU8-1"
m A3_duplicate_uncut js/storage.js "const name = cardName(opts.name || ((src.name || (doc.project && doc.project.name) || 'Project') + ' copy'), 'Project copy');   // AU8-1" "const name = opts.name || ((src.name || (doc.project && doc.project.name) || 'Project') + ' copy');" "AU8-1" "AU8-1"
echo ALLDONE
