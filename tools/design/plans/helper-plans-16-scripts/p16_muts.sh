#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
m(){ python3 $SP/p16_mut.py "$@" 2>&1 | grep -v "^ok  " | cut -c1-330; }
m M1_no_mute 'P16%20%231046' js/ai-ops.js 'if (hist && hist.mute) hist.mute();' ''
m M2_commit_when_quiet 'P16%20%231047' js/fx-browser.js 'if (FM.history && !quiet) FM.history.commit();' 'if (FM.history) FM.history.commit();'
m M3_bisect_flipped 'P16%20%231048' js/compositor.js 'if (fits(solid.slice(0, mid))) lo = mid; else hi = mid;' 'if (fits(solid.slice(0, mid))) hi = mid; else lo = mid;'
m M3b_measure_whole 'P16%20%231048' js/compositor.js 'while (hi < solid.length && fits(solid.slice(0, hi))) hi *= 2;' 'hi = solid.length * 2; while (false) hi *= 2;'
m M4a_index_ignored 'P16%20%231049%20a%20template' js/storage.js "k.indexOf('tpl:') === 0) { if (!tplR.ok || tplIds.has(k.slice(4))) continue;" "k.indexOf('tpl:') === 0) { if (tplIds.has(k.slice(4))) continue;"
m M4b_ckpt_unsafe_ignored 'P16%20%231049%20a%20save' js/storage.js 'if (!cr.ok) unsafe = true; else ckptLayerIds(cr.val).forEach(id => ckptKeep.add(id)); }' 'if (!cr.ok) {} else ckptLayerIds(cr.val).forEach(id => ckptKeep.add(id)); }'
m M4c_remove_ignores_unreadable 'P16%20%231049%20deleting' js/storage.js 'if (!unsafeRemove && doc && Array.isArray(doc.layers)) for' 'if (doc && Array.isArray(doc.layers)) for'
m M4d_no_copy 'P16%20%231049%20deleting' js/storage.js "    if (INDEX_KEYS.indexOf(key) < 0) return;
    try {" "    return;
    try {"
m M5_no_reread 'P16%20%231050' js/inspector.js 'const stored = storedRecentColors();' 'const stored = null;'
m M5b_popover_no_refresh 'P16%20%231050' js/inspector.js '{ const st = storedRecentColors(); if (st) FM.recentColors = st; }' ''
echo ALLDONE
