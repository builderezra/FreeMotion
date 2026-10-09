#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au5; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_no_drop_call js/collab-session.js "      dropRecoveredInserts(b.ops.concat(b.fix || []));
" "" "AU5-2" "AU5-2"
m A2_no_recovered_flag js/collab-session.js "sent: false, queued: true, recovered: true });" "sent: false, queued: true });" "AU5-2" "AU5-2"
m A3_never_matches js/collab-session.js "return !(op.o === 'li' && gone[op.id]);" "return true;" "AU5-2" "AU5-2"
m A4_drops_every_li js/collab-session.js "return !(op.o === 'li' && gone[op.id]);" "return op.o !== 'li';" "AU5-2" "AU5-2"
m B1_host_refuses_new_layers js/collab-host.js "if (el === undefined) return 'ok';                   // genuinely a new key: §13.3 as written" "if (el === undefined) return 'clash';" "AU5-1" "AU5-1"
echo ALLDONE
