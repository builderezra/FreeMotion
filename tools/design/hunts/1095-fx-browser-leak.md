# H19 / #1095: effects browser leaves full-size canvases alive

Base: `origin/main` b46b47d3 (v17.23). Container: Chromium 141 headless, software GL. Everything below is Measured here unless marked Guess.
Patches (apply to b46b47d3, checked with `git apply --check`, **not applied anywhere**): `1095-patches/1095-scratch-pools.patch` (js/compositor.js, 130 lines),
`1095-patches/1095-test.patch` (tests/tests.js, one test).

## What holds them
The canvas-effect scratch pools, `js/compositor.js`: `_pfPool` :4286 (acquired :4399), `_wpPool` :9135 (:9172, :9441), `_cfPool` :11581 (:11773), `_expPool` :11583, `_mgPool` :18411.
Each is indexed by NESTING DEPTH, each entry is two canvases the size of the plate, an entry is created the first time a stack reaches that depth, and **nothing ever
removes one**. The effects browser previews the layer with one effect per pick stacked (`previewStack`, `js/fx-browser.js:456`, `FM._fxPreview = {list}`), so every pick
deepens the stack; the pools grow to the deepest preview and keep it for the life of the page. Closing the browser, Done, rendering shallower frames: none of it frees them.

## Reproduction in this container (live canvases via `Runtime.queryObjects` after two forced GCs; `canvcount.py fxbrowser`)
Open the browser on a 1080x1920 project, open each category, tap every tile, go back, as the suite's own sweep test does.
| after | picks | canvases at 1080x1920 | total canvas pixels |
|---|---|---|---|
| browser just opened | 0 | 0 | 5 MB |
| category 0 (color) | 43 | 0 | 54 MB |
| category 1 (blur) | 62 | **97** | **792 MB** |
| category 2 (distort) | 91 | 105 | 890 MB |
| category 3 (proc) | 111 | 108 (+7 at 1080x1922) | 972 MB |
| category 4 (stylize) | 130 | 109 (+7) | 1013 MB |
The big ones are all on the effects' own pools. The count levels off near 100 rather than growing per pick, because the stack depth is what sets the pool size and only some effects use
them. **I did not run all 12 categories** (distort and proc each stall the page for tens of seconds on cold thumbnails, the suite's own comment says so), so I cannot reproduce your 335 / 2.2 GB:
this container shows about 1 GB after 5 of 12 categories. The Mac figure is yours; the mechanism is the same, the size differs (Guess: more categories, and the Mac keeps GPU-backed copies).
Also seen, not part of this fix: `192x192` tile canvases 147 to 216 (about 0.15 MB each, small) and `367x653` x130 after category 4 (one per pick, about 1 MB each, also never freed by close; I did not trace them).

**After closing the browser, idle (unpatched):** Done clicked and `FM.fxBrowser.close()`, then +4 s, +9 s, a render and +8 s: **97 canvases, 792 MB, unchanged throughout.** So the memory is
not waiting on a timer; it stays until the page does.

## The fix (smallest I found that is safe)
`_hw` = the deepest each pool went since the last trim (updated where an entry is acquired). `FM._trimScratch()` frees the entries above `max(2, _hw)` for each pool and resets `_hw`; it refuses when any
depth counter is non-zero (a render is mid-flight). It runs from a 3 s timer started at the end of every `FM.renderScene` (wrapper at the end of compositor.js), and re-arms while a pool is still above the floor.
Trimmed canvases are set to 0x0 and dropped from the pool, so a deeper stack later simply re-creates them. `FM._poolStats()` is a read-only seam for the test.
**Patched, same sweep, 2 categories then close:** 97 canvases / 792 MB while the browser is open (the stack is live, it is right to keep them), and **at +4 s after closing: 13 canvases at 1080x1920 / 128 MB**;
84 canvases show as `0x0` (freed storage). Unchanged at +9 s and after one more render. 792 MB to 128 MB.
What remains (13 big canvases, 128 MB) is the 2-entry floor (poolStats: `pf` 2 entries 8.3 Mpx, `cf` 2 entries 4.5 Mpx, `exp` 1) plus holders I did **not** identify; do not read "13" as proven free of leaks.

## The test (fails first, passes with the fix)
`1095 the effect scratch pools shrink after a deep stack is gone, and a deep stack still draws the same picture`: 12 stacked `wiggle` effects, one shallow frame, 7.5 s, asserts the pool shrank
and the 12-deep picture hash is unchanged.
- main + test only: **FAIL**, "after a 12-deep stack and one shallow frame, the canvas-effect pool still holds 12 entries (0 before)".
- main + both patches: **PASS**.
It takes about 8 s. (Re-run on both just now, ports 8791 / 8792.)

## What this does not show
- Not run on a phone, not run under the full suite after the patch (only `?only=1095` and the sweep above). A trim that fires during a drag would cost a re-allocation on the next deep frame; I measured no
  frame-time effect and did not look for one. Before shipping: the full pass at both widths, and a look at an effects-heavy project playing back.
- Not mutation-proved beyond the test failing on unpatched main.
- 3 s window and floor of 2 are my numbers, not measured optima.
