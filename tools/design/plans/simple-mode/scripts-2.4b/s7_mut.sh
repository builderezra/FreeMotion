#!/bin/bash
# the 2.4b mutations (run from a checkout of hunt/simple-2.4b; each is one tools/mutate.sh --only run)
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd ${S7TREE:-$SP/wt-s7}; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.4b · S7 '
m M1_clamp_tail js/spine-edit.js "u.kind === 'captions' && fs + fd > newEnd + 1e-9) {" "u.kind === 'captions' && false) {" "${T}a caption track lying"
m M2_clamp_head js/spine-edit.js "(u.kind === 'effect' || u.kind === 'captions') && fs + fd <= c.end + 1e-9 && s2 + fd" "(u.kind === 'effect') && fs + fd <= c.end + 1e-9 && s2 + fd" "${T}a caption track lying"
m M3_remap_import js/storage.js "if (FM.remapCommentPins) FM.remapCommentPins(obj.project, obj.layers, re.map);" "" "${T}FM.remapCommentPins"
m M4_remap_duplicate js/storage.js "if (FM.remapCommentPins) FM.remapCommentPins(projCopy, doc.layers || [], re.map);" "" "${T}FM.remapCommentPins"
m M5_remap_bake js/collab-comments.js "if (typeof t === 'number' && isFinite(t)) c.t = t;" "" "${T}FM.remapCommentPins"
m M6_rest_pairs js/spine-edit.js "if (j.r.gaps && j.r.gaps.length) restPairs(j.cam, j.r.gaps);" "" "${T}the camera"
m M7_dolly_refuse js/spine-edit.js "j.cam.transform.z != null && (FM.isAnimated" "false && (FM.isAnimated" "${T}the camera"
m M8_vol_rider js/spine-edit.js "if (volLayers.length) plan.writes.push(" "if (false) plan.writes.push(" "${T}the volume rider"
m M9_vol_needs_stay js/spine.js "if (on && key === 'rideVol' && !(layer.sm && layer.sm.stay)) return false;" "" "${T}Follow clips"
m M10_link js/spine.js "if (hs.every(x => x && x === hs[0])) { h = hs[0]; how = 'link'; }" "" "${T}the LINK RULE"
m M11_helper js/spine.js "if (hs.every(x => x && x === hs[0])) { h = hs[0]; how = 'helper'; }" "" "${T}rule 1b"
m M12_helper_matte js/spine.js "(c.via === 'parent' || c.via === 'follow') && c.fromUnit && c.fromUnit !== id" "(c.via === 'parent' || c.via === 'follow' || c.via === 'matte') && c.fromUnit && c.fromUnit !== id" "${T}rule 1b"
m M13_mover js/spine.js "if (rec && y.type === 'null' && !mainSet.has(y.id)) rec.mover = true;" "" "${T}rule 2"
m M14_mover_move js/spine-edit.js "if (ds.every(d => Math.abs(d - ds[0]) < 1e-9) && Math.abs(ds[0]) > 1e-9) addMove(p, mid, ds[0]);" "" "${T}rule 2"
m M15_repoint js/spine-edit.js "if (via === 'parent') { if (x.parent === from) x.parent = to; }" "if (via === 'parent') { }" "${T}rules 1, 4 and 5"
m M16_lineage_ends js/spine-edit.js "if ((ref.via === 'parent' || ref.via === 'audio') && y.splitOf) {" "if ((ref.via === 'parent' || ref.via === 'audio') && y.splitOf && false) {" "${T}rules 1, 4 and 5"
m M17_tail_fit js/spine-edit.js "const breaks = tied.length > 0 && moves && timeVarying(l);" "const breaks = false && tied.length > 0 && moves && timeVarying(l);" "${T}the tail fit"
m M18_sort_order js/spine-edit.js "dated.sort((a, b) => (+map.get(a.id).taken - +map.get(b.id).taken)" "dated.sort((a, b) => (+map.get(b.id).taken - +map.get(a.id).taken)" "${T}Sort by date"
m M19_sort_pack js/spine-edit.js "      cursor = ns + len;
    });
    clips.forEach" "      cursor = ns + len + 0.5;
    });
    clips.forEach" "${T}Sort by date"
m M20_sort_menu js/simple-tools.js "taken))).length >= 2) items.push" "taken))).length >= 1) items.push" "${T}Sort by date"
m M21_never_pinned js/spine-edit.js "if (u.mover || u.linked) return true;" "if (false) return true;" "${T}rule 2"
echo ALLDONE
