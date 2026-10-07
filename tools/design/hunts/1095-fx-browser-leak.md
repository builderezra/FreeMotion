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

---
# H19b addendum: all 12 categories, what holds the ~255 per-pick 367x652 canvases, and the mutation proof

Same container and method as above (live canvases by `Runtime.queryObjects` after two forced GCs; raw logs in `1095-patches/sweep12-unpatched.txt` and `sweep12-patched.txt`, script `canvcount.py` kept in my scratchpad). Heap snapshot: canvases marked with an expando, the query handle released first (else the DevTools handle is the shortest retainer), snapshot parsed with `1095-patches/holders.py` + `holders_parse2.py` (BFS shortest retainer path per marked canvas).

## 1. Sweep of all 12 categories (206 picks), unpatched main b46b47d3 vs patched
| | unpatched | patched |
|---|---|---|
| after category 11 (threed), 206 picks | 682 canvases, 1123 MB, 107 big | 680, 1115 MB, 106 big |
| browser closed (Done), immediately | 683, **1131 MB**, 108 big | 680, 1115 MB, 106 big |
| +4 s idle | 683, **1131 MB** | 680, **179 MB**, 14 big |
| +9 s idle, and after one render +8 s | unchanged, 1131 MB | unchanged, 179 MB |
The growth is not linear in picks: it is 97 canvases at 1080x1920 after category 1 (blur, 792 MB), about 100 from there on, then the **per-pick 367x652 canvases** climb to **255 by category 11** and the 192x192 tile canvases to 291. So on this box the fix takes 1131 MB to 179 MB. The Mac's 2.2 GB is still your number, not mine (**Guess**: bigger plates, more depth).
Distort and proc are slow here (tens of seconds each, cold thumbnails); the sweep was run through, not skipped.

## 2. What holds the 255 canvases of 367x652 (unpatched heap snapshot, shortest retainer path, **Measured**)
All of them hang off module variables of `js/compositor.js` (path `FM -> _chromaKey closure context -> variable`). On b46b47d3 the declarations are on these lines (re-checked on origin/main 470ee20e: same variables, lines `:3507 :4286 :9135 :10165 :11581 :12249 :14521 :14675 :14923`, a few off from b46b47d3's):
| holder | canvases of 367x652 | file:line (470ee20e) | note |
|---|---|---|---|
| `_cfPool` (A and B of 122 depth entries) | **244** (122 + 122) | `:11581`, created `:11775` | one pair per NESTING DEPTH; the browser's per-pick stack makes depth grow to ~122 |
| `_dspPool` (C, M) | 4 | `:10165` | two entries; **not trimmed by the patch** |
| `_mbPool` (acc, plate) | 2 | `:3507` | motion blur; not trimmed |
| `_thA`, `_thB` | 2 | `:14675` | thumbnail scratch singletons; not trimmed |
| `_psA`, `_psB` | 2 | `:14521` | not trimmed |
| `_miPool` | 1 | `:14923` | not trimmed |
So **244 of the 255 are `_cfPool` and the other 11 are small fixed pools.** That is the answer to "one per pick": `_cfPool` is indexed by nesting depth, the effects browser stacks one effect per pick (`previewStack`, `js/fx-browser.js:456`), so the 255 is 2 canvases x about 122 depths (the count of `_cfPool` entries that picks reach). `_cfPool` is one of the five pools the patch already trims; that is why patched leaves `367x652 x27` and not 255.
In the same snapshot `_pfPool` held the 1080x1920 canvases (19 of them, array indexes up to 101) and `_mflow` held 2 (a per-layer cache entry `cv`). **A gap I cannot explain:** the live count says 101 canvases at 1080x1920 but the snapshot's marked set has 19 under `_pfPool` and the rest of the 361 marked canvases sit as "(concatenated string)" strings in the same pool arrays (37 + 36 under `_cfPool`) that the parser could not name; I did not chase them (**Guess**: pool entries whose canvas is reached through a second property the BFS reports as a string node). The 244 figure is the one retainer path I am sure of.

## 3. What the patch leaves (patched: 14 big canvases, 27 of 367x652, 179 MB)
`_dspPool` (`:10165`), `_mbPool` (`:3507`), `_miPool` (`:14923`), singletons `_thA/_thB`, `_psA/_psB`, `_rgbA/_rgbB`, `_tiA/B`, `_duA/B`, `_dnC`, `_mbcA/B`, `_mfMov`, and `_mflow` (`:12249`). The patched `poolStats` after trim: `pf 2, wp 2, cf 2` entries (957,136 px each, the floor of 2 on purpose), `mg 0`, `exp 1`. Extending the trim to `_dspPool/_mbPool/_miPool` would free about **14 big x 8.3 MB (about 116 MB)** plus about 27 x 0.96 MB (about 26 MB) at 367x652: **under 150 MB, about 8% of the 1131 MB**. I did not write that patch: the first 92% is the five pools, the rest has per-effect state (`_mflow`, motion-blur accumulators) that a trim could corrupt, and it is not worth the risk without an owner who knows those.

## 4. Mutation proof (`1095-patches` applied in `wt-h19m`, port 8797; test `1095 the effect scratch pools shrink…`)
| run | 1280 | 380 |
|---|---|---|
| A: main + test only (patch reverted) | **FAIL** (pool still holds 12 entries) | **FAIL** |
| B: patched | pass | pass |
| M1: mutation "`_cfPool` never trimmed" | **FAIL** | **FAIL** |
| M2: mutation "trim timer never fires" | **FAIL** | **FAIL** |
| C: mutation restored (control) | pass | pass |
So the test catches both a missing pool and a dead timer, at both widths; reverted -> red, patch on -> green. **Not proved:** a mutation of the floor (`Math.max(2,_hw.x)`) or of the "refuse if any depth counter is non-zero" guard: the test does not exercise a trim mid-render, so a wrong guard would pass it (**Guess**: that is the one place the patch could cause a visible glitch, and the one thing left to test before shipping).
