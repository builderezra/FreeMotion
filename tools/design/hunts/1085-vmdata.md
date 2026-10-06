# H12: #1085 measured properly, VmData per test while running the whole suite

Against `origin/main` b46b47d3 (v17.23). Nothing in the app, the tests or the tools was changed. Measured by me, in my own container (4 vCPU, 16 GB, headless Chromium 1194, `--no-sandbox`, software GL).

## What Ezra asked, and the short answer

**Question:** does one renderer of the test page reach the 8 GiB VmData limit that Linux Chrome enforces, and which tests are responsible?

**Answer, measured:** in one continuous run of the whole suite the app's renderer went from **915 MB to a peak of 6125 MB VmData** (the floor after a forced garbage collection went 826 to 5782 MB, and it was still climbing at the end). **That is 1.9 GB (24%) under 8 GiB.** Resident memory (RSS) peaked at only **1627 MB** (floor 266 to 670 MB), so the pressure is address space the allocator keeps, not memory in use. Five steps account for 3.6 of the 4.9 GB of growth, and two of them are tests that really allocate (Reverb, 1080x1920 kernel plates) while the biggest is a threshold a warm process crosses.

This corrects my earlier H1 ("could not reproduce 8.7 GB"), which sampled RSS and a partial run. See the corrections block in `hunt/1085-suite-memory`.

## What was run (Verified)

- **Pass F, the continuous run:** every test in suite order in one page, 2288 test starts, 3312 s, with the 0.25 s sampler reading `VmData`, `VmRSS` and `VmSize` from `/proc/<pid>/status` for every renderer, and a forced `HeapProfiler.collectGarbage` every 25 test transitions (53 samples). Test starts are exact: the driver installs a setter on `window.__fmLastTest`, which `tests/tests.js:59576` writes at every test start, and logs the epoch time of each write.
- **Three tests were patched to return immediately in a scratch copy of the tests** (`:97997`, `:98071`, `:98167`). They run a real MP4 export through WebCodecs and hang the page in my container for 10 minutes. On a machine with working H.264 they will run and add some memory I could not measure.
- The sampler follows the renderer with the largest VmData. The collab tests also start frames on `h.`/`a.`/`b.localhost`; those get their own renderers, which sat at about 590 MB each and never grew (each has its own limit).
- Supporting runs: pass A (tests 1 to 1926) and pass C (1928 to 2287, started in a fresh Chrome), and cold isolation slices of single tests.

## The staircase (Verified)

VmData of the app renderer after a forced GC, with the tests that ran between the two samples:

| time (s) | VmData (MB) | RSS (MB) | step | tests in between |
|---|---|---|---|---|
| 20 | 826 | 266 | | start |
| 90 to 125 | 953 to 1303 | 297 to 314 | +350 | `:7341` to `:11475` |
| 178 to 220 | 1472 to 2841 | 354 to 396 | **+1369** | `:22755` to `:26665`, the Squish sweep at `:25574` |
| 950 to 976 | 3275 to 4222 | 438 to 571 | **+947** | `:46598` to `:49896`, Reverb at `:47436` |
| 1623 to 1658 | 4687 to 5079 | 539 to 603 | +392 | `:80547` to `:83259`, kernel plates (`:82443`, `:82649`, `:83769`) |
| 3161 to 3242 | 5392 to 5745 | 667 | +353 | `:113313` to `:116782`, the 482 panel-fit tests |
| 3291 | 5782 | 670 | | last forced GC |

The peak, 6125 MB, was at 3307 s in `:119625`. **The last 80 seconds added about 240 MB**, so the curve is steepening at the end, and the 482 polish batches add tests of that kind every release.

## What the VmData is made of (Verified, one live renderer at 4.95 GB)

Read from `/proc/<pid>/maps` of the renderer from the first, stalled run: 4319 MB in private writable anonymous maps, split into 4703 maps. **1966 of them are exactly 1 MB and 2674 are smaller; only 36 are 8 MB (thread stacks) and the brk heap is 512 MB.** So this is thousands of small allocator regions, not a few giant buffers. That fits "address space the allocator holds on to" and not a leak of live objects.

## Micro-tests in a clean page (Verified, same Chromium)

