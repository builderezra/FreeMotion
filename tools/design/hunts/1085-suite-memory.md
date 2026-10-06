# #1085: why the test suite uses so much memory

Against `origin/main` b46b47d (v17.23). Report only: no app, test or tool code changed.
**Measured** = read from a real run. **Read** = I read the line. **Guess** = I could not check it.

## 0. The honest headline

**I could not reproduce 8.7 GB.** I ran the full suite (`tests/run.html`, headless Chromium on Linux, through a copy of `tests/_cdp.py`) and sampled every 15 s: renderer RSS **372 MB at the lowest, 1085 MB at the peak**, all browser processes together **2.23 GB at the peak**, GPU process 228 MB at most. The renderer's *virtual* size is 1.4 TB, so any "reserved" figure is meaningless unless it is the same metric you used. If the 8.7 GB came from a different measure (Chrome task manager "memory footprint", a Mac, a headed browser, `--width 380`), I need to know which, because the suite itself does not need that much.

**The run is partial:** it covers tests 0 to about 1924 of 2287 (84%). At test 1924 (`690 the easing curve of an effect inside a filter…`, `tests/tests.js:97902`, budget 90 s) the driver's progress file stopped updating and I waited 26 minutes with flat memory (948 MB) before killing it. Whether that hang is the suite or my patched driver I do not know (**guess**: harness, since the page was not busy). The last 363 tests are unmeasured.

## 1. What the curve looks like (measured; 15 s samples; test position is approximate)

- **Sawtooth, not a ramp.** Memory climbs during heavy tests and falls again a few samples later. Biggest rises and the falls that follow:

| Rise | Test (line) | Followed by |
|---|---|---|
| +525 MB | `709: every sound effect renders the same twice` (`tests/tests.js:5584`) | -566 MB at `538: tapping the canvas pauses` (`:7341`) |
| +412 MB | `voice: a long take stops itself at the cap` (`:24419`) | -449 MB, one sample later |
| +273 and +204 MB | `921 S8 adversarial peer fuzz` (`:39910`) | -622 MB at `921 S8 Settings → Labs → Test connection` (`:40823`) |
| +163 MB | `674: an uncaught error and an unhandled rejection…` (`:83558`) | -259 MB at `907` (`:84791`) |

- **A slow floor.** The lowest reading per 200 tests: 372, 431, 388, 399, then 612, 753, 791, 572, 633, 682 MB. So the baseline roughly stepped from about 400 to about 650 MB around tests 700 to 1000 and then wobbled. That is **about 250-300 MB of memory that never came back** in 1900 tests. This is the only thing that looks like a leak.

Total across the run: the swings (500 MB) are bigger than the creep (300 MB), and neither gets near 8 GB on this machine.

## 2. Ranked suspects

| # | Suspect | Where | Size | Evidence | Real users? |
|---|---|---|---|---|---|
| 1 | **Compositor scratch canvases and `_fxScratch` only grow, never shrink** | pools and singletons, `js/compositor.js` (for example `:3355`, `:10165`, `:16680`, `:18411`), `_fxScratch` `:4690-4694`; no `.width = 0` anywhere in `js/` | the 250-300 MB floor step (**guess** on attribution: I did not isolate it per test) | Read: pools only resize on next use. Measured: the floor stepped up and stayed. Detail in `app-memory.md` §2 (branch `hunt/app-memory`) | **Yes.** Every editing session |
| 2 | **Heavy tests hold large buffers until GC catches up** | `709` renders every sound effect through an `OfflineAudioContext` and keeps `getChannelData(0)` (`:5584-5600`); `voice` long take records and decodes PCM (`:24419`); `921 S8` runs three extra app iframes plus a minute of hostile traffic (`:39910`, trio `window.__collabTrio` `:32055`, torn down by `rig921().teardown()` `:32369`) | 400-525 MB transient each | Measured spikes, and every one fell back. They are **GC latency, not leaks** | No (test-only) |
| 3 | **One app iframe, no per-test teardown, 9.4 MB of test source held in memory** | `tests/run.html` injects `tests.js` once; `run()` at `tests/tests.js:59540` only clears gestures and layer leaks between tests | the baseline of about 400 MB | Read | No |
| 4 | **`AudioContext` never closed in the suite** | 10 `new AudioContext` with no `.close()` within 60 lines: `:6958`, `:10580`, `:26610`, `:65520`, `:65589`, `:66027`, `:66096`, `:66173`, `:71569`, `:95520` | small each, but Chrome keeps an audio thread per live context (**guess** on size) | Read | No |
| 5 | **`createImageBitmap` without `.close()`** | `pngCtx690` `:88796`, `colourAt` `:91241` | small (one bitmap per call) | Read | No |
| 6 | **Real `createObjectURL` never revoked** | `:80447`, `:90993`, `:98867` | KB (tiny blobs) | Read | No |
| 7 | **Autosave thumbnail renders at full project size** | `js/storage.js:2133-2162`, triggered at `:2468` | 11.2 MB of canvas per capture at 1080×1920 | Read; sizes from `app-memory.md` §1 | **Yes** (biggest) |

