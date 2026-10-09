#!/bin/bash
# usage (repo root, all patches applied, P24 tests appended): bash p24_mut.sh
m() { timeout 590 tools/mutate.sh --only "$1" "$2" "$3" "$4" "$1" 2>&1 | grep -E "CAUGHT|SURVIVED|REFUSE|baseline" | tail -1; }
echo "== #1099"
m "P24 #1099" js/storage.js "if (!plain(obj.project)) return" "if (false) return"
m "P24 #1099" js/storage.js "v.kf.length > IMPORT_MAX_KEYFRAMES" "v.kf.length > 1e9"
m "P24 #1099" js/storage.js "nodes += v.length + 1) > IMPORT_MAX_PATH_NODES" "nodes += v.length + 1) > 1e12"
m "P24 #1099" js/storage.js "Object.keys(obj.fonts).length > IMPORT_MAX_FONTS)) return" "Object.keys(obj.fonts).length > 1e9)) return"
m "P24 #1099" js/storage.js "obj.layers = obj.layers.filter(l => !!l && typeof l === 'object' && !Array.isArray(l));" "void 0;"
