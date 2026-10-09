#!/bin/bash
# the ◇ lane mutations, against the FINAL code (Y4 and Y5 in s11_mut.sh mutated an earlier shape of the ◇ and the clip tray)
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-tr; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
T=$'simple P2.7 · '
m V1_chip_on_every_seam js/simple-timeline.js "if (e.slot || i < 1 || !l || !(FM.spine.joinInto && FM.spine.joinInto(R, e.id))) return;" "if (e.slot || i < 1 || !l) return;" "${T}T7" "${T}T7"
m V2_chip_over_items styles.css ".sm-chip-tr { z-index: auto;" ".sm-chip-tr { z-index: 9;" "${T}T8" "${T}T8"
m V3_chip_before_sections_lost index.html "<div id=\"sm-trlane\"></div>
          <div id=\"sm-sections\"></div>" "<div id=\"sm-sections\"></div>
          <div id=\"sm-trlane\"></div>" "${T}T8" "${T}T8"
m V4_always_filled js/simple-timeline.js "'sm-chip sm-chip-tr' + (l.trIn ? ' sm-chip-tr-on' : '')" "'sm-chip sm-chip-tr sm-chip-tr-on'" "${T}T8" "${T}T8"
m V5_blend_chip_no_select js/simple-timeline.js "chip.addEventListener('click', ev => { ev.stopPropagation(); FM.selectLayer(e.id); });" "chip.addEventListener('click', ev => { ev.stopPropagation(); });" "${T}T10" "${T}T10"
m V6_chip_tap_no_row js/simple-timeline.js "FM.selectLayer(e.id); if (FM.simpleTools && FM.simpleTools.openRow) FM.simpleTools.openRow('transition', e.id); });" "FM.selectLayer(e.id); });" "${T}T8" "${T}T8"
echo ALLDONE
