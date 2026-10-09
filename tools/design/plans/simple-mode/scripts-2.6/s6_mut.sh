#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd ${S6TREE:-$SP/wt-s6}; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.6 · '
m M1_waived_stays js/collab-ui.js "if (s && ridMid[rid] && s.peerIds && s.peerIds().indexOf(ridMid[rid]) >= 0) delete waived[rid];" "" "${T}S6a"
m M2_waived_ignored js/collab-ui.js "m.role === 'editor' && !waived[rid]; });" "m.role === 'editor'; });" "${T}S6a"
m M3_role_not_noted js/collab-ui.js "if (hereRid(who)) { const mid = ridMid[who]; s.setPeerRole(mid, role); noteRole(mid, role); }" "if (hereRid(who)) { const mid = ridMid[who]; s.setPeerRole(mid, role); }" "${T}S6b"
m M4_no_busy_ask js/spine-edit.js "if (busy && FM.ask) {" "if (false && busy && FM.ask) {" "${T}S6b"
m M5_no_left_mark js/collab-ui.js "try { if (FM.projects.patchCollab) FM.projects.patchCollab(pid, { ended: 'left' }); } catch (e) {}
        joinBusy++;" "joinBusy++;" "${T}S6c"
m M6_no_meta js/history.js "if (index > 0) { meta = metas[index];" "if (index > 0) { meta = null;" "${T}S6d undo and redo"
m M7_soft_toasts_in_simple js/collab-session.js "if (!simpleOnScreen()) toast(who ? 'Part of this was changed by '" "toast(who ? 'Part of this was changed by '" "${T}S6d one soft"
m M8_no_lease_half js/collab-session.js "if (structural || ids.length > 1) {" "if (false) {" "${T}S6e"
m M9_keep_undo_step js/collab-session.js "for (let i = stk.length - 1; i >= 0; i--) if (stk[i].cids && stk[i].cids.indexOf(ack.cid) >= 0) stk.splice(i, 1);" "" "${T}S6f"
m M10_star_for_full js/collab-session.js "const star = !!(entry && entry.ed === 's' && (ack.rej" "const star = !!(entry && (ack.rej" "${T}S6f"
m M11_no_mask js/collab-diff.js "delete c.kb; delete c.by;" "" "${T}S6g"
m M12_adopt_filter_off js/collab-session.js "if (st.adopt && S.othersSeq > (st.seq || 0) && adoptHit" "if (false && st.adopt && S.othersSeq > (st.seq || 0) && adoptHit" "${T}S6h"
m M13_seq_not_counted js/collab-session.js "if (!oo.own && oo.by !== S.mid) S.othersSeq += ops.length;" "" "${T}S6h"
m M14_no_clamp js/collab-bridge.js "if (p && p.sm && typeof p.sm.v === 'number' && FM.SM_V && p.sm.v > FM.SM_V) p.sm.v = FM.SM_V;" "" "${T}S6i"
m M15_mask_hidden_silent js/collab-session.js "if (rec.afterRaw !== undefined && canon(cur) !== rec.afterRaw) { soft++; S.lastSoftPath = P.key(p); }" "" "${T}S6g"
m M16_no_mine_button js/spine-edit.js "if (copy && FM.collab.ui && FM.collab.ui.leaveKeep) buttons" "if (false && copy && FM.collab.ui && FM.collab.ui.leaveKeep) buttons" "${T}S6c"
m M17_away_has_no_button js/spine-edit.js "buttons = away.length === 1 ? [{ label: line('arrangeAnyway')" "buttons = away.length === 1 ? [{ label: line('awayNo')" "${T}S6a"
echo ALLDONE