| what | VmData | RSS |
|---|---|---|
| 1 WebGL context, then 3 more | +4 MB, +0 MB | no change |
| 1 OfflineAudioContext, 4 s, with a 6 s convolver | **+68 MB** | +42 MB |
| 6 more OfflineAudioContexts | **+367 MB** (61 each) | +244 MB |
| 20 x 1080x1920 `Uint8ClampedArray`, dropped | **+128 MB kept** | -119 MB |
| 20 x 1080x1920 canvases, dropped | +0 MB | +0 MB |

The WebGL line matters: I expected software GL to be the big one and it is not (**refuted**). Audio rendering and big typed arrays are.

## The 20 tests that keep the most VmData (from pass F)

"Kept" is the smallest VmData in the next 120 s minus the level just before the step, so a step the process gave back does not count. "Cold" is the same test run alone in a fresh Chrome.

| # | kept (MB) | rise (MB) | where | test | cold | what it allocates |
|---|---|---|---|---|---|---|
| 1 | 1294 | 1568 | `tests/tests.js:25574` | effects: Squish is continuous — a layer swept across a wall one pixel at a time neve | 0 to +15 (9-test Squish group) | 20 wall/inset sweeps (`:25579-25596`) each render the layer one pixel at a time; every step is `sq480()` (`:25432-25440`), a 480x480 render plus `getImageData(0,0,480,480)`, 0.92 MB of ImageData per step, thousands of steps. Same churn pattern as my 20 x 8.3 MB ImageData micro-test (+128 MB VmData kept while RSS fell back). Cold it does NOT reproduce, so this one is a threshold that a warm process crosses. |
| 2 | 914 | 890 | `tests/tests.js:47436` | audio: a keyframed Reverb sweeps the room, and only builds one where the move actual | +268 | Renders animated Reverb through `OfflineAudioContext` (4 to 12 s at 48 kHz, `:47440-47470`); an animated room builds up to 6 rooms (`js/audio-fx.js:640-662`, `impulse()` buffers cached in `_irCache`, `:126-138`). Micro-test: about 61-68 MB VmData per OfflineAudioContext render, kept. |
| 3 | 138 | 304 | `tests/tests.js:119625` | 482 6.5 to 6.7 the new Lens Flare, Streaks and Glow Scan rows fit the effect panel a | +30 (kept +14) | 482 panel-fit test: opens the effect panel at 390 and 1280 px (`atPhoneWidth` `:45`, `atWideWidth` `:70`). Cold it adds only about 30 MB. |
| 4 | 108 | 1784 | `tests/tests.js:83769` | 692: every crop-admitted bounded kernel renders identically with the cropped readbac | +218 then falls back | Crop-admitted kernel sweep: renders every bounded kernel cropped and whole on 1080x1920 plates. Reproduces cold (+218 peak). |
| 5 | 105 | 105 | `tests/tests.js:82443` | effects: Tilt Shift and Matte Choker bound to the layer without changing it | +105 | Builds dirty `mk()` fixtures as `Uint8ClampedArray(W*H*4)` and runs Tilt Shift and Matte Choker on them. Reproduces cold (+105). |
| 6 | 101 | 90 | `tests/tests.js:82649` | effects: every bounded kernel is safe on the box the RENDERER actually computes | +10 | Bounded-kernel safety sweep (loops of 80 and 90 renders). Cold +10: the rest is what the process already held. |
| 7 | 85 | 85 | `tests/tests.js:8432` | 539: a layer squashed into a CORNER actually flattens, and one with room to bulge is | 0 | Squash-in-corner render sweep. Does not reproduce cold: a trigger, not a cause. |
| 8 | 63 | 180 | `tests/tests.js:115176` | 482 2.5 Speed Lines - Clear zone shape is greyed out while Clear zone is 0, where it | +18 | 482 panel-fit test, same family as 119625. Cold +18. |
| 9 | 61 | 77 | `tests/tests.js:61605` | the Add-layer + is centred in its circle, and is not a font glyph | 0 | Add-layer + glyph test. Cold 0. |
| 10 | 52 | 52 | `tests/tests.js:66246` | 916.8 exporting a short range builds only that stretch of each clip’s audio — and th | 0 | Audio for a short export range, built through an OfflineAudioContext. Cold run was 0.2 s, so the slice may have returned early: not confirmed. |
| 11 | 45 | 45 | `tests/tests.js:11475` | clipboard: paste reproduces the layer exactly, and independently | 0 | Clipboard paste. Cold 0: a trigger. |
| 12 | 39 | 39 | `tests/tests.js:114622` | 482 2.0 Motion panel - the new controls fit the effect panel at 390 and 1280 px, and | 0 | Not read. A small step: treat the attribution as plus or minus one test. |
| 13 | 35 | 35 | `tests/tests.js:7892` | 562: every sound effect actually makes a sound when previewed | 0 | Not read. A small step: treat the attribution as plus or minus one test. |
| 14 | 33 | 33 | `tests/tests.js:11146` | split: cutting an animated TEXT clip does not replay its intro at the cut | 0 | Not read. A small step: treat the attribution as plus or minus one test. |
| 15 | 30 | 67 | `tests/tests.js:18275` | effects: an OPEN effect row can still be dragged to reorder | 0 | Not read. A small step: treat the attribution as plus or minus one test. |
| 16 | 27 | 27 | `tests/tests.js:3265` | shortcuts: only the list scrolls — the Tutorials/Close footer stays put | 0 | Not read. A small step: treat the attribution as plus or minus one test. |
| 17 | 27 | 32 | `tests/tests.js:114164` | 995 Gradient Overlay fades stronger and weaker in the sheet preview, never lands mid | not run alone | Not read. A small step: treat the attribution as plus or minus one test. |
| 18 | 26 | 31 | `tests/tests.js:34018` | 921 S4 a link that dies mid-file resumes from the bytes already kept, and what lands | not run alone | Not read. A small step: treat the attribution as plus or minus one test. |
| 19 | 22 | 40 | `tests/tests.js:114772` | 482 2.1 Wiggle - Pattern gives every value its own motion: Patterns 25 apart do not  | not run alone | Not read. A small step: treat the attribution as plus or minus one test. |
| 20 | 16 | 67 | `tests/tests.js:117278` | 482 5.2 Highlights & Shadows - Local radius keeps pure black black under +50 Shadows | not run alone | Not read. A small step: treat the attribution as plus or minus one test. |

