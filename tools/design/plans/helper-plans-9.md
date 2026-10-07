# Plans for the five after P8 (P9): #1009, #1010, #1011, #1013, #1014

Against `origin/main` 470ee20e (app code identical to v17.24 05d06c53). Plans only: no app, test or tool code changed. **Reproduced / Measured** = I ran it in my container (headless Chromium 1194, software GL, the app's own functions, a fresh profile each time). **Read** = I read the line. **Guess** = not verified. Line numbers are on this tree (the older `VERIFIED.md` numbers are v17.23 and have moved: it says `js/compositor.js:14672` for #1009, the line is now `:15163`).

## Which five, and the rule I held them to
By the same rule as P7 and P8 (`tools/_classify.py` order on `REQUESTS.md`), the next audit-tier items after #1008 are **#1009, #1010, #1011, #1013, #1014** (#1012 is a closed batch log). All five carry `JUMPED: assigned to ChatGPT via the PM (5 Oct lane split) — land it, don't rebuild it`, so each plan is a checklist for ChatGPT's commit and a complete build plan if it does not arrive. #1013 and #1014 are the two H16 already reviewed on the chain (`hunt/chatgpt-chain-review`); their plans below add what H16 did not do, the caller trace.
**New rule from the PM, applied to every plan: before saying where a fix goes, trace EVERY caller of that function (open, import, undo, collab), not only the one it was found from.** Each plan has a "Callers traced" line.

---

## #1009 Image fills from a previous project stay in memory all session

**Reproduced (`helper-plans-9-scripts/fill1009.py`).** 100 shapes, each with its own 1024x1024 JPEG fill (8.86 million characters of data URL in all), rendered until decoded; then the scene replaced by a second project with one fill, rendered; then five more one-fill projects. Live `HTMLImageElement`s with a decoded 1024-pixel picture after forced GC: **100 after project A, 100 after project B, still 100 after five more projects** (JS-heap bytes did not show it: the strings and bitmaps sit outside what `JSHeapUsedSize` counts, and I did not isolate the renderer's RSS because another job's Chrome was running; the upper bound is 100 x 1024 x 1024 x 4 = **419 MB** if the browser keeps them decoded, a Guess).
**Where (Read).** `_fillImg` (`js/compositor.js:15163`) is module-level. `getFillImage` (`:15164-15188`) evicts **at most one** dead entry, only on a miss, and only when there are more than 40: so each new fill replaces one old one and the count stays near 100. Nothing clears it when a project opens (grep: `_fillImg` appears only in that function).
**Callers traced.** `getFillImage` is called from `FM.fillPanLimit` (`:15141`, the inspector's drag clamp), `paintFillInPath` (`:15196`) and the render branch at `:19445`. What replaces the scene: `FM.projects.open` (`js/storage.js:2524-2535`, the teardown that already calls `FM.releaseProjectMedia` and `resetMotionFlowCache`), `applyScene` (import, restore, template insert), `history.restore` (`js/history.js:80`, same layer ids, so nothing is dead), the collab snapshot apply, and `makeLayerThumb` (`js/storage.js:2210`), which renders a **mini scene whose layers are not in `FM.scene.layers`**.
**The trap in the entry's fix** ("when the scene identity changes, drop all dead entries"): "dead" is computed against `FM.scene.layers` (the existing code does this, `:15176`), so a template or element thumbnail with 50 fills would see all 50 as dead and thrash. **Do not decide by liveness; decide by last use.**
**Build**
1. Stamp each record on every hit (`rec.at = performance.now()`).
2. One `pruneFillImages()`: when the cache holds more than 8 records, drop every record unused for 30 s (not "one"), and for each dropped record set `rec.img.src = ''` and `rec.img.onload = rec.img.onerror = null` so the decode can be freed.
3. Call it (a) on a miss in `getFillImage`, replacing the one-entry eviction, and (b) in `FM.projects.open` next to `resetMotionFlowCache`, so a project switch frees the old project's pictures at once instead of after 30 s (**with age 0 there**: a project switch is the one moment all of it is dead).
4. A seam `FM._fillImageCount()` for the test.
**Test** (`1009 fill pictures from a project he has left are freed`): the script above in small: 60 distinct fills (use 64 px so the test is quick), switch through `FM.projects.open` to a project with one, render, assert `FM._fillImageCount() <= 2`. **Fails on v17.23/v17.24** (60). Control: inside one project the 60 are **not** decoded again between two renders (count of `Image` constructions unchanged); and a mini-scene render of 50 fills (the `makeLayerThumb` path) keeps all 50 for its own render.
**Effort:** an hour. **Risk:** low; worst case a fill re-decodes (about 10 ms for a 1024 px JPEG, **Guess**). **ChatGPT's commit:** check it does not use `FM.scene.layers` as the live set.

---

## #1010 The no-GPU blur fallback allocates two big buffers per call

**Measured (`helper-plans-9-scripts/blur1010.py`).** With `ctx.filter` made inert and `FM.glColor.blur` returning null (the two conditions the fallback needs), `FM._drawBlurredNoFilter` (the suite seam) allocates **exactly 2 `Float32Array`s per call**: **67 MB per call at 1080x1920** (r 6), 18 MB at 540x960, 14 MB at 1080x1920 with r 40 (it works on a copy shrunk by r/16 past r 16). That call took **1.0 to 1.2 s** here (a CPU box blur at full size). The two allocations themselves cost about **0.1 to 0.6 ms**; touching their pages the first time costs about **43 ms**, so the buffers are **about 4% of the time and all of the churn**: the fix saves memory pressure, not speed.
**Where (Read).** `cpuBlurCanvas` (`js/compositor.js:1922-1960`, the allocation at `:1926`). **Callers traced:** `cpuBlurCanvas` has **one** caller, `drawBlurredNoFilter` (`:1987`); `drawBlurredNoFilter` is called from fifteen sites (`:2015`, `:10251`, `:10338`, `:12701`, `:12703`, `:12779`, `:12834`, `:13329`, `:13587`, `:14635`, `:16889` and the suite seam `:1995`), all synchronous and none nested inside `cpuBlurCanvas`, so one module-level pair is safe. It runs only where `ctxFilterOK()` is false **and** WebGL blur returns null (`:1986-1987`): the entry (and VERIFIED §1.11) say effectively never on his iPhone, which has WebGL; **a lost WebGL context on a phone under memory pressure is the way in, Guess.**
**Build (only when this code is touched anyway, as the entry says).** Module-level `_cbA`, `_cbB` grown to `N * 4` and reused. **But do not keep a 67 MB pair for the life of the page** (that is the very kind of retention #1095 found): keep the pair only up to a cap (say 16 MB, a 1080x1920 blur at r 40 fits) and for larger N allocate per call as today. Output must be byte-identical.
**Test** (`1010 the CPU blur reuses its scratch buffers`): with the two conditions forced, two calls at the same size construct at most 2 `Float32Array`s between them (today 4); output of the second call byte-identical to the first's on the same input. Control: a larger size than the cap still works.
**Effort:** half an hour. **Risk:** none for the output. **Priority:** lowest of the five; bundle with whatever next touches `drawBlurredNoFilter`.

---

## #1011 An export that fails closes its VideoFrame only on success (and never closes the encoder)

**Reproduced (`helper-plans-9-scripts/exp1011.py`).** `VideoEncoder` stubbed (its `encode` throws on the third call) and `VideoFrame` counted, 64x64, 10 fps, one second, through the real `FM.exporter.run`:
| scenario | frames created / closed | encoder state afterwards |
|---|---|---|
| control (no failure; the stub emits no chunks, so the run ends in an unrelated muxer error) | 10 / 10 | closed |
| `encode()` throws on frame 3 | **3 / 2: one VideoFrame leaked** | **configured (never closed)** |
| `renderScene` throws on frame 3 | 2 / 2 | **configured (never closed)** |
**Where (Read).** `js/exporter.js:1494-1498`: `const frame = new VideoFrame(...)`; `encoder.encode(frame, ...)`; `frame.close()`: the close is skipped if `encode` throws (an encoder that already errored throws `InvalidStateError`). `encoder` is a `const` **inside** the `try` (`:1442`), and the `finally` (`:1629-1642`) cannot see it, so **any** exception leaves it open. It is closed only on the Cancel path (`:1467`, `:1476`) and on success (`:1516`).
**Callers traced, and the same pattern elsewhere:** `VideoFrame` and `VideoEncoder` are constructed only in `run` (the GIF and frame exports do not use them). But the identical `enc.encode(ad); ad.close()` shape is in **`encodeAudio`** (`:958`, `enc.close()` only at `:962` on success) and **`aacPriming`** (`:883-885`, inside a `try` whose catch returns without closing the encoder), so a failed audio encode leaks an `AudioData` and an `AudioEncoder` the same way. `encodeAudio` is called from `run` (`:1356`) and `encodeM4A` (`:1107`).
**Build**
1. Video: hoist `let encoder = null` above the `try`, assign it where it is created, and in the `finally` close it if `encoder && encoder.state !== 'closed'`; wrap the encode as `try { encoder.encode(frame, ...) } finally { frame.close(); }`.
2. Audio: the same two edits in `encodeAudio` (a `try/finally` around the loop and flush) and `aacPriming`.
3. Do not change the success order (the flush still happens before `close`).
**Test** (the entry's, plus mine): make `encode` throw on frame 3; assert every created `VideoFrame` was closed and `encoder.state === 'closed'`, for both the encode-throws and the render-throws variants. **Fails on v17.23/v17.24** (3/2 and `configured`). Control: a clean run still closes everything. Add an `AudioEncoder` variant for `encodeAudio`. Needs `await needsAac()` first only for the audio variant (Linux has no AAC encoder, `tests/tests.js:193-205`), and a stub for the video one, since this container has no H.264 and the real encoder is not needed.
**Effort:** an hour. **Risk:** low; closing an already-closed encoder is guarded. **Why it matters (Guess):** an unclosed hardware encoder after a failed export may make the next export fail on a phone that limits concurrent encoders; not measured.

---

## #1013 The MP4 export can ship an EMPTY audio track while the report says TRACK WRITTEN

**Status.** H16 reviewed ChatGPT's fix (`2ea47a00`, on the v17.23 chain; the pile's `f25e15d3` pair is retired) and found it works: reverted, the zero-chunk test fails with "zero AAC chunks still left a declared audio track in the MP4: soun true, mp4a true". Its corrections are in `hunt/chatgpt-chain-review`: add `await needsAac();` as the test's first line, put an 8 s cap on `dec.flush()` in `decodedAACPeak`, bump the `?v=` cache-busters, and ship from the Mac (feature gate).
**Callers traced (new here, Read on main).** `encodeAudio` has **two** callers, and only one needs the guard: `encodeM4A` (`js/exporter.js:1107`, the audio-only export) **already** refuses an empty result (`if (!n) return { blob: null, reason: 'no-chunks' }`, `:1115`); `run` (`:1356`) pushes the chunks into an array and never checks its length, then declares the audio track on the muxer regardless (`:1425-ish`, `audio: mix ? {...} : undefined`). So the fix belongs **only** in `run`, between `encodeAudio` and the muxer, which is where ChatGPT's commit puts it. The value then flows to `hasAudio: !!mix` (`:1620`), consumed **only** by `js/app.js:6281` (`'Sound ✓'`) and to `FM._audioTrackDropped` (`:1581` report, `:1620`): both read after the guard, so no other consumer changes. **Resumed exports:** the audio is re-encoded on every run (only video chunks are replayed from `FM.exportResume`), so a resume goes through the same guard. Nothing else calls `encodeAudio`.
**Check on arrival:** the guard sits before the muxer is built (a track cannot be un-declared), `mix = null` on the empty case so `hasAudio` follows, and the test fails with the exporter reverted.
**Effort:** nothing to build if the commit lands; half an hour if not. **Not verified here:** the healthy half needs a real AAC encoder (the Mac).

---

## #1014 A panorama import makes a canvas that changes shape when the project is reopened

**Reproduced at the function level (a one-call script, not saved).** `FM.fitProjectSize(w, h)`, then the clamp the loader applies (`FM.storage._clampProjectDims`):
| image | the app makes | after reopen | shape kept |
|---|---|---|---|
| 16000x4000 | 8640x2160 | 7680x2160 | **no** |
| 12000x3000 | 8640x2160 | 7680x2160 | **no** |
| 8000x1000 | 8000x1000 (not capped: short side under 2160) | 7680x1000 | **no** |
| **30000x2000** | **30000x2000** (not capped at all) | 7680x2000 | **no** |
| 10000x5000 | 4320x2160 | 4320x2160 | yes |
| 4000x3000 | 2880x2160 | 2880x2160 | yes |
The last two rows are the **new** finding: `fitProjectSize` caps only the **short** side (`js/app.js:2961` `MAX_AUTO_SHORT = 2160`, `:3023-3024`), so a thin panorama is never capped on its long side: a 30000x2000 picture makes a 30000x2000 canvas (60 megapixels, about 240 MB per buffer), which is a larger risk than the shape change, and the loader's clamp to 7680 (`js/storage.js:1006`) then reshapes it.
**Callers traced.** `fitProjectSize` has **one** caller, `addMediaLayer` at `js/app.js:3039` (first clip into an empty project). `projectIsOversize` (`:2982`) is read at `:2994` (the lag toast) and `:8278` (the Canvas dialog warning). The same clamp (`[16, 7680]`, `js/storage.js:1006`) runs on import, undo restore, collab clone and every load, and `ai-ops` clamps AI-set dimensions to the same range, so **7680 on the long side is already the app's own limit everywhere except this one door**. H16 reviewed ChatGPT's fix (`9cec73a1`: `MAX_AUTO_LONG = 7680` as well as the short cap, and `projectIsOversize` trips on a long side over 7680): it scales both sides by one factor, `k = min(1, 2160/short, 7680/long)` (chain `js/app.js:3023`), so the shape is kept, and I computed its result for the six rows: 16000x4000 to 7680x1920, 12000x3000 to 7680x1920, 8000x1000 to 7680x960, 30000x2000 to 7680x512, and the last two unchanged. H16 ran its test and it fails with the fix reverted.
**Check on arrival:** a single factor for both sides (so 8000x1000 comes out 7680x960, not 7680x1000); a test that really reopens (autosave, `FM.storage.load()`, then width, height and transform unchanged), because the pile's `3c712a1d` form of that test is the one the PM verified and the chain's is the one H16 ran; check which one lands; and the lag toast does not now offer "tap to fix" on a session-only state (H16 noted this).
**Effort:** nothing to build if the commit lands. **Risk:** an image over 7680 on its long side now makes a smaller canvas than before (by design).

---

## Order
1. **#1011** (a real leak on every failed export, an hour) and **#1009** (an hour, measured 100 retained images).
2. **#1013 and #1014**: land ChatGPT's chain commits with H16's corrections; then re-run the two tests with the source reverted.
3. **#1010** last, with the next touch of the blur fallback.

## What I did not do
No fix was applied, so each "fails on v17.2x" is the reproduction above, not a run of the finished test. #1009's bytes are an upper bound, not a measurement. #1011's phone-encoder consequence is a guess. #1013's healthy half needs a real AAC encoder. I did not read ChatGPT's commits beyond what H16 already did.
