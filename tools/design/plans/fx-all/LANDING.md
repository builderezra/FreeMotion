# fx landing on fb2 — landing notes

Branch `hunt/fx-land-on-fb2` (local in the helper clone, NOT pushed): fx-all's own work — E1's six new effects (#1114),
#1116's Soften Skin defaults and #482 polish batches 7, 8 and 10–15 of his #966 list — ported onto fb2. The label stays
v17.38 as fb2 has it, so it ships as v17.4x. It closes none of his numbered items outright: every line refers.

Commits on top of b71cb900:
1. `82f2d035` — the port (code, tests rebuilt by blocks, busters, SCHEMA_REV 10 / SCHEMA_FP, the 15.2 × 4.1 fix and its test).
2. `ac775529` — **an fb2 bug, not a landing one**: a Gradient Overlay saved without Amount drew nothing (answers-1130's
   #482 Gentler change). Cherry-pickable onto fb2 on its own (checked: applies cleanly to b71cb900; it needs its own
   compositor buster there).
3. these notes.

⚠️ **If the builder ships fb2 as separate releases first, rebase this onto what actually shipped**: re-measure SCHEMA_FP
(the method below), re-check every buster against the shipped index.html, and re-run the drops check against the shipped
tree. If commit 2 is cherry-picked onto fb2 first, drop it here.

## Base and method

**Base**: `b71cb900` = the API builder's `wip/fb2-port` (dc366c68) + a cherry-pick of 3b42d50d (test-only: the queue 264
sweep's allow-list gains `radialwipe:progress=min`). fb2 = main v17.39-equivalent + the v17.40 port + AX2 export audio +
labs-on-fixes + land-b2 + land-b3 + fix-land-b3 + answers-1130 (#1056 Mosaic, #1110 Glitch, #482 Gradient Overlay
Gentler, #482 batch 4 Filters tab layout A, 4.4 Reset to original look, #1122 answer 3) + #1082 Tutorials.

**Method**: NOT a git merge. fb2 carries land-b2/b3, fix-land-b3 and answers-1130 as squashed port commits, so git does
not see land-b3 (45a97e1f) as history shared with fx-all; a merge would re-add land-b3 on both sides. Every one of
fix-land-b3, answers-1130 and e1-land sits on 45a97e1f, so it is the true 3-way base, and fx-all's own delta
`D = git diff 45a97e1f 6f1d90b1` was ported:
- **code** — `git apply --3way` of D for every path except tests/tests.js and index.html. Ten files applied cleanly; two
  conflicted (below). Then a per-line 3-way multiset check on every file both sides changed (app, collab-core, compositor,
  exporter, inspector): for every line, count(landing) = count(fb2) + count(fx-all) − count(base). It holds everywhere
  except the lines resolved by hand below.
- **tests/tests.js** — rebuilt by blocks, never union-merged (see "Tests").
- **index.html** — fb2's file, busters bumped (see "Busters").
- **every added file** (tools/design/hunts/new-effects-1.md, E1's sheets, scripts and results) is byte-identical to fx-all's.

## Conflicts and how each was resolved

| where | kind | resolution |
|---|---|---|
| `js/compositor.js` Unsharp Mask / Hexagon Tiles registry rows | textual (adjacent lines) | fb2's Unsharp Mask row (fix-land-b3: Protect colour **def 0**, legacy 0 — fx-all never touched that row, it still had def 100) + fx-all's Hexagon Tiles params list (10.7: Tile size, Grout, Edge shade, Grout colour). |
| `js/collab-core.js` SCHEMA_REV | textual | 9 (fb2) vs 10 (fx-all) → **10**, one comment naming everything since 8: fb2's unshipped rev 9 (land-b3's Unsharp Protect colour, #482 Gradient Overlay Amount 0.5 / legacy 0.8), E1's six effects (which also claimed 9 on e1-land) and #1116, batches 7–15 and the audio tuple's `legacy`. |
| `js/collab-core.js` SCHEMA_FP | textual | re-measured on this tree: **1856346714373782**, "before: fb2 (SCHEMA_REV 9) 6375563268202997" (table below). The fx-all code change (the audio tuple carries `legacy`) applied cleanly. |
| `js/inspector.js` `atStrength` — **#482 15.2 meets 4.1** | semantic (no textual conflict) | 15.2 makes `FM.filters.makeInstance` hand back a filter he SAVED with its own Strength and finish; 4.1's Filters-bar Strength then **overwrote** that Strength with the bar's, so with the bar untouched a filter saved at 60 % previewed and landed at 100 % (and a keyframed Strength became a plain number). Now the bar SCALES the filter's own Strength: a library look's own is 1, so 4.1 is exactly as it was; his own lands as saved at 100 % and gentler as the bar comes down; the own value is read once per container (a WeakMap) so dragging the bar does not compound; keyframes are scaled key by key and left alone at 100 %. New test `482 15.2 with 4.1 a filter he saved at Strength 60% picked on the Filters tab…` right after fb2's 4.4 test (CONTROL: a library look at 50 % previews at 0.5). Checked in node against a stub (`atstr.js`: library = bar, saved = own × bar, no compounding, keyframes, the 4.1 test's 0.4) — **the test itself has not run in a browser**. |
| `js/compositor.js` Gradient Overlay kernel | **an fb2 bug**, found by the sweep | commit 2. answers-1130 f8bf9dea gave Amount `legacy: 0.8`, which makes the render-time fill leave an absent key to the kernel — whose fallback `evalProp(p.amount) == null ? 0.8` never fires (evalProp(undefined) is 0, queue 755). A save without Amount drew nothing; `482 a new Gradient Overlay starts Gentler…` and `784: no effect is switched off by a missing param key…` are red on fb2 itself (node, both). Fixed to `p.amount == null ? 0.8 : evalProp(…)`; both PASS after, and only an absent key changes. |
| tests/tests.js | none real | No test was modified by both sides (the one "both" in the analysis was base's last test, whose chunk carried the file's `})();`). |
| index.html | busters only | see "Busters". |

**Checked where both sides met, left as merged — both behaviours kept:**
- **Scanlines** (fix-land-b3 F1's keyed `off − 1e-9`; 13.4's Softness / Direction / Line colour): 13.4 hands the same `off`
  to `scanlines13`, which selects with the same `(q − off) mod pitch` rule for rows and for columns, so the ceiling-edge
  sign is right both ways; with Softness the weight is continuous and the epsilon is invisible.
- **Scramble Text** (F1's `integrateCount`; 12.4's Resolves order) and **Lightning** (F1's `integrateCount` on Flicker;
  11.6's Strike / Glow / Segments / Draw on): disjoint lines in the same kernel, both kept.
- **The batches' new `integrateProp` sites** (Clouds Evolve and Drift, Starfield Drift and Fly-through, Roughen Edges
  Evolve, Mirror's distance helper) integrate continuous distances, not counts, so F1's `integrateCount` rule does not
  apply to them.
- **The adjustment-layer path** (4.2's ◐ `sansFilters`; 15.7's plate blur and CSS-first order) and **RGB Split on an
  adjustment layer** (fix-land-b3's no-1-px floor; 15.7's blur line beside it): disjoint, both kept.
- **Frame Stutter, Shake, Pulse, Roughen Edges, Unsharp Mask, RGB Split, Mosaic, Glitch**: no batch touched their
  kernels (Roughen's 11.7 Boil / Pattern / Complexity / Erode sit beside fix-land-b3's test-only change; the `690
  Roughen Edges scales project-pixel controls…` test PASSES here in node). **Radial Wipe**: 12.3's Direction / Blades /
  Fit / Invert keep Progress 0 = nothing revealed; fb2's queue 264 allow-list entry is kept (fx-all's copy of that test
  predates it); `690 hard Wipe and Radial Wipe fully hide the first frame` PASSES here in node.
- **Filters tab**: 15.4's "On my clip" hook is in `mkTile`, the one tile builder layout A's Your filters row and Search
  results also use, so the engine reaches every row. 4.4 Reset to original look replaces only `effects`, so the
  container's 15.x finish, Tonal range, Protect skin and Over-drive survive a reset (a question for Ezra, below).

**Found, not fixed (latent — unreachable until the "On my clip" switch is drawn):** an "On my clip" tile renders a
same-id copy of the layer through `renderScene`, and both view-only overrides key on the layer id — `FM._fxPreview` (the
picks) and the new `FM._fxCompare` (the held ◐). So a tile generated while a look is picked would show that pick stacked
under the tile's filter, and one generated while the ◐ is held would show no filter at all — and either is cached under
sceneRev, which neither override moves. When the switch is built: clear both overrides around the tile render in
`fx-thumbs.js` (`layerStep`'s `lrender`), with a test.

## Tests

Rebuilt by blocks from fb2's file: fx-all's mid-file changes applied with `git merge-file` (no conflict, none of them
touches a test fb2 changed) — E1's `const E1` helper block, `1116 Soften Skin starts stronger…` and the eight `E1 …`
tests **where fx-all has them, before `async function run()`** (not at the end: that keeps the suite order E1 was proven
in), `kitchen921` frozen at the first 205 effects, the `921 S1 convergence fuzz` seed readable from `?seed=`, and `745` /
`913.8`'s featured-row expectations; then batches 7–15's appended block inserted once before fb2's final `})();`.
**2506 (fb2) + 130 (fx-all added) − 0 (fx-all removed) + 1 (the landing's own) = 2637 titles**, no duplicate title,
every test body equal to its source (fx-all's where fx-all added or changed it, fb2's otherwise), 241 new top-level
declarations with no name colliding with fb2's 834. The file parses.

## Busters

fb2's index.html; every js file whose content differs from fb2's has `?v=` above fb2's — max(fb2 + 1, fx-all's):
app 476→**477**, audio-fx 16→**18**, audio-fx-live 14→**15**, collab-core 28→**29**, compositor 215→**218**, exporter
127→**128** (both sides had 127 with different content), filters 19→**20**, fx-registry 25.31→**27.32**, fx-thumbs
54→**55**, gl-warp 4→**6**, inspector 417→**418** (fx-all had 415, below fb2's), storage 61→**62**. No new script tags;
every tag points at a file; every js/*.js is loaded. `treecheck.py b71cb900 HEAD` → OK.

## The collab schema — SCHEMA_REV 10, SCHEMA_FP 1856346714373782

Measured with `scratchpad/agents/fx-all2/fp.js` (the app's own collab-core, storage, registries and bridge in a vm).
Controls first, all exact:

| tree | pinned | node |
|---|---|---|
| fb2-rw b71cb900 (SCHEMA_REV 9) | 6375563268202997 | 6375563268202997 |
| fx-all 6f1d90b1 (SCHEMA_REV 10) | 4775724801447341 | 4775724801447341 |
| **this tree (SCHEMA_REV 10)** | — | **1856346714373782** (subset and all-script loads agree) |

It differs from fx-all's because fb2's registry differs (Unsharp Protect colour def 0; Gradient Overlay Amount def 0.5,
legacy 0.8). With the number pasted, the suite's own bodies of `921 S1 the schema fingerprint gate`, `482 3.6 Collab - the
sync schema fingerprint sees the audio effects controls` and `simple P1 · the collab fingerprint carries the sm rules` all
PASS in that vm; with fb2's number the gate FAILS ("set SCHEMA_FP to 1856346714373782 (it is 6375563268202997)"). Commit 2
changes no registry entry, and the fingerprint was re-checked on the final tree: match.

## Node proof — fx-all (control) vs this tree, the same harnesses

| check | harness | fx-all | this tree |
|---|---|---|---|
| batch 7 (20) | fx-b8 mock + rt78.js | 0 / 20 (node cannot render audio) | identical verdict list |
| batch 8 (15) | the same | 1 / 15 (8.2's preset registry) | identical |
| batch 10 (10) | fx-b10 harness + minirun | 7 / 7 CPU + 3 GPU skipped | identical |
| batch 10 shaders | fx-b10 glcheck (every warp shader through a fake GL) | 0 problems | 0 problems |
| batch 11 (16) | fx-b11 runtests.js | 16 / 16 | identical |
| batch 12 (15) | fx-b12 runtests.js | 15 / 15 | identical |
| batch 13 (14) | fx-b13 runtests.js | 14 / 14 | identical |
| batch 14 (16) | fx-b14 runtests.js | 16 / 16 | identical |
| batch 15 (15) | fx-b15 runtests.js (soft canvas) | 15 / 15 | identical |
| pins b11 / b12 / b13 / b14 3D | capture.js | 42 / 67 / 35 / 63 | 0 moved vs fc8866f1's saved pins and vs fx-all |
| pins b15 (soft-canvas renders) | pins.js | 234 | **4 moved**: Cold Steel and Overdrive, each at full and at Strength 0.6 — explained below |
| audio sweep | fx-b8 mock.js | 1360 runs, 0 fails | byte-identical output; audio-fx, audio-fx-live, storage identical to fx-all's |
| existing-test sweep (327 titles: exall.js's keyword pick, every test fb2 added, every non-batch test fx-all added) | fx-b15 soft-canvas harness, 30 s cap | 240 here, 120 PASS | vs fx-all: 238 / 240 same, 2 flips (below); vs fb2-rw: 316 / 316 same before commit 2 |

**The 4 moved b15 pins** — (a) fix-land-b3 (the fb2 port 3/5, e709e501) set Unsharp Mask's Protect colour **def 100 → 0**,
"so a NEW Unsharp Mask, the Cold Steel and Overdrive filters (built through makeInstance) … keep the per-channel look".
Shown two ways: this tree with ONLY that default put back to 100 gives all 234 of fx-all's pins exactly; and fb2-rw
renders all 112 library-filter pictures (Cold Steel and Overdrive included) exactly as this tree does.

**The 2 sweep flips against fx-all**, both from fb2:
- `482: every effect does something visible at its own defaults` — FAIL on fx-all ("Unsharp Mask … p95 3"), PASS here:
  the same fix-land-b3 default (a new Unsharp Mask sharpens per channel again). A correction.
- `784: no effect is switched off by a missing param key…` — PASS on fx-all, FAIL here and on fb2-rw ("gradientoverlay"):
  the fb2 bug fixed by commit 2 (with `482 a new Gradient Overlay starts Gentler…`, red on fb2 the same way).
  After commit 2 the sweep on the final tree: see the last paragraph of this section.

fix-land-b3 and answers-1130's node-runnable tests, fb2-rw vs this tree, same verdicts: `690 Noise keyed at a constant
Speed 24 (and Glitch and Flash Random…)`, both `690 Frame Stutter … keyed` tests, `690 Unsharp Mask Protect colour is off
by default…`, both `690 RGB Split …` tests, `690 Roughen Edges scales project-pixel controls…`, `690 Scanlines Roll keyed…`,
`1056 Mosaic (Average)…`, `1110 Glitch’s RGB fringe…` PASS on both. `690 Shake keyed…` and `690 Pulse Square keyed…` fail
on both for the harness (no DOMMatrix `translateSelf`); the 4.x Filters-tab tests, AX2, Simple 2.2 and 1082 need the DOM,
the exporter or fetch and fail on both for that. E1's eight and #1116 give fx-all's verdicts (Glitter and "preview equals
export" fail in node on both, as on fx-all).

Final tree (after commit 2), the whole sweep re-run: 325 of 327 titles here (2 are Simple 2.2 titles whose `’` the
list mangled — not effects), 131 PASS. Against the tree before commit 2 exactly two verdicts moved, both FAIL → PASS:
`784` and `482 a new Gradient Overlay starts Gentler…`. Against fx-all: 239 / 240 the same (the one flip is the Unsharp
Mask correction above). Against fb2-rw: 314 / 316 the same, the two being commit 2's. Batch runners, pins, the audio sweep
and the fingerprint were also re-run on the final tree: unchanged from the table.

## DROPS TEST

`drops.py b71cb900 HEAD` → **0 dropped**. (Against fx-all, 6f1d90b1 → HEAD shows 3, all fb2's own replacements, not this
landing's: `690 RGB Split keeps a green-only shift and a small positive Amount…` → fix-land-b3's two RGB Split tests;
`690 Unsharp Mask protects neutral detail…` → `690 Unsharp Mask Protect colour is off by default…`; `967 B4 1 one name …
the one place that says it is still being tested…` → labs-on-fixes' "…no screen says it is still being tested". If fb2
ships first they are already in main and this tree drops nothing.)

## Browser checks still owed

Nothing on this tree has run in a browser. Owed, beyond the usual two suite passes and prove:

1. **The schema gate itself**: `?only=921 S1 the schema fingerprint gate` (node says green; the browser is what counts).
2. **GPU parity**: batch 10's three — `482 10.1 Every warp - the GPU draws the same Edges and Smooth sampling…`,
   `482 10.2 Wave, Ripple and Curl - the GPU draws…`, `482 10.3 Kaleidoscope - the GPU draws…` (10.3 went red once in a
   browser and was fixed for exact ties, never re-run) — and batch 14's Tile Grid Gap / Scroll on the GPU,
   `482 14.5 Tile Grid - Gap leaves an empty band… and the shader agrees`.
3. **Batches 7 and 8, all 35 tests** (`?only=482%207.` 20, `?only=482%208` 15): audio renders and the audio panels at 390
   and 1280 px. Only 8.2's registry half ran, in node against a mock.
4. **Inspector rows, by eye at ~380 px and on a PC**: `offUntil` (Tempo / Keep bass centred read Off at 0, a drag skips
   1–39); the Lightning Core swatch with Core unset; Levels' channel rows; the "does nothing here" pill (Grain / Vignette /
   Sharpen on an adjustment layer's Filter); the blur-order note; "On my clip" (engine only, no switch). Also seen only in
   node: Hexagon's Grout colour row greying at Grout 0, Vocal Remove's greying, Telephone Style's five buttons fitting,
   Tempo's readout line.
5. **Match Grade Hold at time on a real video and a real export** (15.6: run only against a stand-in frame cache).
6. **Backfill's pictures** (14.4: Solid colour, Mirrored edges, Saturation, Vignette never ran through renderScene).
7. **New from this landing**: the landing's own test `482 15.2 with 4.1 …` (written, never run); fb2's Filters-tab tests
   4.1–4.5 and 4.4 on THIS tree (inspector.js carries batches 8 / 15 rows beside layout A); `482 a new Gradient Overlay
   starts Gentler…` and `784` (green in node after commit 2); `482: every effect does something visible…` (green in node
   here, red in node on fx-all); E1's eight and #1116 at 1280 and 380 on this tree; the queue 264 sweep `no effect erases
   the layer at a single parameter extreme` — in node it only gets as far as "84 effect(s) THREW" (no DOMMatrix), so
   whether any new batch / E1 param erases the layer at an extreme is **unmeasured**.
8. **Cold Steel and Overdrive** now draw fix-land-b3's per-channel sharpening (the picture moved against fx-all, as on fb2).

## Questions for Ezra

- **Audio presets (8.2)**: the chips at the top of an open effect and the "Save as my preset" button need drawing first
  (#545). The preset values are reasoned, not yet heard.
- **Filters tab "On my clip" (15.4)**: how the switch looks, where it sits on the tab (layout A now has Search filters and
  Your filters on it), and whether a portrait clip's tile stays square or takes the clip's shape.
- **Poster Print (13.1)**: switch its recipe to Halftone's Colour dots?
- **Find Edges (12.6)**: the colour rows are called Light colour / Dark colour (not "Line / background") because the
  Lines switch flips which one is the line — all right?
- **Telephone (7.4)**: the Walkie-talkie squelch (a level gate) is not built — wanted?
- **Trail Time offset (14.5)**: on a video every copy shows the current frame (a past video frame needs a frame cache)
  — worth building?
- **New — Reset to original look (4.4) and the Filter's new controls (15.1–15.3)**: Reset puts the ingredients back and
  keeps Strength; it now also keeps Warmth, Fade, Grain, Vignette, Sharpen, Tonal range, Protect skin and Over-drive.
  Should "original look" put those back too (and, for one of his saved filters, back to what he saved)?
- **New — a saved filter and the bar's Strength**: picked from Your filters, his filter lands at the Strength he saved it
  with when the bar is at 100 %, and at that × the bar otherwise (60 % saved, bar 50 % → 30 %). All right, or should the
  bar start at the saved filter's Strength instead?

## Suggested POLISH-LOG line

- v17.4x — #482 (partial; refers to #482 / #966 / #1114 / #1116) — Six new effects (#1114): **Colour Cycle**, **Soften Skin**, **Oil Paint**, **Glitter**, **Censor** and **Pop Art**, each in its menu and found by the words a beginner types, and Soften Skin starts stronger (Amount 0.85, 10 px, Keep detail 50 — #1116). And eight more polish batches of his #966 list (“this is the complex version we want as much choice as possible”). **Sound** (batches 7 and 8): Mix and Output on every audio effect; Shape (Triangle, Square, Saw, Random) on Tremolo, Auto-Pan, Vibrato, Chorus, Flanger and Phaser; Tempo sync (BPM and a note length) on Echo, Ping-Pong, Tremolo and Auto-Pan; Distortion Type (Hard clip, Tube, Fuzz, Wavefold, Rectify), Tone and Auto level (it no longer gets louder as Drive goes up); Telephone Style (Phone, Radio, Megaphone, Walkie-talkie, Old radio); Slope on Low-Pass, High-Pass, Band-Pass and Notch; Phaser Stages and Centre; Ring Mod sweep; Chorus Voices, Spread and Feedback; Ping-Pong Right-side timing, Tone and Width; Stereo Width Keep bass centred and Auto trim; Vocal Remove Keep highs and Centre only; Auto-Pan Realism; Pitch Shift Grain; Compressor Auto makeup; Limiter Clip at ceiling (presets for six effects are in; their buttons wait on a drawing). **Warps** (10): Edges and Smooth sampling on every warp, on the CPU and the GPU; Wave speed; Ripple and Curl Falloff and Radius; Kaleidoscope Flow and Source; Turbulent Flow; Displacement Map channels and Map blur; Mirror angle; Hexagon Grout. **Generators** (11): Particles from a line, box, circle or the whole frame; Snow & Rain Confetti, Embers, Dust, Petals and Bubbles; Starfield Fly-through; Clouds Boil; Voronoi fills; Lightning Point to point; Roughen Edges Boil and Erode. **Keying, wipes and text** (12): Chroma Key Pro matte tools; Luma Key Similar; Wipe Fit to Layer and Invert; Radial Wipe both ways and Blades; a blinking Type-On caret; Scramble orders; Timecode HH:MM:SS:FF; Border Frame dashes, dots and Draw on; Find Edges line width and colours; Emboss Height. **Stylize** (13): Halftone colour dots and CMYK; CRT curvature and Bloom; VHS Snow; Scanlines direction and colour; Pixel Sort by hue and on the diagonals; Dither Floyd–Steinberg and Atkinson; HSL Bands lightness range. **Blurs, fills and 3D** (14): Tilt Shift Sharp band and Radial; Lens Blur Anamorphic; Directional Blur Behind / Ahead; Backfill Mirrored edges and Solid colour; Trail Copy size and Time offset; Tile Grid Scroll and Gap; Scatter Drift and Spin; Perspective and Auto-spin on all fifteen 3D solids; Card Flip angle and Back. **Grading** (15): the Filter's Tonal range, Protect skin, Warmth / Fade / Grain / Vignette / Sharpen and Over-drive, and a filter you saved keeps them — it now lands at the Strength you saved it with (the Filters bar's Strength scales it); Levels holds Red, Green, Blue and the master at once; Match Grade Hold at time and Smoothing; Gaussian Blur Direction, Repeat edges and the Orton blend. A Gradient Overlay saved without its Amount draws again. Every default draws and plays today's picture and sound, old projects open unchanged, 131 new tests and none dropped. Reviewed by measurement, fixed with catching tests: a blinking caret moved centred text, an unset Lightning Core showed the wrong colour, Cell average and Erode took 4–8 MB a frame, Tempo now says Off instead of resting at 1–39 BPM, and the Limiter's Output can only turn it down. Collab SCHEMA_REV 10 (your phone and computer both need this version before you next share live)

(Drop "A Gradient Overlay saved without its Amount draws again." if commit 2 ships with fb2 first.)
