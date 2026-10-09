#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd $SP/wt-au2; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-300; }
m A1_fxScrubber_typed_snaps js/inspector.js "v = typed ? Math.max(p.min, Math.min(p.max, round(v, prec))) : Math.max(p.min" "v = Math.max(p.min" "AU2-1" "AU2-1"
m B1_paste_look_supports_only js/inspector.js "target.effects = (FM.fxRegistry && FM.fxRegistry.fitToLayer) ? fx.map(f => FM.fxRegistry.fitToLayer(f, target)).filter(Boolean) : fx;" "target.effects = fx.filter(f => FM.fxRegistry.supportsLayer(f.type, target));" "AU2-2" "AU2-2"
m C1_align_moves_locked js/inspector.js "      if (l.locked) return;
      const d = ns - l.start; if (!d) return;" "      const d = ns - l.start; if (!d) return;" "AU2-3" "AU2-3"
m C2_align_group_alone js/inspector.js "if (l.type === 'group' && FM.groupDescendants) FM.groupDescendants(l.id)" "if (false) FM.groupDescendants(l.id)" "AU2-4" "AU2-4"

echo ALLDONE
