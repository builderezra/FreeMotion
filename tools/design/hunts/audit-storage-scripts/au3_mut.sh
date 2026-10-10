#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au3; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_load_keeps_nulls js/storage.js "FM.scene.layers = plainLayers(scene.layers);" "FM.scene.layers = Array.isArray(scene.layers) ? scene.layers : [];" "AU3-1" "AU3-1"
m A2_apply_keeps_nulls js/storage.js "    obj.layers = plainLayers(obj.layers);" "" "AU3-1b" "AU3-1b"
m B1_sweep_reads_json js/storage.js "ckptLayerIds(raw).forEach(id => keep.add(id));" "{ const d = readJSON(lk, null); if (d && d.layers) d.layers.forEach(l => keep.add(l.id)); }" "AU3-2" "AU3-2"
m B2_remove_reads_json js/storage.js "ckptLayerIds(raw).forEach(id => elsewhere.add(id));" "{ const d = readJSON(lk, null); if (d && Array.isArray(d.layers)) d.layers.forEach(l => { if (l && l.id) elsewhere.add(l.id); }); }" "AU3-2b" "AU3-2b"
m C1_gradient_guard js/storage.js "if (l.fillGradient && (typeof l.fillGradient !== 'object' || Array.isArray(l.fillGradient))) delete l.fillGradient;" "" "AU3-3" "AU3-3"
m C2_transform_norm js/storage.js "if (!l.transform || typeof l.transform !== 'object' || Array.isArray(l.transform)) l.transform = {};" "" "AU3-3" "AU3-3"
m C3_cue_norm js/storage.js "if (l.captions != null) l.captions = Array.isArray(l.captions) ?" "if (false) l.captions = Array.isArray(l.captions) ?" "AU3-3" "AU3-3"
echo ALLDONE
