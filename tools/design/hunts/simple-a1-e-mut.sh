#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd ${S9TREE:-$SP/wt-s9}; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.3 · S9 option E: '
m X1_no_row_css styles.css "#sm-tray[data-row=\"audio\"] .sm-tool { min-width: 44px; padding: 0 3px; }" "#sm-tray[data-row=\"audio\"] .sm-tool { }" "${T}the open Audio row"
m X2_row_closes_after_sound js/simple-tools.js "run: () => again(S.cmd.takeSoundOut(id))" "run: () => S.cmd.takeSoundOut(id)" "${T}the open Audio row"
m X3_old_tray js/simple-tools.js "...(isVid ? [audioT] : []),
        { id: 'earlier'" "...(isVid ? [speedT, volumeT] : []),
        { id: 'earlier'" "${T}a main video clip"
m X4_done_leaves_audio js/simple-tools.js "rowFor = (rowFor && rowFor.from) ? {" "rowFor = (false && rowFor && rowFor.from) ? {" "${T}the open Audio row"
m X5_reverse_not_pressed js/simple-tools.js "tool({ id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse', pressed: !!l.reversed," "tool({ id: 'reverse', label: w.reverse || 'Reverse', icon: 'reverse'," "${T}the open Audio row"
echo ALLDONE
