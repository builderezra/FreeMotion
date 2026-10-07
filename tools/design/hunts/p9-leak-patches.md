# H27: ready-to-build patches for #1009, #1010, #1011 (with encodeAudio and aacPriming)

Against `origin/main` 2e3fd7a9 (v17.25; the P9 plan was written on 470ee20e, so the line numbers in `helper-plans-9.md` are a few lines off, these are on the new tree). **Nothing here is applied to main.** Three `git format-patch` files in `p9-leak-patches/`, one per item, each carrying the code change AND its test. `git am` them in order, or apply the test hunk alone to see it red.

**Verified = I ran it** (headless Chromium 1194, real GC through `tests/_cdp.py`, `FM_CHROME` set). Table: every test run on main's code (patch's `js/` hunks reverted, test kept) and on the patched code, at 1280 and at 380.

| test | main 1280 | main 380 | patched 1280 | patched 380 | red message on main |
|---|---|---|---|---|---|
| `1009 fill pictures from a project he has left are freed…` | FAIL | FAIL | pass | pass | 60 of the 63 fill pictures are still alive after the project was left and a forced collection |
| `1010 the CPU blur reuses its scratch buffers…` | FAIL | FAIL | pass | pass | three blurs of the same 160x120 plate made 6 new big Float32Arrays (3.8 MB) |
| `1011 an export that fails closes every VideoFrame and its VideoEncoder` | FAIL | FAIL | pass | pass | made 3 VideoFrames and closed 2: 1 leaked |
| `1011 an audio encode that fails closes every AudioData and AudioEncoder…` | FAIL | FAIL | pass | pass | made 6 AudioData and closed 4 |

None of the four needs an app seam or a real H.264/AAC encoder (stubs for the encoders, the REAL `VideoFrame`/`AudioData` classes counted), so they run on this Linux box and on the Mac. The #1009 test needs the driver's GC (`window.__fmWantGc`, the same one the 690 tests use) and says so if run without it.
Not shown red separately: the *render-throws* variant of #1011 (the test checks `encode` first and stops at the first failure; the variant is asserted, and green with the patch, but I did not mutate it alone). **Guess** that it is red on main, because my P9 reproduction measured it (2/2 frames, encoder left `configured`).
Not run: the full suite (35 min). I ran the three new tests and nothing around them beyond what the background check below says.

## #1009 `js/compositor.js` `getFillImage` (+ one line in `js/storage.js` `FM.projects.open`)
- **Callers traced (Read):** `getFillImage` is called by `FM.fillPanLimit`, `paintFillInPath` and the media-fill render branch. The cache is replaced wholesale only by `FM.projects.open` (teardown next to `resetMotionFlowCache`); `applyScene`/import/restore keep or reuse layer ids, `history.restore` keeps the same ids, and `makeLayerThumb` renders a mini scene whose layers are NOT in `FM.scene.layers`. So **liveness against `FM.scene.layers` is the wrong test** (50 fills in a template thumbnail would all look dead); the patch decides by **last use** (`rec.at`, stamped on every hit).
- Change: `pruneFillImages(force)`: over 8 records, drop every record unused for 30 s (not one), blank `img.src` and handlers so the decode can go. Called on a miss (replacing the one-entry eviction) and with `force` in `projects.open`, the one moment everything is dead. Seams `FM._pruneFillImages`, `FM._fillImageCount` (the test does not use them).
- Control inside the test: the 60 fills are **not** re-decoded on a second draw in the same project (the thrash the old comment warned about).
- **Guess / not measured:** the bytes. The test counts live Images, not RSS. A project open that fires while a render is mid-flight re-decodes (a fill's `rec` is gone, `getFillImage` makes a new one and returns null that frame): cosmetic, one frame.

## #1010 `js/compositor.js` `cpuBlurCanvas`
- **Callers traced:** one caller, `drawBlurredNoFilter`, synchronous, not nested, so one module-level pair is safe. Reached only without a usable `ctx.filter` and with WebGL blur returning null.
- Change: `_cpuBlurA/_cpuBlurB` kept up to `CPU_BLUR_CAP` = 2,097,152 floats per array (8 MB each; a 1080x1920 blur at r 40 works on about 330k px so it fits); a bigger plate allocates per call as before and keeps nothing. Output is byte identical: `a` is fully overwritten by the premultiply loop, `b` by every pass. The test draws pink, green, pink and demands call 3 equal call 1 byte for byte, so a stale buffer would fail it.
- Names are `_cpuBlur*` on purpose: `_blA` and `_cbA` already exist in that file (I hit both while writing it; a clash is a SyntaxError that takes the whole app down).
- Control in the test: an 800x800 plate (past the cap) still blurs.

## #1011 `js/exporter.js`
- **Callers traced:** `VideoFrame`/`VideoEncoder` are made only in `run`. `encodeAudio` has two callers (`run`, `encodeM4A`), `aacPriming` one (`encodeAudio`), all awaited.
- `run`: `encoder` hoisted into the existing `let delivered = false, recorder…` line so the `finally` can close it (`if (encoder && encoder.state !== 'closed')`, guarded); the encode is `try { encoder.encode(...) } finally { frame.close() }`. The success order is unchanged (flush, rethrow `vidErr`, close).
- `encodeAudio`: loop and flush inside `try/finally`, AudioData closed in a `finally`, encoder closed in the outer `finally`. `aacPriming`: `enc` hoisted above the `try`, AudioData in `finally`, encoder closed in a `finally` after the catch.
- **Only measured with stubs.** Real encoders closing is the point, but the phone-side consequence (a leaked hardware encoder blocking the next export) is still a Guess.
