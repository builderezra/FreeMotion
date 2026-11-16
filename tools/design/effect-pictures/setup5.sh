# Round 5 setup: snapshot the effects branch, placeholders for tiles-h*, start the server. Writes nothing under ~/FreeMotion.
SITE="$(cd "$(dirname "$0")" && pwd)"
SRC=/home/ezra/fm-claude-wt/ss; SNAP=/home/ezra/fx-ss-snap
[ -e /home/ezra/FreeMotion/.ship-in-progress ] && { echo "SHIP RUNNING: stop"; exit 1; }
mkdir -p "$SNAP"
rsync -a --delete "$SRC/js/" "$SNAP/js/" && cp "$SRC/index.html" "$SNAP/index.html"
{ echo "snapshot of $SRC taken $(date '+%F %T')"; git -C "$SRC" log -1 --format='HEAD %h %s' | cut -c1-160; git -C "$SRC" status --short | sed 's/^/dirty: /'; } > "$SNAP/SNAP.txt"
cat "$SNAP/SNAP.txt"
echo "== scripts in ss index.html that main's does not load:"
diff <(grep -o 'js/[A-Za-z0-9_.-]*\.js' /home/ezra/FreeMotion/index.html | sort -u) <(grep -o 'js/[A-Za-z0-9_.-]*\.js' "$SNAP/index.html" | sort -u) | grep '^[<>]' || echo "   (none: same script list)"
echo "== effect files differing main vs ss:"
for f in compositor.js fx-registry.js filters.js fx-presets.js fx-thumbs.js gl-warp.js gl-color.js; do cmp -s "/home/ezra/FreeMotion/js/$f" "$SNAP/js/$f" || echo "   $f differs"; done
for i in $(seq 1 14); do [ -s "$SITE/tiles-h$i.js" ] || echo "/* round 5 slot $i: empty until its agent writes it */" > "$SITE/tiles-h$i.js"; done
mkdir -p "$SITE/shots/r5"
bash "$SITE/start.sh"
for u in /ss/js/compositor.js /app/js/compositor.js /truth.html /view.html /tiles-h1.js; do curl -s -o /dev/null -w "$u %{http_code}\n" "http://127.0.0.1:8791$u"; done
echo "== tile ids for the upgraded effects (from the site's tile files):"
cd "$SITE" && grep -ohE "id:'(blinds|dispersion|starfield|lensblur|dirblur|directionalblur|numroll|numberroll|lensflare|crt|cardflip|cube|rocknoise|clouds|moshbloom|datamosh|weather|snowrain|snow)[a-z0-9]*'" tiles-*.js | sort | uniq -c
