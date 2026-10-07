# H40: every module-level cache, pool and array in js/, audited for the H19b shape (grows, never trims)

Base `origin/main` 2e3fd7a9 (v17.25). Labels: **Verified** = read in the code at the line given; **Measured** = run in my container (Chromium 141 headless, software GL, 1280 and 380 px); **Guess** = not run. MB = million bytes unless a test message says MiB (79 MiB = 83 MB). A 1080 x 1920 canvas is 8.3 MB.

## What I did
1. **Found every collection** (`scripts/h40_scan.py`): every `const|let|var X = new Map|Set|WeakMap|WeakSet(` / `[]` / `{}` / `Object.create(null)` declared at module level in `js/*.js`: **133**, with every line that grows it (`.set .push .add`, `X[k] =`) and every line that trims it (`delete .clear .shift .pop .splice`, `.length = 0`, reassignment). The full table with file:line for both is `pool-audit-appendix.md`. Whether an entry is trimmed was then **read by me** for every collection that could be large; the appendix says which ones I read and which I classified from the name and the trim lines only.
2. **Measured what they hold** (`scripts/h40_instr.py` puts a getter on every one of the 133 in a scratch copy; `scripts/h40_sizer.js` sizes each: canvases at w x h x 4, bitmaps, typed arrays, AudioBuffers, strings, entries). Scenario, run 4 times in one page: a new 1080 x 1920 project, two 900 x 1200 images, a text and a shape layer, 20 to 40 random effects (every one rendered at a random moment), 30 scrubs, 12 undo and 12 redo, the effects browser opened and closed, a save. Then one pass through all 12 effect categories, then a 0.6 s GIF export of a 1080 x 1920 project. Raw: `scripts/h40_sz_0.json` and `h40_sz_3.json`.
3. **Not covered:** the ~60 lazily created single scratch canvases (`let _x = null; … _x = document.createElement('canvas')`: 56 in compositor.js, 1 each in gl-color.js, gl-warp.js and tilefit.js, 2 in masks.js). Each is ONE canvas that follows the plate size, so the bound is one 8.3 MB canvas each, ~500 MB if every one were at export size at once (**Guess**, not measured); I did not take them one by one. Also not covered: arrays held inside objects rather than at module level, and the 94 tests that cannot run here.

