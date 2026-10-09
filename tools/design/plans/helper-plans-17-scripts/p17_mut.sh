#!/bin/bash
SP=/tmp/claude-0/-home-user-FreeMotion/a12bac8d-c002-516e-bdd8-78599ba9ad2e/scratchpad
cd ${P17TREE:-$SP/wt-p17}; export FM_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
m(){ echo "=== $1"; tools/mutate.sh --only "$5" "$2" "$3" "$4" "$5" 2>&1 | tail -3 | cut -c1-260; }
a=$'P17 #1051'; b=$'P17 #1052'; c=$'P17 #1053'; d=$'P17 #1054'; e=$'P17 #1055'
m A1_clamp_guard js/storage.js "if (!p || typeof p !== 'object' || Array.isArray(p)) return;" "if (!p) return;" "$a"
m A2_gate_project js/storage.js "if (!isPlainObj(obj.project)) return 'That project file is missing" "if (!obj.project) return 'That project file is missing" "$a"
m A3_gate_layers js/storage.js "if (!obj.layers.every(isPlainObj)) return 'That project file has a layer" "if (false) return 'That project file has a layer" "$a"
m A4_apply_guard js/storage.js "if (!obj || !isPlainObj(obj.project) || !Array.isArray(obj.layers)) return false;" "if (!obj || !obj.project || !Array.isArray(obj.layers)) return false;" "$a"
m B1_focus js/storage.js "l.focus = { enabled: f.enabled === true," "l.focus = { enabled: !!f.enabled," "$b"
m B2_fog js/storage.js "l.fog = { enabled: g.enabled === true," "l.fog = { enabled: !!g.enabled," "$b"
m B3_remind js/storage.js "keep.forEach(n => { if ('remind' in n && typeof n.remind !== 'boolean') n.remind = false; });" "" "$b"
m C1_numOrKf js/storage.js "    const num = finiteNum(v);
    if (num != null) return Math.max(min, Math.min(max, num));" "    if (typeof v === 'number' && isFinite(v)) return Math.max(min, Math.min(max, v));" "$c"
m C2_audiofx js/storage.js "const num = finiteNum(v);   // #1053: numeric text counts, as it does in effect parameters
        if (num != null) params[pd.key] = Math.max(pd.min, Math.min(pd.max, num));" "const num = (typeof v === 'number' && isFinite(v)) ? v : null;
        if (num != null) params[pd.key] = Math.max(pd.min, Math.min(pd.max, num));" "$c"
m C3_behaviors js/storage.js "          const num = finiteNum(v);
          if (num != null) {
            const min = isFinite(pd.min)" "          const num = (typeof v === 'number' && isFinite(v)) ? v : null;
          if (num != null) {
            const min = isFinite(pd.min)" "$c"
m C4_string_branch js/storage.js "if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return +v;
    return null;" "return null;" "$c"
m D1_condition js/shortcuts.js "'Nothing selected: Add menu → ' + labels.join(' · ')] : row;" "'Add menu → ' + labels.join(' · ')] : row;" "$d"
m D2_cards_row js/shortcuts.js "    ['1 – 9', 'A layer selected: open that panel card (its number is on the card)']," "" "$d"
m D3_backspace js/shortcuts.js "['Delete / Backspace', 'Delete selected layer']" "['Delete', 'Delete selected layer']" "$d"
m D4_ctrl_y js/shortcuts.js "    ['⌘/Ctrl + Y', 'Redo']," "" "$d"
m E1_aspect_onframe js/compositor.js "pixSizeY = aspect === 1 ? pixSize : Math.max(1, pixSize * aspect);" "pixSizeY = pixSize;" "$e"
m E2_soft_onframe js/compositor.js "a.imageSmoothingEnabled = pixSoft; a.clearRect(0, 0, cw, ch);" "a.imageSmoothingEnabled = false; a.clearRect(0, 0, cw, ch);" "$e"
m E3_grid_aspect js/compositor.js "const nX = Math.max(1, Math.round(W / size)), nY = Math.max(1, Math.round(H / sizeY));" "const nX = Math.max(1, Math.round(W / size)), nY = Math.max(1, Math.round(H / size));" "$e"
m E4_grid_soft js/compositor.js "a.imageSmoothingEnabled = !!soft; a.clearRect(0, 0, cw, ch);" "a.imageSmoothingEnabled = false; a.clearRect(0, 0, cw, ch);" "$e"
echo ALLDONE
