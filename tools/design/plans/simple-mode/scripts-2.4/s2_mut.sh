#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-s2; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
ALL=$'simple P2.4'
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -4; }
m M1 js/behaviors.js 'if (un.length >= 2) kf = un;' 'if (un.length >= 3) kf = un;' 'simple P2.4 · B5 Bounce'
m M2 js/spine-edit.js 'if (!anyway) return { ask: true, window: null };' 'if (false) return { ask: true, window: null };' 'simple P2.4 · T3 Reorder with a trimmed camera'
m M3 js/spine-edit.js "(mode === 'in' ? own[own.length - 1] : own[0]).v" "(mode === 'in' ? own[0] : own[own.length - 1]).v" 'simple P2.4 · T9 a crossfade made'
m M4 js/spine-edit.js 'if (Math.abs(dx - dy) > 1e-9 && timeVarying(y))' 'if (Math.abs(dx - dy) > 1e-9 && false)' 'simple P2.4 · T3 a link whose two ends'
m M5 js/collab-comments.js 'if (c.ls >= lo - 1e-6 && c.ls <= hi + 1e-6) {' 'if (false) {' 'T28'
m M6 js/spine-edit.js 'if (pa !== pb) { plan.counts.loopCleared = 1;' 'if (false) { plan.counts.loopCleared = 1;' 'simple P2.4 · T4 Reorder is a piecewise'
echo ALLDONE