**How far to trust the ranking.** A step is attributed to the test that was running when VmData jumped, which is exact to the test, but a process that is already near a threshold will show the jump in whichever test is running. The cold column is the check: **rows with cold 0 are triggers, not causes** (the Squish sweep, squash-in-corner, clipboard paste). The real allocators are the Reverb tests, the 1080x1920 kernel-plate tests, and the OfflineAudioContext family generally. Below the first five rows the steps are 60 MB or less and the order within the table is not reliable.

## What this means for Ezra's Linux laptop (Guess, and said as one)

- In my container the renderer peaks about **1.9 GB under** the limit. That is a margin, not safety, because (a) mine runs `--no-sandbox`, which does not set the data limit, so nothing could be refused here; (b) three export tests did not run; (c) the peak is at the end of the suite and still rising; (d) a laptop with a GPU moves some memory out of the renderer, which should help and which I could not test.
- **If it does refuse on his machine, the first place to look is the rows above, not a leak:** nothing here shows live objects growing, only allocator regions staying reserved.

## Options, cheapest first (not done; these are builder's calls)

1. **Split the run into two Chromes** at a seam such as `?upto=`/`?after=` around `:47436`. Each renderer would then see about half the staircase (about 4.2 GB at the Reverb step, then a fresh 0.8 GB start). The runner already supports slices (`tests/tests.js:59551-59558`). Cost: a tool change and one more Chrome launch.
2. **Make the audio tests cheaper in address space** (shorter renders or one shared `OfflineAudioContext` factory that drops its reference). I have NOT shown this weakens nothing: the Reverb tail probe needs a long enough render to see the decay, so check that with a mutation before changing it.
3. **Add the sampler to the runner** (read `/proc/self` is not possible from the page, so the driver would do it): print VmData at every forced-GC point and fail the run past 7 GiB, so a growing suite is caught before it is refused. This is a guard, not a fix.

## What I did not do

I did not run on his laptop, with the sandbox on, or with a working H.264 encoder. I did not triage the 87 tests that failed in my container (they need real codecs, display or touch). I did not read the code of the smaller rows in the table.
