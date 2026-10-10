#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au4; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_suppress_only_during_swap js/history.js $'    try {\n    const outgoing = FM.scene.layers;' $'    suppress = false; try {\n    const outgoing = FM.scene.layers;' "AU4-1" "AU4-1"
m B1_group_no_editor_close js/app.js "if (FM.textEdit && FM.textEdit.syncToSelection) FM.textEdit.syncToSelection(g.id);
    FM.insertLayer(g);" "FM.insertLayer(g);" "AU4-2" "AU4-2"
m C1_restore_skips_project js/history.js "FM.scene.project = s.project;" "FM.scene.project = FM.scene.project;" "AU4-3" "AU4-3"
m C2_restore_skips_layers js/history.js "    FM.scene.layers = s.layers;
    try { keepOpenRows" "    FM.scene.layers = FM.scene.layers.length ? s.layers.map((x, i) => i === 0 ? FM.scene.layers[0] || x : x) : s.layers;
    try { keepOpenRows" "AU4-3" "AU4-3"
echo ALLDONE
