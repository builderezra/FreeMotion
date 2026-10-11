# LAB2: cloud pre-flight of hunt/land-b3 45a97e1 (ChatGPT B2 + B3, 40 commits on land-b1 8017a0a)

**Status, 11 Oct (the new cloud helper): code review DONE; the full passes at 1280 and 380 are queued behind the v17.39 passes and get their own section here.**

Note: hunt/land-b1 has moved since land-b3 was built (8017a0a -> c3205c8: #1131 glow burst, the speed-test re-run, the Windows AAC pass), and neither contains main v17.38. land-b3 will need re-chaining onto the current Full batch; the review below is of the 40 commits themselves.

**Two claims re-checked by hand before publishing:** tests.js at ba345b0 does NOT parse (`node --check`), and parses at 511aaad; a73ab63 lands `coloursafe` with `def: 100` (not the land list's 0) and leaves js/collab-core.js untouched (`C.SCHEMA_REV = 8`).

---

# Review: hunt/land-b3 (45a97e1), 40 commits on 8017a0a

**Verdict: land after fixes. Of the 40 commits, 25 can land as they are, 15 need a fix first, and none should be dropped.** Nothing blocks the batch as a whole. There are three must-fix items before shipping:
- **Unsharp Mask's default** (a73ab63). As landed, every new Unsharp Mask changes, and so do the Cold Steel and Overdrive filters. The collab schema bump is also missing.
- **RGB Split's 1-plate-pixel floor** (20fbf7e) is still in.
- **The tests.js syntax error at ba345b0.** It is fixed in the next commit, so the two must be squashed.

The rest of the fixes are small:
- **F1**, a one-token epsilon at 10 sites that turn the integrated count into a whole frame number.
- Three tests to make real: the Unsharp memory test, the Roughen test, and the RGB Split assertions.

How this was checked: by reading code only, with no suite and no browser. Small pure kernels were run in node from `scratchpad/js/` (they are copies of the production lines) to check numeric claims:
- the floating-point behaviour of `FM.integrateProp`;
- Unsharp Mask before and after de56f17: the golden sums, plus a 200-case fuzz for equivalence;
- Roughen Edges, old dispatch against new;
- tests.js parses at HEAD and at 511aaad, and fails to parse at ba345b0;
- compositor.js parses at HEAD (`node --check`).

The three glow commits and 746d53a8 / 0f8ec39b / dd2220fe / ceb86cd6 were compared with ChatGPT's original commits on GitHub. The `chatgpt/*` branches are **not** fetched into this repo. Only `origin/hunt/*`, `helper/*` and `main` are present locally.

## Per-commit verdicts

LAF means land after the fix. F1 is the shared fix described under Cross-commit findings.

| # | sha | subject | verdict | why | fix if any |
|---|---|---|---|---|---|
| 1 | 36f3833 | B2 90c78228 Chunk Noise | LAF (F1) | Correct. Unkeyed renders are byte-identical, and the clamp [0,30] matches the registry. The test catches the bug (the ramp gives 32 frames before the fix and 16 after). The floor drops one frame on exact-integer boundaries, see F1. | F1 at js/compositor.js:7017 (`bnFrame`) |
| 2 | c923cbc | B2 c5849478 Electric Edges | LAF (F1) | Correct. The clamp [0,10] is the same as the static path's. The test catches the bug. Same floor problem. | F1 at :8031 (`eeFrame`) |
| 3 | 0cd82d4 | B2 91f77658 Orbit | land | `∫ speed` over [t−tl, t], unclamped, which matches the static path and the registry's −4..4. I traced the test by hand: before the fix, Speed 0 at t=5 gives dx=+40, not −40. It has never run in a browser, so prove.sh is its first run. | — |
| 4 | c500f3d | B2 28c79891 Orbit facing | land | Only applies at exactly `spd===0` on a keyed track. It looks back through keyframe intervals and loop passes, and the pingpong mirror is correct. Traced: the reverse stop holds dir −1 at t=5 and t=6, and before the fix dir flips to +1. An unkeyed 0 keeps the old facing. Never run in a browser. | — |
| 5 | f260f84 | B2 96750bfb Fractal Ridges | land | `fr_travel` keeps the static `rate*t` arithmetic in the same order (byte-identical) and integrates Speed, Drift X and Drift Y when keyed. The test is meaningful. Never run in a browser. `frScene`/`frMad` are top-level helpers at tests.js:23470. | — |
| 6 | eaf61db | B2 1a780ccb Spin | land | Correct, and the test catches the bug (90→0 gives 45°). Never run in a browser. | — |
| 7 | d4559cc | B2 84799d50 VHS band | land | Correct. **Behaviour change:** a keyed Band speed that reaches 0 now freezes the band on screen. Before, it disappeared, because 0 meant off. That is intended (the test asserts it), but the POLISH-LOG line should say so. A static 0 still hides the band. | note in POLISH-LOG |
| 8 | e86a18e | B2 304f6370 Glow Scan | land | The clock is integrated with a clamp of [0,8]. The test catches the bug. The travel branch is handled in #28. | — |
| 9 | d18a9ee | B2 53756221 Breathe | land | The clamp [0.1,8] is the same as static. The test catches the bug (the 1→2 Hz ramp gives alpha ≈76, against 255 before). | — |
| 10 | 548ac60 | B2 e9887e83 Noise | LAF (F1) | Correct, and the test catches the bug. **F1 is visible here.** With Speed = fps (the default 24 Hz in a 24 fps project, or 30/30), a keyed constant span repeats the grain frame on about 11% of frames (measured: 165 of 1441 at 24/24). | F1 at :5819; F1 test below |
| 11 | cbd66cc | B2 a8003f1d Glitch Re-roll | LAF (F1) | Correct in both directions (dir 1 recurses with the same `p.speed`). The test catches the bug. | F1 at :6436 (`frame = Math.floor(roll)`, keyed branch) |
| 12 | bb340cf | B2 10040332 Dissolve | LAF (F1) | Correct, and the test catches the bug. | F1 at :7783 (`dsFr`) |
| 13 | 8c2f22e | B2 c4f51b7f Clouds | land | Drift is integrated in project px, the same units as `cl_ox`. The hold-keyframe test catches the bug. | — |
| 14 | 67ef07f | B2 e0ff704d Iridescence | land | Correct, and the test catches the bug. | — |
| 15 | 22ec0e8 | B2 dafb7efa Lightning | LAF (F1) | Correct. The keyed integrand is not rounded while the static `flick` is; that is harmless at the integer keyframe values the slider produces. The test catches the bug. | F1 at :9051 |
| 16 | c04a026 | B2 d0aa007a Scramble Text | LAF (F1) | Correct, with the clamp [0,30] matching the registry. The test catches the bug. | F1 at :2637 |
| 17 | 971db8a | B2 d0f948f9 Pulse | land | Correct, and the test catches the bug (a 15 px jump before the fix). | — |
| 18 | 4941acf | B2 eec3a0d6 Swing | land | Both the undamped and the damped branches use the integrated phase. The test covers damping. | — |
| 19 | e67afe9 | B2 5673c230 Flicker | LAF (F1) | Correct, with the clamp [1,30] matching static. The test catches the bug. F1 matters here because cadence is the whole effect: a strobe step lands a frame late. | F1 at :7650 (`fl_step`) |
| 20 | 2bb44c9 | B2 2529c1d7 Wiggle | land | Correct, and the test catches the bug. | — |
| 21 | f84733c | B2 ceb86cd6 Shake | land | Matches the original exactly once ab95ff4 is applied. I checked whether its test depends on ab95ff4 (the scene fps): it does not. With jitter 1 the noise only steps per half-cycle, so u(1.9)=3.705 and u(2−1/fps)≈3.90 fall on the same step at any fps ≥ 6. So the test is green at its own commit. | — |
| 22 | ac32702 | B2 fea15508 Frame Stutter | LAF (F1) | Correct, with the clamp [1,30] matching static. The test catches the bug. **F1 is visible here.** On a keyed constant span, about 8–15% of hold boundaries are a frame late (measured: 13 of 160 at 8 Hz / 24 fps, 46 of 300 at 15 Hz / 30 fps). In Strobe mode that frame goes dark. B8 depends on this commit. | F1 on the keyed `phase` at :13313 (add 1e-9 in the keyed branch only) |
| 23 | 34ee8d1 | B2 488ef6db Particles | land | Births are the inverse of the accumulated rate, with a bracketed Newton solve and a bisection fallback. Indexes are monotone, the state is carried across the thinned loop, and `hi`/`lo` already use ±1e-9, so F1 is not needed. The static path is untouched. The test catches the bug (21 and 31 particles, against 41 before). **Performance to watch:** about 2–3 `integrateProp` calls per live particle, up to 2000 particles, with eased (bezier) keyframes. | optional: rejoin the comment split mid-sentence ("So the same scene time always / yields…") |
| 24 | d3aa354 | B2 329c5401 Voronoi | land | The clamp [0,2] matches static. The test catches the bug. | — |
| 25 | 3187004 | B2 702a8952 Flash Random | LAF (F1) | Correct. It integrates from comp 0, like the static clock (the Rhythm branch uses clip time, which is also unchanged). F1 only affects hard flashes; the soft crossfade is continuous across the off-by-one. | F1 at :7757 (keyed `fdClock` + 1e-9) |
| 26 | c84fde1 | B2 0a1fa664 Scanlines | land | `plain` stays byte-identical when unkeyed. The test catches the bug. | optional (land list): treat a non-finite `off` as 0 |
| 27 | 53c5da7 | B2 busters | land | compositor `?v=` 213→214. 213 is the live value. | — |
| 28 | ba345b0 | B2 Glow Scan travel integrates keyed Speed | LAF | The required fix is correct. Once uses the wait in seconds, then the integrated sweeps. A Loop with a wait uses sweep units, with the wait converted at the clip's starting speed, which equals the unkeyed timing at a constant speed. The test catches the bug (before the fix the band vanishes at Speed 0). **But the test title's straight apostrophe makes the whole of tests.js fail to parse at this commit** (confirmed with node). **Follow-up, not blocking:** if keyed Speed starts at 0, `gsWu = 0`, so the user's Wait is ignored for the whole clip. | squash 511aaad into it. Follow-up: when `gsRate(gs0)` is 0, convert the wait using the first keyframe value that is above 0. |
| 29 | 511aaad | B2 apostrophe fix | land (squash into 28) | Fixes #28's syntax error. | — |
| 30 | 1f6f7ec | B3 f3455117 Smooth Bevel | land | Naming `ps` takes the kernel out of `pxToPlate`, which only scales kernels with fn.length < 6, so there is no double scaling. Depth is clamped in project px, then becomes a fractional plate radius. At ps=1, `sb_frac=0`, so exports are byte-identical. The fractional box weights sum to `sb_win` and the edges are clamped consistently. The test catches the bug (before the fix, Depth 1 and 4 collapse to the same bevel at ps 0.28). | — |
| 31 | ab95ff4 | B3 5bb0638f Shake smear uses the rendered scene's fps | land | `drawCanvasEffect` passes `scene` (compositor.js:11954). The test catches the bug (it is sensitive to the step boundary at fps 24 against 60). Combined with #21, it equals ChatGPT's original. | — |
| 32 | 4e2df17 | B3 d4461144 Backdrop Clone timecode | land | `scene` is in scope in `drawCopyBg`. The test catches the bug: `_bgSnap` sends the text layer through `drawCopyBg` only, and the other `textLines` callers (`fillBoxOf` uses `FM.scene`; `layerSize` uses the raw text) never produce the rendered-fps string. It has never run in a browser. `FM.fillBoxOf` (:15326) still reads `FM.scene`; the land list suggests logging that as a follow-up. | — |
| 33 | a73ab63 | B3 ca35afb3 Unsharp Protect colour | **LAF (required)** | Landed exactly as ChatGPT wrote it. **The land list's required fix was not applied:** `def: 100`, and the test asserts `fresh.params.coloursafe !== 100 → throw`. `filters.js saneChild` builds through `makeInstance`, so the Cold Steel and Overdrive filters (filters.js:198/229) change, and the `482 polish 1 … 56 library filters` pin test (tests.js:115052, HEAD_FILTERS) goes red. A new parameter also changes `C.schemaFingerprint` (collab-core.js:229 hashes every param's key, default, legacy, min and max), so `921 S1 the schema fingerprint gate` goes red. collab-core.js is not touched. The kernel maths is right: luma-only at 100, the old path at 0. The comment "queue 904: the Threshold Unsharp Mask is named for…" was overwritten. | 1. Change the registry entry to `{ key: 'coloursafe', …, def: 0, legacy: 0, unit: '%' }` and restore the queue-904 comment. 2. Rewrite the test: `fresh.params.coloursafe === 0`; a fresh instance renders byte-identical to `{amount:2,radius:1}`; and 100 still gives a neutral `safe[at]` R=G=B. 3. Set `C.SCHEMA_REV = 9`, paste the `C.SCHEMA_FP` that `921 S1` prints, and bump `collab-core.js?v=` from 25 to 26. 4. Check the new row at 380px. |
| 34 | de56f17 | B3 dd2220fe Unsharp memory | LAF | The fused vertical-blur and composite pass is correct: the accumulator advances before the `continue`, and `umBlurPix` is Float32, just as `umBlur` was. In node: the golden sums 29982 and 29997 are right both before and after the change, so the land list's "recompute the sums" is not needed. 0 of 200 random cases differ. **The test passes before the change too**, so prove.sh will refuse it. | Add an allocation assertion. Swap `window.Float32Array` for a counting wrapper (`n >= W*H*3 → big++`; `return new Real(n)`), run the kernel once, put it back in `finally`, and assert `big === 1` (it is 2 before the change). Or write `UNPROVABLE: output byte-identical by design` in the POLISH-LOG line. |
| 35 | 0666e62 | B3 three glow commits, applied by hand | land | Identical to a5d76ea7 + b1ddcfd9 + 5dcfed17, with the parent commit's paint-into-transparent hunk correctly left out: the legacy `if(alpha===0)continue` is kept and glow6 is untouched. Every element the kernels read below `n` is written first in the same call, Dark Glow `fill(0,0,n)`s its sparse plane, and nothing calls the kernels from inside each other, so sharing the planes is safe. The tests detect the old code only because the `FM._glowScratchInfo` seam is missing there. The release test calls `release()` by hand, so the 5 s timer itself is never exercised. Holding memory is not a problem: after an export, an export-sized pair (about 16 MB at 1080×1920) is kept only while glow keeps rendering within 5 s windows. | optional (land list): also reallocate when `_glowScratch[0].length > 4*n` |
| 36 | f84ed02 | B3 1e36d1d9 Linear Streaks | land | `lsLen<=0` sits in the v17.23 line, as the land list asked. The test catches the bug (at ps 0.25, 3 px becomes 0.75, which returned before). Side effect: an export with keyed Length between 0 and 1 now draws a sub-pixel streak instead of nothing. That is continuous and fine. | — |
| 37 | 2c6095f | B3 746d53a8 Roughen Edges | LAF | The kernel is identical to the original and correct. It clamps in project px, then multiplies by ps; ps=1 is byte-identical (checked in node). **The tautological test was kept**, against the land list. After the fix, direct and dispatched calls are identical by construction (`pxToPlate` skips 6-argument kernels), so a kernel that ignored `ps` would still pass. | Replace the test. Through `FM._applyPixelFx` at ps 0.25, `{amount:8, scale:2}` must differ from `{amount:8, scale:8}`: identical before the fix, different after (both checked in node). Add a ps=1 control: on the `(x+y)%3` 32×32 fixture with `{amount:8, scale:8}`, the alpha sum is 90015, the same before and after. |
| 38 | 20fbf7e | B3 0f8ec39b RGB Split | **LAF (required)** | Identical to the original. **The required fix was not applied.** The `Math.max(1, …)` floor is still in both paths, which makes the phone preview about 3.6× stronger than the export at ps 0.28. It also changes exports with an Amount between 0 and 0.5. The small-Amount assertions are still in the test. The green-only shift and the alpha from `src[gi+3]` are correct, but the alpha change makes saved Green-shift fringes extend past the layer edge. | 1. Per-layer path (:14662): `const dd = Math.round(Math.max(0, d) * ps);` 2. Adjustment path (:18061): `const dd = Math.round(Math.max(0, amount) * S);`. Keep the hoisted `gsh` and the `(dd > 0 \|\| gsh !== 0)` condition. 3. Delete the `smallAmount` block and the `red`/`redDiff` half of the test; keep both green-only assertions. 4. Say in POLISH-LOG that saved Green-shift fringes now show past the layer edge. |
| 39 | 127cfd9 | B3 ce7768ac hard wipes | land | The early returns are byte-identical for soft wipes, which already showed nothing at 0 and everything at 1, and for every progress above 0. Only the hard cut at exactly Progress 0 changes: the `proj===0` column and the start ray are now hidden, which is the fix. The test catches the bug. | — |
| 40 | 45a97e1 | land-b3 busters | land | compositor 214→215. The collab-core buster will be needed once #33's schema bump is added. | add `collab-core.js?v=26` with the #33 fix |

## Cross-commit findings

### F1: rounding the integrated count drops a frame on exact-integer boundaries
Commits #1, #2, #10, #11, #12, #15, #16, #19, #22 and #25 are affected. Two older #913 sites have the same pattern: Film Grain at :5888 and Turbulent Displace boil at :13099.

`FM.integrateProp` sums twelve Gauss-Legendre points per piece. For a constant (or linear) rate it returns `n − ε` about as often as `n + ε` when the true count is the whole number `n`. Wrapping that in `Math.floor` then gives `n − 1`.

Measured in node with a faithful copy of scene.js:146:
- Speed 24 keyed at 0.5 s, in a 24 fps project:
  - at frame 19 the integral is 18.999999999999996, so the floor is 18, where the static path gives 19;
  - 165 of 1441 frames are wrong over 60 s, against 0 for the static path.
- Rate = fps (30/30): 292 of 1801 frames repeat the previous index, so the effect visibly freezes.
- Frame Stutter: 8–15% of hold boundaries are late, and in Strobe mode those frames go dark.

This only happens on keyed tracks. It is a regression against the old keyed behaviour in the constant stretches: before the first keyframe, after the last one, in flat segments and in holds. Before B2, those stretches matched the static path exactly.

**Fix:** add a helper in scene.js:
```js
FM.integrateCount = function (props, t0, t1, f) { return Math.floor(FM.integrateProp(props, t0, t1, f) + 1e-9); };
```
- Use it at the eight `Math.floor(FM.integrateProp(…))` sites: :2637, :5819, :5888, :7017, :7650, :7783, :8031, :9051 and :13099.
- In the keyed branches only, add `+ 1e-9`:
  - Glitch's `roll` (:6436);
  - Flash Random's `fdClock` (:7757);
  - Frame Stutter's `phase` (:13313).
- Particles already does this.

Unkeyed paths stay byte-identical. One trailing commit is enough; the ten commits do not need rewriting.

**Catching test**, verified in node: on the Noise kernel at `t = 19/24`, `{kf:[{t:0.5,v:24}]}` must render the same as numeric Speed 24. Before the fix the integral is 18.999999999999996 (frame 18).

### Ordering, and B2 against B3
- ba345b0 does not parse (tests.js: `missing ) after argument list`), so squash 511aaad into it.
- B2 on its own, through 511aaad, is self-contained. I checked whether the Shake test depends on ab95ff4, and it does not.
- B3 sits on B2's lines: the Shake fps line and Unsharp before Unsharp memory. Neither has a conflict or a duplicate edit.
- The Unsharp memory commit rewrites the kernel line that the Protect colour commit just added, and keeps its `umSafe` logic.
- The Glow Scan travel commit (#28) relies on #8's integrated clock. They are consistent.

### Required by the land list but not in the branch
- The `ca35afb3` default, test and schema bump (#33).
- The `dd2220fe` catching assertion, or an UNPROVABLE line (#34).
- The `746d53a8` test replacement (#37).
- The `0f8ec39b` floor and assertions (#38).

The rest of the land list is done:
- `304f6370`'s travel fix;
- the hand-applied glow commits without the paint-into-transparent change;
- `lsLen<=0`.

### Things to do at ship time
- Every new test is named `690 …` with `{ item: 'TBD' }`, so ship.sh will refuse them. Retag them with the batch's REQUESTS entry, and claim `queue n` in POLISH-LOG, not #690.
- The tests were inserted before `async function run()` at about tests.js:61661, not at the end of the file. That is harmless, because every helper they use (`box482b`, `at482b`, `_986fx`, `cfxSource`, `frScene`, `scene`, `offscreen`) is defined in the same IIFE before `run()` executes.

### Notes for the POLISH-LOG
- B2: projects with a keyed Speed or Rate now animate differently. That is the fix, and the land list requires the note.
- VHS: a band keyed down to 0 now freezes on screen instead of disappearing.
- After the #38 fix: saved Green-shift fringes now show past the layer edge.

### Lower-priority notes
- `integrateProp` stops cutting at keyframes after 400 loop passes. A looped keyed Speed with a short span over a long clip therefore loses accuracy, and its phase can jump from frame to frame once past that point. This limit already existed for the #913 effects; B2 makes it reachable from 26 more.
- Every integrand clamp matches its effect's registry range: blocknoise 0–30, noise 0–60, dissolve 0–30, glitch 0–30, VHS 0–3, glowscan 0–8, voronoi 0–2, and so on. No unkeyed path changed bytes.
- Smooth Bevel, Roughen and RGB Split change only the preview (ps < 1). After the #38 fix, RGB Split's exports are unchanged too.
- No exporter, fx-registry.js or collab-core.js change exists in the chain. That absence is exactly what is wrong for #33.



## Full passes (cloud, 11 Oct): land-b3 45a97e1 against land-b1 c3205c8, at 1280 and 380

Note the base: land-b3 sits on land-b1 8017a0a; land-b1 has since moved to c3205c8 (#1131 glow burst, the speed-test re-run, the Windows AAC pass). Each red below was also run alone on c3205c8, so a red caused by the base's newer commits would show there.

| run | result |
|---|---|
| land-b3 @1280 | {'PASS': 2245, 'FAIL': 69, 'NOTRUN': 93, 'HANG': 17} |
| land-b3 @380 | {'PASS': 2248, 'FAIL': 68, 'NOTRUN': 93, 'HANG': 15} |
| land-b1 @1280 | {'PASS': 2222, 'FAIL': 66, 'NOTRUN': 93, 'HANG': 4} |
| land-b1 @380 | {'PASS': 2224, 'FAIL': 63, 'NOTRUN': 94, 'HANG': 4} |

**Verdict: 8 reds belong to land-b3, from two commits; every other red is environment.** Each of the 8 is red alone AND paired on land-b3 and green alone on land-b1:

From **a73ab63 (Unsharp Mask Protect colour, `def: 100`)**, the review's must-fix 1, now proven by the suite (7):
- `921 S1 the schema fingerprint gate`: "The sync schema changed — bump FM.collab.SCHEMA_REV and set SCHEMA_FP to 7030805312103207 (it is 8673617696742561)".
- `482 polish 1 …the 56 library filters and the seven effects render byte for byte as on v17.14`, `482 5.3 Teal & Orange, 5.4 Tint and 5.5 Duotone …`, `482 6.0 Vignette and the three Glows …`, `482 6.0 Lens Flare, Linear and Spin Streaks and Glow Scan …`: "2 pictures differ … a new control changed a look he already has: Cold Steel 1c0c3370/939023f0 -> 9cd3a048/b690cc17; Overdrive 6cf2492b/56809eb8 -> 41f126ed/698e8bd9".
- `482 6.3 Drop Shadow …`: "the 56 library filters render 8becbc8a, not bc79cc6b as on v17.21".
- `482: every effect does something visible at its own defaults`: "Unsharp Mask (3113px, p95 3)": Protect colour at 100 by default flattens the sharpening a new Unsharp Mask shows in the browser.
→ The review's fix (`def: 0, legacy: 0`, schema bump REV 9 with the new SCHEMA_FP, collab-core.js ?v=) clears all seven.

From **127cfd9 / ce7768ac (Fix hard wipe zero-progress visibility)** (1), NOT named by the code review:
- `no effect erases the layer at a single parameter extreme (queue 264)`: "radialwipe:progress=min". At Progress 0 the Radial Wipe now hides the whole layer, which this guard (queue 264) forbids. **Needs a decision:** if ChatGPT's commit meant "0 progress = fully wiped" for a hard wipe, the guard needs a reasoned exception; if not, the commit is wrong at 0. The review called the wipes correct, so this is the suite's finding, not the review's.

Environment / harness, not land-b3:
- 17 / 15 HANGs: two runs of consecutive slices (#1340-1351 and #1992-1996) whose browser never booted after a killed slice. Every named one PASSES alone and paired on land-b3 (the Audio React sliders, both Squish tests, the preset save buttons, both filter-photo tests, 917.16, the shake cars); the two 690 ones are NOT RUN HERE (real finger). The runner now also kills a hung slice's whole Chromium process tree.
- The ~65 other reds are red on land-b1 too (codecs, real finger, CPU throttle, timing).

`?only=690 T16` and `?only=482` at both widths on land-b3 (and land-b1 for comparison): running; their own section follows.

### `?only=482` and `?only=690 T16` at both widths (land-b3 and land-b1)

- `?only=482`: **land-b3 107/115 at 1280 and at 380; land-b1 113/115 at both.** land-b3's six extra reds are exactly the a73ab63 ones above (`482: every effect does something visible…`, `482 polish 1`, `482 5.3`, `482 6.0 Vignette…`, `482 6.3 Drop Shadow`, `482 6.0 Lens Flare…`). The two reds both trees share are environment here: `482 2.6 Motion Blur (Object) - Shutter phase…` and `482 3.0 Echo and Reverb - Tone, Low cut…` (the Motion Blur and Echo picture checks the earlier helper reports list as red on main too).
- `?only=690 T16`: **matches no test on either tree** (Regression 0/0). No test title contains "690 T16"; if a different substring was meant, say which and it will be run.

DONE: LAB2 land-b3 — code review (25 land, 15 land-after-fix, 0 drop) + full passes 1280/380 + ?only=482 both widths: 8 reds belong to land-b3 (7 from a73ab63 Unsharp Protect colour def 100 incl. the schema gate, 1 from the hard-wipe commit: Radial Wipe at Progress 0 erases the layer, needs a decision); hangs and the other reds are environment. A fix branch hunt/land-b3-fixes is being built.

### ⚠️ SCHEMA_REV 9 is claimed by several unlanded branches with different fingerprints (found 11 Oct by the fix branch's check)

main and live are on `C.SCHEMA_REV = 8` / `SCHEMA_FP 8673617696742561`. Three groups of unlanded branches each set REV 9, with three different fingerprints:
- land-b3's fix (Unsharp Protect colour): FP 1932349802248846;
- hunt/e1-land, new-effects-1, audit-integrated-3: FP 5698315735221935;
- simple-tip, simple-transitions, p27-dry, p28-dry: FP 6484757361590586.

**Whichever lands second must take REV 10 (and the third REV 11), and re-paste the FP the 921 S1 gate prints after the merge.** The gate cannot catch a reused REV by itself (the FP hashes the REV, so a new FP pasted at the same REV passes), and two released builds sharing REV 9 with different sanitisers could be let into the same live session.

### Fix branch status
`hunt/land-b3-fixes` (5 commits on 45a97e1, not yet pushed) clears the seven a73ab63 reds (Unsharp Protect colour def 0 + REV 9 / FP 1932349802248846), drops RGB Split's floor, adds FM.integrateCount for F1, and makes the Unsharp memory and Roughen tests real, each proven red-first with tools/mutate.sh --only. Its check found three more keyed-rate step sites (Shake hard jitter, Pulse Square, Scanlines Roll) and wrong 'queue 482' wording; a second round is fixing those before the branch is pushed. The Radial Wipe red (queue 264) is left for a decision.
