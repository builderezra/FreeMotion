#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-tr; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c260; }
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.7 · '
m W1_keys_kept js/spine-edit.js "stripOwned(owner, lo, hi, owner === Lb ? 'in' : 'out');" "" "${T}T10" "${T}T10"
m W2_no_head_trim js/spine-edit.js "x.start = M; x.duration = dB;" "x.duration = dB;" "${T}T10" "${T}T10"
m W3_no_tail_trim js/spine-edit.js "[La].concat(twA).forEach(x => { x.duration = rA.duration;" "[La].concat(twA).forEach(x => { x.duration = x.duration;" "${T}T10" "${T}T10"
m W4_no_trin js/spine-edit.js "Lb.trIn = { type: 'crossfade', d: Math.round(" "Lb.trIn0 = { type: 'crossfade', d: Math.round(" "${T}T10" "${T}T10"
m W5_tool_always js/simple-tools.js "if (sb && sb.kind === 'blend') out.push({ id: 'turnTr'" "if (true) out.push({ id: 'turnTr'" "${T}T10" "${T}T10"
echo ALLDONE
