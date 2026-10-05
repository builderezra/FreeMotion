# ChatGPT pile: the land list

Source: ChatGPT's branch `codex/690-reviewed-local`, pinned tip `6ed01d4df0235d8b9f921a783dbe7deb74ff45ae`: 261 commits on top of live `main` `f7716576` (v17.22). Its working clone is `/private/tmp/freemotion-reviewed-local-20261005`.
Built on 5 Oct 2026 from the per-commit verdicts (39 themes, T01–T39; the themes are listed in [INVENTORY.md](INVENTORY.md)).
**Nothing in this review was run in a browser.** `.ship-in-progress` was present for the whole review, so every verdict comes from reading the code. A few kernels were extracted and run under JavaScriptCore (T25, T29, T31, T32). This list is for the builder, who does the landing (#1067: ChatGPT fixes, the builder lands).

---

## 1. For Ezra, in plain words

**What ChatGPT built.** While Claude worked on the app, ChatGPT spent several days working in its own copy. It produced 261 changes. None of them is in the app on your phone yet. Roughly:
- **About 25 real bug fixes.** Broken project files no longer leave junk empty projects. Saving a project or template now warns when it leaves footage or fonts out. Effects with a keyframed Speed slider no longer jump or rewind. A few effects looked different in the preview and the export, and now match. A caption-editor memory leak is fixed. The offline cache is more reliable.
- **About 55 new controls on effects you already have**, such as Border Frame styles, Wipe directions, Lightning paths, blur and warp edge options.
- **New things:** 13 visual effects, 10 colour-grading effects, 8 audio effects, 4 sound-effect packs, 2 audio clean-up tools, a "Filter layer" button, 13 bundled fonts plus 12 fonts it drew itself, about 23 redrawn shapes, and background (worker) video export.
- **About 70 changes for one narrow bug (C31).** After you jump the playhead, Frame Stutter and Time Warp Scan showed the wrong frame. ChatGPT fixed this one combination at a time.

**How much is good.** 161 of the 261 can go in: 72 as they are and 89 after a small fix. 41 wait for your answer. 59 get thrown away.

**What was wrong:**
- **It never ran the whole test suite**, only single tests. So it missed things a full run catches at once: every change that adds an effect setting also breaks the live-collaboration safety check. None of its tests is linked to a request number either, so the release tool would refuse every one of them.
- **Some changes alter how your existing projects look** without saying so. Examples: every diagonal Stripes layer, every rounded Border Frame, Unsharp Mask's default, and glows spilling onto empty areas.
- **Several new effects have real bugs.** For example, Lens Magnifier shows a double image on text, a wipe "pops" at its start and end, and Noise Gate cuts off word endings.
- **It rebuilt about 10 things Claude had already built** in the release that is shipping now (glows, Glow Scan, Lens Flare, Vignette). Those copies are thrown away; Claude's versions are better.
- **It made things you never asked for**: its own fonts and redrawn shapes, including your heart, which still waits on your #929 pick.
- **None of the 261 fixes the no-sound export bug (#604/#215).** ChatGPT has been pointed at that bug since 5 Oct, and its fix will arrive separately. When it does, it lands before everything else on this list.

**What happens without you.** The builder lands the batches in section 2 between Simple-mode releases, oldest-risk first. Everything that needs your eye stays parked as a question in section 3. Visual batches ship with a before/after picture you can veto in one word.

---

## 2. Land batches, in order

### How to bring commits in (applies to every batch)

**First, once:** copy the pile into the builder's own repo. `/private/tmp` can be wiped, and the builder must never write in ChatGPT's clone.
```bash
git fetch /private/tmp/freemotion-reviewed-local-20261005 codex/690-reviewed-local:refs/pile/codex-690
test "$(git rev-parse refs/pile/codex-690)" = 6ed01d4df0235d8b9f921a783dbe7deb74ff45ae && echo pinned
```
**Per commit, in the batch's order, applied uncommitted so prove.sh runs.** Leave out ChatGPT's reports, index.html and tests.js, which are handled by hand:
```bash
git show --binary --format= <sha> -- . ':(exclude)outside' ':(exclude)index.html' ':(exclude)tests/tests.js' | git apply -3 --index
git show --format= <sha> -- tests/tests.js      # read the added test; paste it as ONE block at the end of tests.js
```
- **index.html:** bump each touched file's `?v=` **once per batch**, from live's current value. Never copy the pile's numbers (compositor 2xx–3xx, inspector 41x, styles 74x and so on); they count along ChatGPT's private history. Add script tags by hand only for new files (noise-reduction.js, auto-duck.js, studio-fonts.js, render-canvas.js).
- **tests.js:** rebuild by block, **never union-merge**. Many pile tests sit after pile-only tests, so their context will not match.
- **Retag every test.** All of them carry `{ item: 'TBD' }`, and most are named `690 …`. Log **one REQUESTS.md entry per batch**, tagged `(hunt LOW/MEDIUM #n)` because these are not his words. Tag the batch's tests with that number and claim `queue n` in the POLISH-LOG line. Do not claim `queue 690`: #690 is a standing brief and never closes. Use a real older number only where the batch truly closes it (B1 closes #1051). If ship.sh's oldest-first gate refuses, follow #1067's JUMPED convention rather than forcing it.
- **Collab fingerprint.** Any batch that adds an effect or audio parameter must bump `C.SCHEMA_REV` by one (live is 7 after v17.23) and re-paste `C.SCHEMA_FP` from what `921 S1 the schema fingerprint gate` prints. The pile never touched `js/collab-core.js`. Simple mode step 1.2 also bumps it; whoever lands second re-measures. BUILD-PLAN.md:198/202 anchor on the old `= 6` strings and are already stale.
- **Never beside ship.sh, and never beside a mutation.** Check that `.ship-in-progress` and `.mutation-in-progress` are both absent.
- **Prerequisite for every batch that touches compositor.js:** the builder's v17.23 (polish batch 6) is shipped. It edits the same files (compositor, fx-registry, fx-thumbs, inspector, collab-core).

---

### B1. Saving, importing, offline and small app fixes (14 commits). **Land this first**, after the current Simple-mode release
Files: storage.js, home.js, settings.js, app.js, captions.js, sw.js, audio-tools.js, history.js. **compositor.js and collab-core are not touched, and no schema bump is needed.** Land it before Simple-mode Phase 2, which rewrites `history.commit()` and splits `FM.replaceMedia`. That way Phase 2 carries these guards across rather than re-fitting them later.

| # | Commit | What | Before landing |
|---|---|---|---|
| 1 | `52843cc2` | Malformed width/height/fps no longer give a 16px canvas or throw | — |
| 2 | `9cd5923c` | A plain-value `project` is refused before a junk project is made | closes **#1051** with #3 |
| 3 | `a4de4183` | `layers:[null]` / `[42]` / `[[]]` refused before create | closes #1051. **Does not close #1040** |
| 4 | `e808c3c2` | A corrupt embedded clip now gets the "no footage" warning | run it once in a browser (it has only ever run in JSC) |
| 5 | `b48cb48f` | Very deeply nested files refused before create | — |
| 6 | `f1ac5fa8` | A corrupt embedded font no longer fails the whole import | **fix:** add a test case where `fetch` rejects (the path in the commit title is untested). **Does not close #1042** |
| 7 | `e987e4f3` | Template files name the media they leave out | — |
| 8 | `2e5e0cf0` | Project files name layers with no stored source | **fix:** `FM.storage.exportFile` must fall back to IndexedDB (`FM.media.get(id) \|\| idbGetMedia(db,id)`, as `exportProjectFile` does). Otherwise a clip that is still loading, or failed to decode, is reported as "no longer stored". Add a catching test |
| 9 | `70797f4c` | Custom fonts left out of shared files are named | **fix:** `buildBackup` must call `embedFonts(pack.layers, FM.storage._backupEmbedLimit)`, not `Infinity`, because each font is copied per project (an iPhone memory risk). Label home.js template fonts the way `omittedFontSummary` does. Scope the test to one project. **Keep #1038 open** |
| 10 | `1fdd128b` | The "missing footage/fonts" warning survives the "Project imported" toast | needs #7–9 first (it is built on them) |
| 11 | `5e8337da` | Replace media cancels cleanly if the project changes mid-pick | optional wording fix: "the clip changed while it was opening" also covers undo or delete mid-decode. Tell Phase 2 to keep the `stillCurrent()` guards across the `pickReplacement`/`swapInMedia` split |
| 12 | `b69c5795` | Remove Vocals instrumental follows Speed changes on its source | **fix (required):** (a) do not resync across a split (today the song goes **silent** after a cut); (b) remap the twin's keyframes only on a speed change or a move, never on a trim. Add tests for split, trim and move. Bump audio-tools `?v=` from live **7** |
| 13 | `5cf39d11` | The caption editor stops piling up document listeners on every redraw | — |
| 14 | `d662aa35` | The service worker waits for its offline-cache writes | **fix:** drop the index.html `register('sw.js?v=1')` hunk (the excluded-path command above already drops it) |

**Tests:** run the batch's own tests (`?only=690%20` on the pile names before retagging), then `?only=888`, `?only=915`, `?only=1051`, the SW tests `?only=306` and `?only=430`, and the karaoke tests (`?only=Remove%20Vocals`, `?only=karaoke`). Run at 900 and `--width 380` (the long warning toasts must fit on the phone). Then ship.sh does the full run.
**What Ezra sees:** almost nothing, which is the point. A broken project file says it is broken instead of leaving an empty project. Saving a project, template or backup that leaves footage or fonts out tells him so. Remove Vocals stays in sync after a Speed change.

### B2. Keyframed Speed / Rate stops jumping (26 commits, T16)
One fix applied to 26 effects: a keyframed rate is now integrated over time (`FM.integrateProp`, scene.js:146, the same fix as #913.4) instead of computed as rate(now) × time. Unkeyed effects stay byte-identical. **Prerequisite: B1 shipped, and v17.23 shipped** (Glow Scan).
In branch order:
`90c78228` Chunk Noise · `c5849478` Electric Edges (it has no `?v=` bump of its own) · `91f77658` Orbit · `28c79891` Orbit facing (with or after Orbit) · `96750bfb` Fractal Ridges · `1a780ccb` Spin · `84799d50` VHS · `304f6370` Glow Scan · `53756221` Breathe · `e9887e83` Noise · `a8003f1d` Glitch · `10040332` Dissolve · `c4f51b7f` Clouds · `e0ff704d` Iridescence · `dafb7efa` Lightning · `d0aa007a` Scramble · `d0f948f9` Pulse · `eec3a0d6` Swing · `5673c230` Flicker · `2529c1d7` Wiggle · `ceb86cd6` Shake · `fea15508` Frame Stutter · `488ef6db` Particles · `329c5401` Voronoi · `702a8952` Flash Random · `0a1fa664` Scanlines.
- **Fix `304f6370` first:** v17.23's new Travel/Once/Wait branch uses `gsTl*gsSpeed`, which brings rate × time back. Integrate it over `[t-gsTl, t]` and test a Once or Wait sweep with Speed keyed 1→0.
- `8efc6234` (Laser Beam) and `8516f675` (Radio Waves) are **not** here. They need B6's effects.
- Optional: `0a1fa664` guard `isFinite(off)`. Rejoin the comment `488ef6db` splits mid-sentence.
- Four tests have never run in a browser (Orbit, Orbit facing, Fractal Ridges, Spin), so prove.sh is their first real run.

**Tests:** `?only=690%20` (the T16 names), the 913 tests, `859: every pixel effect draws the same picture…`, and the `482` default sweeps. ship.sh then runs both widths.
**What Ezra sees:** an effect whose Speed he keyframes (slowing Orbit to a stop, ramping Noise) now glides and holds instead of jumping or snapping back to the start. **The POLISH-LOG line must say** that projects with keyframed speed now animate differently, because that is the fix.

### B3. Preview matches export, plus effect memory (12 commits)
Branch order: `f3455117` Smooth Bevel depth on small previews · `5bb0638f` Shake smear uses the rendered scene's fps · `d4461144` Backdrop Clone timecode footprint · `ca35afb3` Unsharp Mask "Protect colour" · `dd2220fe` Unsharp memory · `a5d76ea7` + `b1ddcfd9` + `5dcfed17` glow buffer reuse (land the three together) · `1e36d1d9` Linear Streaks short trails · `746d53a8` Roughen Edges scale · `0f8ec39b` RGB Split green shift at Amount 0 · `ce7768ac` hard Wipe/Radial Wipe fully hidden at Progress 0.
Fixes first:
- **`ca35afb3`:** set `def: 0, legacy: 0`. As committed it silently changes every new Unsharp Mask plus the Cold Steel and Overdrive filters, and turns the 56-filter pin tests red. Rewrite the test (absent = 0 = old bytes; 100 = neutral). Needs a schema bump. Check the new row at 380px.
- **`dd2220fe`:** recompute the test's golden sums; add an allocation-count assertion so it fails before the change (or write an UNPROVABLE line).
- **The three glow commits:** apply **by hand** onto v17.23's legacy allocation lines (two lines per kernel). Do **not** bring in the parent's "glow paints into transparent pixels" change. Optional: re-allocate when the cached plane is more than 4× the size needed.
- **`1e36d1d9`:** apply by hand. `lsLen<1` becomes `lsLen<=0` in v17.23's rewritten `linstreaks` line.
- **`746d53a8`:** the test is tautological. Replace it with one where Scale 2 and Scale 8 at ps 0.25 must differ, plus a ps=1 byte-identity control.
- **`0f8ec39b`:** remove the 1-plate-px floor (it makes his phone preview 3.6× stronger than the export) and drop the small-Amount assertions. Note in POLISH-LOG that saved Green-shift fringes now show past the layer edge.
- **`d4461144`:** it has never run in a browser. Optionally log the `FM.fillBoxOf` sibling (compositor ~17476) as a follow-up.

**Tests:** the batch's own tests, `859`, the 56-filter pins (`482 polish 1 …`, `482 5.3 …`, batch 6), `?only=Smooth%20Bevel`, `?only=692`, and `921 S1`.
**What Ezra sees:** a phone preview that matches the export more closely, an opt-in Protect colour slider on Unsharp Mask, and a clean first frame on hard wipes. A before/after of Protect colour goes with the release.

### B4. Polish A: Wipes, Halftone, Border Frame, Lightning, Roughen / Voronoi, Tilt Shift (11 commits)
These are opt-in controls the backlog already planned (C26–C45 rows). Saved projects stay byte-identical once the fixes are in. **Needs B3** (`746d53a8`). One schema bump for the batch.
Branch order:
- **`901ee496`** Halftone Smooth dots / Cell average. **Fix:** a zero-radius dot gets 50% ink, so white paper turns grey-speckled (measured min 128). Scale coverage to 0 as the radius goes to 0. Test that pure white stays at 255 at aa 1 and 2, at 0° and 45°.
- **`cee51dcb`** Border smooth corners. **Fix:** add `legacy: 0` and treat a missing value as Off in both kernels. As committed, every saved rounded border changes.
- **`545389fa`** Lightning path and draw (fold `b8ee3bf6` into it). **Fix:** Everywhere must screen-blend, so it matches Layer pixels on opaque pixels. Fork length must be independent of Segments. Widen the byte-identity check to the real defaults.
- **`e15da085`** Wipe layer fit, Radial directions and Blades. **Fix:** delete the `invert`/Reverse control. It duplicates Angle+180 and Counterclockwise exactly; its own test proves that.
- **`0f98b861`** Border Solid/Dashed/Dotted and Draw on. **Fix:** a square frame is missing a `bw/2` square at its start corner until 100%, then it pops in. Start the path at `bx0`. Add a progress-99 test.
- **`427d5af4`** Roughen Seed and Evolve. **Fix:** add a keyed-Evolve hold test.
- **`e81e0c0e`** Voronoi Seed. Optional: put Seed last instead of second.
- **`dd5d4729`** Roughen Complexity and Erode. Verified against a brute-force reference under JSC.
- **`62c98f5e`** Roughen bounds speed-up. **Fix:** add a catching test (a disc with Amount 14 must leave alpha outside its original box).
- **`1c84e763`** Tilt Shift sharp band and Smoothness. **Fix:** relabel "Blur quality" to "Smoothness" (to match v17.23). Add quality>1 cases to the `692` bound test, and add an angled-band assertion.

**Tests:** the batch's own tests, `921 S1`, `482` sweeps, `692`, `904`, `859`, all at 900 and 380 (the new rows must fit the panel).
**What Ezra sees:** new optional sliders on these six effects; existing projects look the same. Send one before/after sheet. Mark backlog 10.x, 11.5, 11.6, 11.7, 12.3, 12.5, 13.1 (dots part) and 14.1 (part) as done, so the builder's own batches do not redo them.

### B5. Polish B: Shadows, Blurs, Warps, Card Flip (9 commits)
Branch order: `0876018f` · `7a2ef677` · `1db725a6` · `0df427eb` · `061581f0` · `a0732c3d` · `b2ce43ae` · `b986fcc4` · `cfa3859e`. One schema bump.
- **`0876018f`** Radial Shadow Quality and Opacity. Set the Opacity default to today's 78%, so a new shadow does not get darker unseen.
- **`7a2ef677`** Long Shadow reach and angled edges. **Fix (required):** the "either neighbour" hit test paints a halo on the lit side, plus a stray full-strength 1px band at 90/135/180/225/270/315° (measured 10–25 wrong pixels per angle). Use the crossed pixel only, snap the slope within 1e-9, and add lit-side and cardinal-parity tests.
- **`1db725a6`** Directional Blur Repeat and one-sided. Pool the Repeat canvas, and keep the Both expression literally unchanged.
- **`0df427eb` / `061581f0` / `a0732c3d`** Gaussian Repeat, one-axis, Mix and Blend. Land the four as one unit. **Fixes:**
  - put `motionblur: 1` back in `CFX_NO_BBOX`;
  - make plate-mode blur work on **adjustment layers**: today it vanishes there (compositor ~2434/20504); test it with Screen on an adjustment layer;
  - hide the "always first" tag for plate-mode blurs (inspector ~1775);
  - route to the plate pass whenever Mix is keyframed, so the render order cannot flip mid-clip;
  - remove only non-plate blurs on no-`ctx.filter` phones;
  - do **not** log C25's phone/PC default as fixed.
- **`b2ce43ae`** Warp edge and smooth sampling. **Fix:** `Math.floor`, not `|0`, in `warpSample`'s nearest branch (a CPU/GPU mismatch on the top and left edges). Remove the per-pixel closures and arrays. Add a test through `drawWarpEffect` that compares CPU and GPU.
- **`b986fcc4`** Card Flip rotation and back. **Fix:** `FM.evalProp(p.backcolor, t)`. Recommended: fill the layer's silhouette rather than its bounds box.
- **`cfa3859e`** Ripple/Curl Falloff and Radius, Wave speed. Add the note `0 = no limit` to Radius.

**Tests:** the batch's own tests, `921 S1`, `904` (Long Shadow), `692`, `859`, and the warp GPU/CPU tests, at 900 and 380.
**What Ezra sees:** more control over shadows, blurs and warps, with existing projects unchanged. Send a before/after sheet.

### B6. New visual effects (16 commits, T03)
These are the 13 backlog effects B27–B32, B37–B41, B53 and B54, plus ChatGPT's two follow-ups for them. They are new tiles in the effects browser. Nothing existing changes. **Picture rule:** render the 13 through the app at shipped size and send the sheet when the batch is green. If he has not answered, ship under LOOP rule 16 and say a one-word veto removes any of them. One schema bump.
Branch order:
- `d7dc22d3` Venetian Blinds. **Fix** the soft-edge pop at progress 0 and 1.
- `410a34d1` Radio Waves, with `1b80bf41` squashed in. **Fix** the crop test: its offset fixture gives the same numbers before and after.
- `21dcd7ee` Lens Magnifier. **Fix** the double image on transparent layers (cut the lens out with `destination-out` first) and add a transparent fixture.
- `84370498` Circle Array. **Fix:** integrate a keyed Spin.
- `b15ff479` Cartoon and `3728d6f5` Oil Paint. **Fix:** full resolution or bilinear upsample at export, and kernels that scale with ps. Oil Paint's summed-area tables must be `Float64Array`.
- `44b15c57` Laser Beam.
- `fcda7fd2` Fractal Noise. **Fix:** grid spacing from the finest octave.
- `3e591a41` Gradient Wipe. **Fix:** `edge = (1+s/2) - progress*(1+s)`.
- `01d2f034` Title Warp.
- `93dceac1` Odometer Roll. **Fix:** single-line only, or lay out lines with `FM.textLines`; add a two-line test.
- `36039096` Spill Suppressor.
- `0cdc6732` Deflicker. **Fix:** port **only** `5a5c0391`'s dispatcher line that passes `fx`; without it Deflicker is a silent no-op. Add it to the 482 sweep's `KNOWN_THIN`. Drive the test through `FM.renderScene`.
- `8efc6234` Laser keyed pulse, and `8516f675` Radio Waves keyed rate.

Several hunks sit on context lines from T02 (`claritydehaze`, `bwmixer`, `autograde`), so port those by hand. `CANVAS_FX` insertions collide with v17.23's `vignette6` anchor.
**Tests:** the batch's own tests, `921 S1`, the `482` "every effect does something visible" sweep, `913.5`, and the fx-thumbs "no picture of nothing" check, at 900 and 380.
**What Ezra sees:** 13 new effects in the browser, and a picture sheet.

### B7. Sound packs: Drums, Explosion & Thunder, Ambience, Everyday Foley (4 commits, T04)
`b72dfd54` · `30a75961` · `05116900` · `ae637420`. Only sfx.js changes, which nobody else touches. No schema bump.
- **Fix `30a75961`:** Variation 1–4 currently share identical noise. Seed per variation, keeping Variation 1 byte-identical. Make Small quieter than Big, or rename the control. Phone controls must be at least 32px tall.
- **All four:** strengthen each test to check what makes the sound itself (onset counts, frequency bands). Today they only prove "not silent".
- Optional: change the 60 Hz mains hum to 50 Hz (Perth). Consider a snare plus cymbal "Ba-dum-tss".

**Tests:** the batch's own tests, `562`, `709`, `986 C10`/`C11`/`C12` and `sfx-warm`, at 900 and 380.
**What Ezra sees:** 4 new sound categories. Send a listening page with a one-word veto. Note for Simple Phase 2: `FM.sfx.open()` shows these rows in Simple too.

### B8. C31 still-frame half: Frame Stutter / Time Warp Scan after a jump, shapes and stills only (one squashed change, 41 commits). **Low priority**
#1067 steered ChatGPT away from more of these, and it is Claude's own LOW finding. Land it only when nothing above is waiting. **Needs B2's `fea15508`.** Squash it into one change per gate. Do **not** cherry-pick: the commits are interleaved with the video half and T22.
- T36: `097aa3ac` `7f1e3a5a` `69234c60` `d4ef276e` `4fa16b3a` `51a2043a` `66e23a4d` `df1572b5` `df62ae95` `8080c211` `7e956a1b` (`b28993ca` is only a resume tag, so drop it).
- T37: `382a4577` `65b06b35` `81d68d6b` `85aef144` `f30a19cd` `0fbd6cd2` `49714393` `d1ce0da9`.
- T38, **shape and still parts only**: `0ee40ea0` `37aea798` `c71d0c8b` `904a8aa5` `5b659a3e` `c0df65e1` `f2143d2a` `7e54fddf` `d3be408e` `913fd481` `29babcd9` `18a1f4ee` `30412697` `ebb4019f` `bc31aee7` `8e4780a3` `ab907edc` `54c023ef` `e7fceb82` `e8e0f807` `a53aa716`.

Fixes:
1. **Snap Frame Stutter samples to the frame grid**: `min(t, ceil(b*fps-1e-9)/fps)`. Then **revert the six rewritten `HEAD482B` Frame Stutter goldens**, because the defaults must stay byte-identical.
2. In `d4ef276e`, the jump threshold becomes `0.34*dur`, not 0.34 s.
3. Drop every `resumeRenderer` / `c31-*` resume-tag hunk. Live `export-resume.js:84-89` already puts the version label into the resume signature.
4. Add a shape test for Contrast (`37aea798`).
5. Put the four pixel-by-pixel allowlists into **one shared set**, with a test that each listed kernel really is pixel-by-pixel (structural, not remembered).

Phone check: scrub backwards at Sweep 20 s on his phone (up to 1200 redraws per step).
**Tests:** `?only=690%20Frame%20Stutter`, `?only=690%20Time%20Warp`, the `482` Frame Stutter goldens, at 900 and 380.
**What Ezra sees:** after jumping the playhead, these two effects show the right picture.

### Later, after his answers (section 3)
- **B9 fonts** (T18 then his T19 picks): its own release.
- **B10 worker export** (T22): only after #604 is fixed.
- **B11 C31 video half**: all of T36, T37 and T38 with video and decoder code, including `955841a5`/`10152253` (drop their invented `mask.type==='pen'` clause). It needs B10 or a port without the worker. **Before landing:** stop the Frame Stutter sampler while `FM.playing`; fall back to the history path when the sampler fails instead of failing the export; size the preview from `__fmRS`; build only when the accumulator is cold. Then **an iPhone check**.
- **Feature batches he says yes to:** T01, T02, T05, T06, and T20 picks. Each needs the fixes already written in its verdict: T06's shared choice control first, plus the Auto-Wah options, Noise Gate release and Loudness Match null cache. T05's twins need the karaoke hardening. T02's B&W Mixer must be routed to adjustment layers, plus the Clarity radius clamp, the log legal range, thumbnails and the schema bump.

---

## 3. Questions for Ezra (each with a recommended answer)

1. **Fonts.** ChatGPT bundled 13 fonts: 2 it drew, 11 free open-licence ones, in a sectioned font picker. Want them? It also switches every existing title from your phone's system font to real Inter, which looks slightly different and may re-wrap old text. **Recommended: yes to the fonts, but leave old projects looking exactly as they do now** (the bundled Inter gets its own name).
2. **ChatGPT's 12 hand-drawn fonts** (Meridian Serif, Lilt Marker, Vector Mono, Foundry Slab, Cloud Pop, Signal Pixel, Aperture Stencil, Ribbon Script, Palais Deco, Blackthorn, Reed, Stormbrush). Which ones, if any? Two have no accents. **Recommended: none until you've seen one sheet** (24px and 48px, over video), then only your picks.
3. **Shapes.** ChatGPT redrew about 23 shapes, including your heart and the thumbs-up and envelope that were traced from your own references. Its own reviewer said the set "must not be released as final". **Recommended: keep today's shapes.** Answer the #929 heart pick on its own, then choose individual shapes from an old-vs-new sheet.
4. **Background export** (the app stays usable while exporting). It hasn't been tried on your iPhone. If it fails partway through, that export fails instead of quietly using the old way. **Recommended: later, after the no-sound export bug (#604) is fixed.**
5. **Colour-grading pack** (10 effects). **Recommended:**
   - yes to Colour Wheels, with the round pucks on the phone too (they fit at 380px);
   - yes to Clarity & Dehaze, B&W Mixer and Auto Grade;
   - merge HSL Mixer into the existing HSL Bands;
   - skip Channel Mixer (Channel Remap already exists).
   - For the log converters: which camera do you shoot (iPhone Apple Log? DJI?), and is "Log to Normal" a better name than "Log to Rec.709"?
6. **Audio clean-up tools** in the Volume panel: Reduce Noise and Auto-duck music under speech. **Recommended: yes to Reduce Noise first** (it was offered to you as background-noise removal); Auto-duck after it.
7. **Eight audio effects** (Graphic EQ, Hum Remover, De-esser, Channel Utility, Stereoizer, Auto-Wah, Noise Gate, Loudness Match). **Recommended: yes to all eight**, with buttons like the visual effects instead of drop-downs. Graphic EQ presets should actually move the sliders.
8. **"Filter layer" tile** in Add > Elements: one tap drops an empty adjustment layer over the clip and opens Filters. **Recommended: yes**, after you pick its icon from 2–3 drawn options. It lands in a release with no Simple-mode change.
9. **Overdrive filter's sun turns lavender.** Fix it so it stays white? **Recommended: yes** (before/after picture first).
10. **Diagonal Stripes, and Checker/Grid at an angle, get soft edges** instead of stair-steps. This changes existing Stripes layers. **Recommended: put it behind a "Smooth edges" switch, off by default.**
11. **Poster Print** prints pure black-and-white dots. A: black dots over posterised colour. B: coloured dots. C: leave it. **Recommended: A**, folded into the planned Halftone "mode" control.
12. **Heads-up, no answer needed:** batches B6 (13 new effects) and B7 (4 sound packs) ship as recommended with a picture or listening page. Reply "drop X" to remove any of them.

---

## 4. Drop list (59 commits)

| Commits | Why |
|---|---|
| T39: `f10256af 0650b810 b2bd8b3d 517bfa1a a3f899b5 eb0e4841 ecba735d 802b8417 be1388ec 4aa5726c af0afe4a 12c480e6 e16d6959 d8f4998b 97327daa a0876429 a14b00b2 b79b6451 ad9bf79d e9bf3c90 8bc9d047 6e55f6c4 de86e4dc 3991897b 48128b3d 31138900 1cf9a966 f5a383ca 854191bf e6baec37 452f9a1b` (31) | Only ChatGPT's notes and font-study proofs under `outside/chatgpt/`; no app code. GitHub Pages would publish the ~3 MB of proof PNGs and TTFs. `8bc9d047`'s glow "browser pass" gives no count or detail, so treat it as unproven |
| T14 Home: `b38e3d8f 49742a3f c7763bfd 6a6db2d5 07baced9 374f744c e7232077` (7) | Already live as v17.22. Re-applying them would bring back the initials-over-photo CSS bug and the old photo race |
| T15 `7bc6c9ab`, T18 `f8c2f757` (2) | Merge commits with stale `?v=` numbers. Redo their resolutions by hand (T15: keep both `fractalnoise` and the ps-aware `smoothbevel`; keep main's Home tests) |
| T08 glows: `8324f0c0 75b4f2fd 57c45e04 2cea7b62 783dad9f 8bf9ee64 ac6601ca` (7) | Duplicates v17.23 batch 6.2. `8324f0c0` also makes every saved glow spill onto empty areas. Optional salvage: `ac6601ca`'s red/blue no-contamination assertion as a one-off cross-check |
| T27 `d951169c`, T30 `0cae1018`, T33 `76e23b54` (3) | Duplicates v17.23 (Glow Scan, Lens Flare, Vignette). T27 also uses the same keys with different meanings, which would re-aim saved angled scans. T30's 16 rays smear. Its percent X/Y readout can be a separate item if he wants it |
| T20: `d6ca358a 58ef9d18` (pass + revert), `d50c7abe 604cd216 0c61554e` (overwritten by `a1ba9441`), `7baf7646` (its test passes on live; needs T22) (6) | Superseded, or no longer change anything |
| T07 `faa53a1c` (1) | Its whole fix is a 1-plate-px floor (the preview becomes 3.6× stronger than the export). If wanted, redo it with a fractional radius as `f3455117` does |
| T23 `1ac40d1f`, T29 `e69dae17` (2) | Cache-tag bookkeeping only; the busters are re-bumped at landing anyway |

---

## 5. Instructions for ChatGPT going forward (paste as one block)

```
FREEMOTION — RULES FOR YOUR BRANCH FROM NOW ON (from the land review of codex/690-reviewed-local @ 6ed01d4d, 5 Oct)

Priority stays as #1067 set it: the VERIFIED bug lists first, starting with the empty-audio-track export defect
(reports/batch2/VERIFIED.md §1a) and the #671 VideoFrame leak. Nothing below outranks that.

STOP:
1. No more C31 permutations (Frame Stutter / Time Warp Scan × effect × shape/still/video). The family is parked.
2. No new effects, fonts, shapes, UI tiles, panels or controls unless the land list's section 3 says he approved them.
3. Do not build anything in the builder's planned polish batches or already in POLISH-LOG/REQUESTS (you rebuilt
   v17.23's glows, Glow Scan, Lens Flare and Vignette). grep POLISH-LOG.md and REQUESTS.md first.
4. Never change how an existing project or a default looks. A new key needs `legacy` so that an absent value means
   the old behaviour, and defaults must stay byte-identical (Unsharp coloursafe def 100, Border smooth with no legacy,
   ungated glow outside and Stripes smoothing all broke this).
5. No merge commits, no Home edits, nothing under outside/chatgpt/font-study or *.png/*.ttf proofs in the branch.
6. Never write { item: 'TBD' } and never name tests '690 …'. Use the queue number you were given, or
   'hunt-pending' and say so in the report.
7. Do not claim checks you did not run ("browser passed" without count/port; "saved projects keep their rendering").

ALWAYS:
A. Run the FULL suite (tests/_cdp.py, ~35 min) at 900 and --width 380 before calling a batch done. Single tests are not enough.
B. Any effect or audio param added → bump C.SCHEMA_REV and re-pin C.SCHEMA_FP in js/collab-core.js
   (the '921 S1 the schema fingerprint gate' test prints the value).
C. Prove each test fails with the fix reverted. Its fixture must contain what separates right from wrong: a transparent
   layer, an offset that changes the numbers, a 90° angle, a real mask shape (FM.masks.make has no `type`).
D. Colour params go through FM.evalProp (they keyframe). Never floor a radius at 1 plate px (#691); use fractional radii.
E. New commits on TOP of your branch, one per fix, subject "fix-for <sha>: …". Never rewrite or rebase the pinned tip.

FIX IN YOUR BRANCH (in this order: the builder lands B1→B7; if your fix isn't there, it fixes the commit itself):
B1  2e5e0cf0 exportFile falls back to IndexedDB · 70797f4c backup font cap = _backupEmbedLimit, label unreadable fonts ·
    f1ac5fa8 rejecting-fetch test · b69c5795 no resync across a split; keyframes remapped only on speed/move; split/trim/move tests ·
    d662aa35 drop the sw.js?v=1 register change
B2  304f6370 integrate Speed in v17.23's Travel/Once/Wait branch (after v17.23 is on main)
B3  ca35afb3 def 0 legacy 0 + new test · 0f8ec39b remove the 1px floor · 746d53a8 real Scale-clamp test · dd2220fe catching test
B4  901ee496 zero-radius dot = no ink · cee51dcb legacy 0 · 0f98b861 start-corner notch · 545389fa screen-blend Everywhere,
    fork length independent of Segments · e15da085 remove Reverse · 427d5af4 keyed-Evolve test · 62c98f5e bound test ·
    1c84e763 'Smoothness' label + 692 bound cases
B5  7a2ef677 crossed-pixel hit test + slope snap · 0df427eb..a0732c3d motionblur back in CFX_NO_BBOX, blur on adjustment
    layers, keyframed Mix stays on the plate route, pool canvases · b2ce43ae Math.floor + no per-pixel closures ·
    b986fcc4 evalProp backcolor · cfa3859e '0 = no limit' note
B6  d7dc22d3/3e591a41 continuous progress ends · 21dcd7ee no double image · 1b80bf41 discriminating fixture ·
    84370498 integrate Spin · b15ff479/3728d6f5 export resolution + Float64 SATs · fcda7fd2 octave grid ·
    93dceac1 multi-line · 0cdc6732 dispatcher fx arg + KNOWN_THIN
B7  30a75961 per-variation seed, quieter Small, 32px phone controls; real character tests on all four packs
```