## What I withdrew
- **The undo stack (`history.js:10`)**: I expected it to be the big one. It is capped at 120 snapshots or 48 million characters (history.js:297-304) and a 40-layer project with 6 effects on each (a 56 KB snapshot) filled the 120 for 6.5 MB. The cap only matters for a snapshot of ~400 KB or more. Not in the top 5.
- **"Strings with one non-Latin-1 character cost twice as much, so the char cap is really 96 MB."** I measured it in V8 (node 22): the same strings with and without a U+2019 took the same heap. No finding.
- **`media.js:10` `store`**: grew by 5 entries in one round. They were the 11 pinned 96 x 96 `_fxthumb*` photographs (the effects browser's own pictures), not leaked clips: after leaving each project only the current project's two images were left. Released correctly.

## Ranked by risk to a phone (Measured sizes; hours are a Guess)
| rank | what | where | size | grows with | trimmed? |
|---|---|---|---|---|---|
| 1 | effects browser sample tiles | fx-thumbs.js `cache` :1028 | **83 MB** after one pass through the 12 categories (40 animated tiles = 59 MB, 165 stills = 24 MB), ~7 MB per category | every effect tile ever shown | **No cap**: only the layer previews are on the 10 MB LRU (:1488-1506) |
| 2 | scratch pools, idle entries kept at export size | compositor.js `_pfPool :4286`, `_cfPool :11581`, `_wpPool :9135`, `_mgPool :18411`, `_expPool :11583` and 12 more | **190 MB** of canvas pixels right after a 0.6 s GIF export (pf 83, cf 50, dsp 33, wp 17, mflow 8); `_pfPool` alone sat at 36.8 MB idle | every effect depth ever reached; every export | H19's patch trims the DEPTH, not the size of the entries it keeps, and covers 5 of 17 pools |
| 3 | motion-flow plates | compositor.js `_mflow` :12249 | 8.3 MB per layer at export size, up to 12 layers (~100 MB) | each layer with Temporal Denoise, Frame Stutter, Time Warp Scan, Motion Blur (Footage) in an export | cleared when an export STARTS (exporter.js:1052) and on project open, never when it ends |
| 4 | decoded sound | media.js `store`: `rec.audioBuffer`, set by exporter.js:561 | ~88 MB per four-minute stereo song (arithmetic), 264 MB for three | every clip the export mixes | nothing frees it until the layer is deleted |
| 5 | files kept for undo of a replaced clip | storage.js `_prevFiles` :677 | one `File` per replaced clip per revision; RAM per file **not measured** | every Replace media / undo of one | **never** |

Everything else I measured was under 10 MB at the end of the scenario or has a cap (appendix). The 17 pools together held 45 MB in a quiet editor (after preview frames) and 191 MB right after an export.

## The five, each with the smallest trim and a test that fails first
Every patch applies **alone** on main with `git apply`. Stacked, their test hunks all land at the same line, so use `git apply --include='js/*'` for the code and paste the tests, or apply one at a time. Each was run at 1280 and 380 unless noted; "red" is the test with the code half of the patch not applied.

### 1. `pool-audit-patches/1-fx-thumbs-stock-cap.patch`: the sample tiles get a 32 MB LRU
- Cause: `remember()` (fx-thumbs.js:1496) is called only when `m.layerId` (:1582); a sample tile (`cache.set` at :1581) is never evicted. Callers of `cache`: :1505 (eviction), :1581 (set), :1798 (`cache.clear` on invalidate), `_uncache` seam; I traced each.
- Trim: `rememberStock` with its own list and `STOCK_CACHE_MAX = 32 MB`, called in the same place; `meta` is NOT deleted on eviction (a filter or preset tile still needs its recipe to be generated again); the invalidate clears the new list; `_uncache` removes from it. A new seam `FM.fxThumbs.cacheBytes()` sums the real cache.
- Test: `H40 the effect sample tiles stay under their memory cap…` mounts every effect's tile, waits for the queue to drain, asks `cacheBytes() ≤ 42 MB` (the two caps) and that tiles still cache and an evicted one paints again. **Red with only the seam: "holds 79 MiB… over the 42 MiB the two caps allow"; green with the cap at 1280.** Not run at 380 (**Guess**: same).
- Cost: reopening a category after eviction regenerates its tiles (~5 to 8 s for a category in this container; **Measured** during the sweep, a phone will differ).

### 2. `pool-audit-patches/2-pool-idle-release.patch` (applies on top of H19's two patches in `hunt/1095-fx-browser-leak`): release the idle entries the floor keeps, and add `_dspPool`
- Cause: H19's `_trimPool` keeps the first two entries of each pool at whatever size the last user gave them. After an export every kept entry of every pool is 1080 x 1920 until a preview frame reaches that exact slot. Every acquire site resizes on use, so a 0 x 0 entry is re-sized by its next user: **Verified** for pf :4412, wp :9182 and :9451, exp :11731 and :11752, mg :18450, cf (drawCanvasEffect), dsp (dspSlot, :10183).
- Trim: entries from the depth the pool reached in the last window up to the floor go to 0 x 0; `_dspPool` joins the high-water scheme; the trim timer re-arms once after a window that saw a draw (without that, the window that finds the idle entries never runs: my first version failed on exactly this).
- **Also in this patch: a one-line fix to H19's own test** (`1095 the effect scratch pools shrink…`, control `poolLen() < base + 12` becomes `poolLen() < 12`), which is order-sensitive when run in a suite (see Neighbouring tests).
- Test: `H40 a pool entry the floor keeps is released when nothing uses it…` draws a 2-deep stack at 1080 x 1920, then a 1-deep one at 180 x 320, waits two windows and asks `_poolStats().cf.px`. **H19 alone: red, 4,262,400 px (16 MB) still held. With the patch: green at 1280 and 380, and H19's own test still green.**
- **Not done:** the other 11 pools (`_pmPool :3355, _mbPool :3507, _fcPool :4492, _sqPool :9574, _t3Pool :11859, _dfPool :14605, _miPool :14923, _pxPool :15007, _fbPool :16680, _olPool :17089, _adjFcPool :17947`). `_mbPool.acc` and `_fbPool`/`_fbAvg` hold TEMPORAL state (motion-blur accumulation), so zeroing them mid-session would reset a feedback trail; they need their own rule, not this one. `_dspPool` is in the code but has **no catching test** (the only effects that use it need a second layer).

### 3. `pool-audit-patches/3-mflow-clear-after-export.patch`: clear the motion-flow plates when an export ends
- One line at each of the three `FM._exporting = false;` sites (exporter.js:1635, 1735, 1805, all in the `finally` of mp4, gif and png): `FM.resetMotionFlowCache()`. Callers of `_mflow`: `_mfRec` (compositor.js:12254) for denoise, stutter, time warp and motion flow; the preview rebuilds a plate from the next frame ("a backwards seek or a jump over 0.35 s shows the frame unblurred", the existing contract).
- Seam `FM._mflowSize()` (compositor.js, after `resetMotionFlowCache`). Test: `H40 an export leaves no temporal plates behind…` exports a GIF of a 64 x 48 project with a moving box under Temporal Denoise. Control: a plate was held during the export. **Red with the seam only ("still holds 1 layer plate(s)"), green with the three lines, 1280 and 380.** Only the GIF site is exercised: the MP4 and PNG sites are the same line (**Guess** that they behave the same; MP4 cannot run in this container).

### 4. `pool-audit-patches/4-audio-mix-frees-pcm.patch`: the mix puts back the PCM it decoded
- Cause: `buildAudioMix` (exporter.js:481) decodes with `FM.decodeAudio` and stores the full-fidelity buffer on the record (:561-563). `audio-tools.js:20-24` already says why that slot is never filled by the Save-as-WAV tools ("~90MB for four minutes of stereo… nothing frees that slot (queue 834 clause 17)"); the export never got the same treatment.
- Trim: note which records have `audioBuffer === undefined` when the mix starts and put them back to `undefined` at its three exits (no OAC is not one: nothing was decoded; cancel, nothing mixed, done). A buffer already there (reverse playback app.js:2629, audio-react :43-46, the exporter's second use) is left alone. Every other reader re-decodes when the slot is undefined (audio-play `requestPlay`, audio-react, waveform): **Verified by reading**, not by playing a song.
- Test: `H40 an audio mix frees the PCM it decoded, and leaves a buffer that was already there`: two clips through `FM.exporter.buildAudioMix`; control: a mix came back. **Red on main ("decoded "H40 fresh" to full PCM… and left it on the media record"), green with the patch, 1280 and 380.** My first shape (a wrapper function) turned `#215: an export audio warning reaches a surface…` red because that test reads `String(FM.exporter.buildAudioMix)` and counts `exportSay(` in it; the final patch edits the function in place and the 76-test export/audio/mix slice has the same reds as main (all `NO_VIDEO_CODEC` from this container and one timing test).
- Cost: the next preview play of that clip decodes it again (1 to 3 s for a song, **Guess**).

### 5. `pool-audit-patches/5-prevfiles-sweep.patch`: `_prevFiles` follows the media sweep
- Cause: `stashPrevMedia` (storage.js:698-706, 726-729) fills `_prevFiles`; nothing deletes (its comment says "Session-only on purpose" and relies on the boot sweep for the IDB copy, not the Map). A clip deleted and then lost from the undo stack keeps its original referenced for the rest of the session.
- Trim: in `FM.releaseUnreachableMedia` (storage.js:2319, called by history when it discards a snapshot, history.js:309) drop `_prevFiles` entries for ids that are in no scene, not pinned, in no snapshot and not reachable by a collab undo: the same three questions the function asks of the media record. It runs before the "store is empty" early return, because a replaced clip's record can already be gone.
- Test: `H40 the file kept for undo of a replaced clip is dropped once the clip is unreachable, and kept while it is in the scene`: control that both are kept; swept `[]`: the ghost goes and the in-scene one stays; a snapshot naming it keeps it; the last snapshot gone releases it. **Red on main, green with the patch, 1280 and 380.**
- **The weak one of the five:** I did not measure what a kept `File` costs in RAM (a `File` read from IndexedDB is a blob handle, usually disk-backed); the Map and the `File` objects are certain, the megabytes are not. It is ranked 5th for that reason.

## Neighbouring tests (Measured, 1280)
All five patches (and H19's two) on one tree against main, the same name filter on both (`export`, `thumb`, `tile`, `audio`, `media`, `prev`, `pool`, `undo`, `history`, `motion`, `blur`, `effect`; 711 tests on main, 717 with the new ones; the two `690` export tests and `every tile in the browser picks…` removed from both because they hang this container, see H37 and H41): **674/711 on main, 680/717 with the patches; 20 red and 17 NOT RUN HERE on each.** The red lists differ in two names only:
- `an effect that changes nothing on this layer is detected… Channel Remap` (queue 477) was red on main and green on the patched tree. It is timing-sensitive; I did not chase it.
- **`1095 the effect scratch pools shrink…` (H19's own test) went red on the patched tree, and that is a bug in the H19 test, not in this patch:** its control asks the pool to grow by 12 from wherever it started (`poolLen() < base + 12`), but after earlier tests have trimmed the pool to its floor of 2 a 12-deep stack makes 12 entries, not 14. Reproduced without any patch of mine by a prelude test that draws and waits 7.5 s: red with H19's test as I shipped it, green with the control changed to `poolLen() < 12`. **`2-pool-idle-release.patch` carries that one-line fix to the H19 test.** The other 18 reds are the same on both trees: 9 `NO_VIDEO_CODEC`, 8 `Failed to execute 'encode' on 'VideoEncoder'` (this container has no H.264 encoder), and `47 — a resumed export says so…`, `482 2.6 Motion Blur (Object)…`, all export-encoder or timing tests (I did not check each of the last two further).

## Estimates per hour of phone editing (Guess, from the measured sizes)
| item | per event (Measured) | events per hour (Guess) | per hour |
|---|---|---|---|
| sample tiles | ~7 MB per category browsed, no cap | 4 to 12 categories | 28 to 83 MB, never released |
| scratch pools | up to 190 MB after an export, 45 MB idle | 1 to 3 exports | peak 190 MB, the idle floor stays |
| motion-flow plates | 8.3 MB per layer per export | 1 to 3 exports x 1 to 4 such layers | 8 to 100 MB |
| decoded sound | 88 MB per four-minute stereo song | 1 to 3 exports x 1 to 3 songs | 88 to 264 MB (the same songs are decoded once per record, so it does not multiply by exports) |
| kept undo files | not measured | rare | unknown |

---

# H43: the 11 scratch pools H40 patch 2 does not cover (7 Oct, main 2e3fd7a9, instrumented copy, Chromium in this container)

Pools: `_pmPool` (compositor.js:3355), `_mbPool` (:3507), `_fcPool` (:4492), `_sqPool` (:9574), `_t3Pool` (:11859), `_dfPool` (:14605), `_miPool` (:14923), `_pxPool` (:15007), `_fbPool` (:16680), `_olPool` (:17089), `_adjFcPool` (:17947). Size is the canvas pixels each pool holds (width x height x 4, read from the canvases themselves through the `FM.__audit` getters of H40; units are MB = 10^6 bytes, a 1080 x 1920 canvas is 8.3 MB).

## The session (Measured)
Scripts: `pool-audit-scripts/h43_session.js`, `h43_trig.js` (driven through the walk harness at 380 x 760, DPR 1, project 1080 x 1920). Three stages, bytes read after each:
- **A, browsing:** all 205 effects, one at a time on an image layer, each drawn at five playhead times in the preview (the effects browser's own thumbnails are `_ckCanvases`/`_lkCanvases`, a flat 8.6 MB here, H40's).
- **B, editing:** the seven things that reach the other pools put on screen together: a pen mask, Motion Blur (Object) on a moving layer, Backfill on a layer smaller than the frame, a Filter box at 50% strength, 3D tilt, an outline on a layer at 60% opacity, an Adjustment layer carrying a Filter box; eight frames drawn.
- **C, one export:** a 0.6 s GIF at 1080 x 1920 with all of that in the scene, then 40 s idle (**identical to the byte**: nothing in these pools ever shrinks by itself).
This is about four minutes of scripted use, not ten of wall clock. I did not run it longer because these pools are bounded by canvas size and nesting depth, not by time: the 40 s idle and a second pass change nothing (Measured). The preview is the 380 px stage at DPR 1; a phone at DPR 3 draws larger preview plates, **not measured**.

| pool | what fills it | A browsing | B editing | C after export (and 40 s idle) |
|---|---|---|---|---|
| `_adjFcPool` | Adjustment layer with a Filter box at strength between 0 and 1: 2 canvases per nesting level | 2.0 MB | 2.4 MB | **33.2 MB** (2 levels x 2 x 8.3) |
| `_fcPool` | Filter box at strength between 0 and 1 on a layer: 3 canvases per level | 1.5 MB | 1.8 MB | **24.9 MB** (3 x 8.3) |
| `_mbPool` | Motion Blur (Object): a plate padded by the travel + the accumulator | 1.0 MB | 1.0 MB | 17.9 MB with a fast mover (plate 1184 x 2024 + 1080 x 1920); 1.0 MB with the slow mover of the main session (re-run on its own) |
| `_pmPool` | a mask or matte: plate + stencil at the **project's** size, even in the preview | 0 | 16.6 MB | 16.6 MB |
| `_t3Pool` | 3D tilt: 2 canvases at the plate size | 0 | 1.2 MB | 16.6 MB |
| `_fbPool` | Backfill: 3 canvases (A full size, B and C reduced) | 0.7 MB | 0.7 MB | 9.6 MB |
| `_pxPool` | Pixelate A + small S | 8.4 MB | 8.4 MB | 8.4 MB |
| `_olPool` | outline/pill unit at opacity below 1 | 0.5 MB | 0.6 MB | 8.3 MB |
| `_sqPool` | Squish | 0.8 MB | 0.8 MB | 0.8 MB |
| `_miPool` | Mirror | 0.6 MB | 0.6 MB | 0.6 MB |
| `_dfPool` | Defocus **without** `ctx.filter` | 0 | 0 | 0 (see below) |
| **11 pools together** | | **15.5 MB** | **34.1 MB** | **136.8 MB** (with the fast mover; 120.0 without) |

(Arithmetic for the sums and the 24.2 MB below done in Python, not by hand.)

**Reading it.** Everything is back to one frame's worth of canvases the moment the next preview frame resizes each used entry, and nothing is held when a pool is not entered; but a pool entry that nothing uses again stays at export size for the rest of the session. That is the same shape as the five pools H40 patch 2 trims. Over the 20 MB bar: **`_adjFcPool` (33.2 MB) and `_fcPool` (24.9 MB)**. Not over, listed: `_mbPool` 17.9 MB measured (**arithmetic: 24.2 MB per nesting level at the travel cap of a quarter of the frame**, so a very fast mover would cross the bar; I did not patch it because I could not reach that size), `_pmPool` 16.6 MB, `_t3Pool` 16.6 MB, the rest under 10 MB. `_dfPool` (**Read**: compositor.js:14628, :17354) is entered only where `ctx.filter` does not work, which this Chromium never does, so it measured 0; on such a device it is one full-size canvas per nesting level up to 7 deep (**arithmetic: 8.3 MB each, 55 MB at the cap**) and the 1095 trim would need to learn it too. I did not force the path (`FM._forceNoCtxFilter`) to measure it, so that line is a Guess about a device I cannot run.

**Two things I did not expect.** (1) `_pmPool` is project-size in the preview too (16.6 MB the moment a masked layer is on screen), because the stencil is built at W x H of the project (compositor.js:3403, :3487); every other pool follows the preview scale. It is a candidate for the same plate-scale fix those pools got, but it is 16.6 MB, under the bar, so I left it. (2) The effects loop (A) does not grow these pools at all past 15.5 MB, so "browsing effects" is not what holds the memory here; the one export is.

## The patch for the two over the bar: `pool-audit-patches/6-filter-container-plates.patch` (applies on top of H19's two patches and H40 patch 2) + `6-test.patch`
- Cause (**Verified**): `_trimScratch` (compositor.js ~18560, H19 + patch 2) names `_pfPool`, `_wpPool`, `_cfPool`, `_mgPool`, `_expPool`, `_dspPool`; `_fcPool` and `_adjFcPool` are not in it. Acquire sites traced: `_fcPool` is read and written only in `drawFilterContainer` (:4521, :4532); `_adjFcPool` only in `adjFilterPlate` (:17990, and its two recursive calls :18006, :18007), and both already resize on use (`if (P[k].width !== W ...)`), which is what makes releasing an entry safe.
- Change: `_hw` gets `fc` and `adj` (the deepest level used since the last trim, set at the two acquire lines), `_trimScratch` calls the existing `_trimPool` on both, `_fcDepth` joins the "never mid-render" guard, `_poolStats` reports both, and the re-arm line in `_scheduleTrim` knows them. 8 lines of code, no new mechanism.
- Test: `H43 the Filter-container plates are released when nothing uses them, after a full-size frame`: draws a Filter box and an Adjustment layer with one at 1080 x 1920, CONTROL that both pools filled (3 and 2 plates of 1080 x 1920), draws a thumbnail-size frame without any, waits two trim windows, asks the pixels left, and finally draws again at 540 x 960 to prove the plates come back. **Red on the code without the trim (only the stats seam added): "the Filter-container pool still holds 6220800 pixels (24 MB): the trim does not reach it"; green with it, at 1280 and 380.**
- Cost: a Filter box redrawn after 6 s of nothing re-creates its plates once (one `width =` per canvas); a box that is used every window keeps its plates.
- Neighbours: the tests whose names hold `container`, `filter box` or `adjustment` (16, the Filter box and Adjustment layer render tests) are **16/16 at 1280 and at 380** with H19 + patch 2 + this patch (**Measured**); the 1095, H40 and H43 tests are 3/3 at both widths.

# H44: what `_prevFiles` costs in RAM (7 Oct, same instrumented copy)

`_prevFiles` is `storage.js:683`; `stashPrevMedia` (:703) fills it, from `app.js:4648`, `:4753` (Replace media) and `collab-media.js:559`; `takePrevMedia` (:728) also puts what it read back. H40 patch 5 empties it for clips that left the scene and every snapshot; it does nothing for a clip that is still in the project.

## Method (Measured)
Scripts `pool-audit-scripts/h44_page.js`, `h44_run.py`, `h44_lib.py`; raw numbers `pool-audit-data/h44-*.json`. A 380 x 760 touch page, project 1080 x 1920. **20 clips of 10.3 MB** (a real 768 KB WebM padded with random bytes: the app reads the first segment; the padding makes it phone-size), imported with `FM.loadVideoFile` + `FM.addMediaLayer` and saved; **30 replaces** through the app's own sequence (`stashPrevMedia`, `replaceMediaWith`, `mediaRev`, `history.commit`, save, library entry, copied from app.js:4750-4780); **6 undos and 6 redos**; a second project; **5 project switches**; then the **control: `_prevFiles.clear()`** and 4 s. Every number is JS heap after a forced collection, and resident memory (RSS) of the browser process and the page process, summed from `ps` for that browser only. Every Replace and import makes a brand new File and nothing else keeps a reference to it, so what the control frees is exactly what `_prevFiles` was keeping alive.

Two kinds of File, because they cost differently and the phone makes both:
- **Memory-backed** (`new File([bytes])`: what a camera or recorder blob, a song's WAV from `audioFromVideo`, or media a peer sent is).
- **Disk-backed** (an OPFS file handle's `getFile()`, which behaves like a picker file: the bytes live on disk and the File is a handle).

## Result
`_prevFiles` after the run: **20 layers, 36 files, 369.7 MB of file size** (30 replaces + 6 from undo and redo), unchanged by the five project switches (it is keyed by layer id and nothing leaves it).

| | JS heap | browser process | page process | total, all processes |
|---|---|---|---|---|
| memory-backed, after the 5 switches | 4.1 MB | **446.4 MB** | 890.4 MB | 1790.7 MB |
| memory-backed, after `_prevFiles.clear()` | 4.1 MB | **192.6 MB** | 875.7 MB | 1510.8 MB |
| **memory-backed cost of `_prevFiles`** | 0 | **253.8 MB** (0.69 of the 369.7 MB it names) | 15 MB (noise) | **about 280 MB** |
| disk-backed, after the 5 switches | 4.1 MB | 196.1 MB | 886.5 MB | 1538.7 MB |
| disk-backed, after `.clear()` | 4.1 MB | 196.2 MB | 873.1 MB | 1515.3 MB |
| **disk-backed cost of `_prevFiles`** | 0 | **0.1 MB** | 13 MB (inside the page's own +-90 MB wobble between switches) | **about 0** |

(For scale: the page process is 354 MB at boot and 700 to 1000 MB with 20 video clips loaded; that is the media registry's video elements, not `_prevFiles`, and is a different item.)

## Does it need a cap? No cap, but yes a fix: hold the File weakly
- **Read (storage.js:703-740)**: nothing ever reads a File back out of the map. The two questions put to it are "is a file kept at this revision" (`hasPrevMedia`, :740, only the key) and "is this the very object already kept" (`stashPrevMedia`, :707, an identity check that saves a second write); `takePrevMedia` reads the disk record. So the strong reference buys nothing and costs the whole file when it was built in memory.
- **A count cap would be the wrong fix.** It would evict revisions the undo still needs the key for, and it would not shrink a single 200 MB clip. The cost is RAM for memory-backed files only (about 0.7 of their size here), and zero for picker files, so on an iPhone's normal path (pick from Photos or Files) it is already free; it bites for recorded, converted, generated and received media.
- **The fix** (`pool-audit-patches/7-prevfiles-weak.patch`, 3 lines + a `weakFile` helper, with a fallback to a strong reference where `WeakRef` does not exist): the map holds `WeakRef`s. `hasPrevMedia` is unchanged; the identity check becomes `held.deref() === rec.file`, which is still true for as long as anything holds the file (the clip it restores, the registry), exactly when the check can matter.
- **Test** (`7-test.patch`): `H44 the file kept for undo of a replaced clip is not held alive by the record that it is kept`: stash a 2 MB File, drop it, ask the driver for a real collection (the `__fmWantGc` seam), assert the `WeakRef` is cleared and `hasPrevMedia` still says the revision is kept; CONTROL: right after the stash the file is alive and kept. **Red on main ("the 2 MB file put away for undo is still alive after a collection: the keeping record holds it"), green patched.** Under `tests/_cdp.py` only (the same limit as the other collection tests).
- **The saving, Measured on the patched copy** (`pool-audit-data/h44-memory-backed-patched.json`; same 20-clip, 30-replace, 6 undo/redo, 5-switch run, the patch applied by hand to the instrumented copy): the 36 keys are still there, **0 MB of files are alive** after the first project switch, and the browser process sits at **193.8 MB after the five switches against 446.4 MB unpatched** (total of all processes 1532.3 MB against 1790.7 MB: **259 MB saved**). The unpatched run reproduced: a second repeat gave 448.0 MB before and 193.5 MB after `.clear()`.
- Neighbours: the 139 tests whose names hold `H44`, `stash`, `replace` or `prev` are **130/139 at 1280 and 130/139 at 380** with the patch, and 128/138 and 129/138 on the same tree without it; the red names are the same on both trees (this container has no H.264 or AAC, so `NO_VIDEO_CODEC` and a closed `VideoEncoder` account for most; plus `a zoomed preview re-measures…` and `482 2.6 Motion Blur (Object)…`), and the one extra red on the unpatched 1280 run (`preset previews: the CACHE follows the layer…`) is the flaky one H42 found. **Measured.**