What I looked at and did **not** find: stray `<video>` elements in tests (none kept), Workers (the repo has none), uncleared timers in a way that shows in memory, projects left in IndexedDB (not measured, **guess**: small), large canvases in test bodies (about 441 canvas creations in tests, nearly all 300×240 or smaller; the 3468×3468 and 3024×4032 project tests only set dimensions, no render).

## 3. Smallest fix per suspect

1. **Add one `FM.compositor.releaseScratch()`** that sets `width = height = 0` on every pool and drops `_fxScratch`, and call it (a) between suite groups (b) from the export `finally` (`js/exporter.js` ~`:1629-1646`) and on project switch. Helps tests and real users. Test: after the call, `_fxScratchInfo()` (`js/compositor.js:4696`) reports 0.
2. **Test-side:** call the existing GC seam (`__fmWantGc`, `tests/_cdp.py:365-388`) after the three spiking tests and after each `921` group; in test 709, render the recipes one by one and drop the buffer reference before the next. No app change.
3. **Do not fix** the iframe design; it is the suite's whole speed. Instead drop the extra copy of the 9.4 MB source after injection (**guess**: saves tens of MB at most, not worth the risk).
4. **Test-side:** `ctx.close()` in a `finally` after each of the 10 contexts, or use `new AudioBuffer(...)` where no context is needed (the PM's own note for the pile does the same).
5. **Test-side:** `bmp.close()` in `pngCtx690` and `colourAt`.
6. Revoke in the tests' `finally`. Low value.
7. **App-side, and the one that matters to users:** render the thumbnail at 360 px instead of project size (`js/storage.js:2140`), and zero the temporary canvases.

## 4. Proposed guard so it cannot creep back

Structural, in the spirit of CLAUDE.md. `tests/_cdp.py` already answers `__fmWantGc` with heap, node and listener counts, but `JSHeapUsedSize` **misses canvas and typed-array memory**, which is where every finding above lives. So measure the process:

1. Every 50 tests the driver asks the page to force GC, then reads the renderer's RSS (pid from `SystemInfo.getProcessInfo`; Linux `/proc/<pid>/status` VmRSS, Mac `ps -o rss= -p <pid>`) and appends `{index, test name, rss}` to a file.
2. **Name the culprit:** when RSS after GC rises more than 100 MB over the previous reading, print that window's test names, then bisect with the existing `?after=&upto=` slice (documented in CLAUDE.md).
3. **Fail the run** (like the 45 s per-test budget) if the post-GC floor rises more than 150 MB over any 500-test span, or the peak exceeds a ceiling stored beside `tools/.suite-seconds` (measured peak plus 50%; today that would be about 1.6 GB renderer). `ship.sh` already refuses on a red suite, so a creeping suite becomes a refused ship.
4. Print the peak and floor in the suite summary, so he can read it and the number is no longer "it rebooted my Mac".
My sampler (a 40-line Python loop over `ps -o rss=` keyed on the progress file) worked as a prototype; the driver version needs no new dependency.

## 5. Verified vs guess

Verified (measured): the RSS curve through test about 1924, the peaks, the three spike-and-fall pairs, the 250-300 MB floor step. Verified (read): every `file:line` above. **Guess:** which exact test or app cache caused the floor step (suspect 1 is the likeliest, not proven), whether the same suite on his 8 GB Mac behaves differently (macOS counts compressed and swapped pages differently, and a headed Chrome keeps more), what the 8.7 GB figure measured, and whether the hang at test 1924 is real. **Most valuable next step:** run the guard's sampler on his Mac for one pass and send the file; that settles the 8.7 GB question.
