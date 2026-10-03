# Filter layer, local continuation

Starting snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa` (committed main). Local branch: `chatgpt/690-continuation`.

`tools/design/plans/2026-09-29-idle-backlog/backlog.md:1200-1201` asks for Add → Filter layer to place an adjustment layer over the clip under the playhead and open Filters. The source snapshot had only the ordinary Adjustment tile, which starts with two effects. This adds a neutral Filter layer tile and PC quick-menu entry. The new layer inherits the frontmost active image/video clip's timing, sits directly over that clip (including inside a group), becomes selected, and opens the Filters tab. An audio-only video is skipped; with no visual clip at the playhead the new layer starts there for the default duration. The Add marker is restored.

Changed: `js/app.js`, `js/addmenu.js`, `index.html` (both script cache tags), and one focused `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore syntax parsing for both changed scripts and the regression, a focused production-function behavior probe for active clip placement and empty fallback, and `git diff --check`. The browser regression and actual filter selection were not run in this sandbox.

This is a local, unpushed implementation. It does not change the shared Claude checkout or live app.
