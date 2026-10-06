# App memory: what grows in a REAL editing session on a phone

Against `origin/main` b46b47d (v17.23). Report only; no app or test code touched.
**Verified** = I read the line. **Estimate** = arithmetic from verified sizes. **Guess** = depends on browser behaviour I cannot see from the code. I did not measure a real phone: the per-hour numbers are bounds worked out from the code, not readings.

Earlier hunts already fixed real leaks here (e.g. the Filters-tab thumbnail leak, `tests/tests.js` ~91705, "about 530 MB … after 60 refreshes"; the unreachable-media release, `js/storage.js` `releaseUnreachableMedia`, called from `js/history.js:302`). This report lists what is still open.

## 1. The big finding: the 12-second autosave thumbnail renders the whole scene at full project size

`js/storage.js:2468` takes a card thumbnail whenever `now - thumbTimer > 12000 && !FM.playing`, i.e. at most once every 12 s while he is editing. `makeThumb` (`js/storage.js:2133-2162`) does this each time:

1. `src = document.createElement('canvas'); src.width = P.width; src.height = P.height` (`:2140`) — a **full-size** canvas: 8.3 MB at 1080×1920, 33 MB at 4K, 48 MB at the 12 MP project the suite itself treats as normal (`tests/tests.js` ~72536).
2. `FM.renderScene(src.getContext('2d'), …)` (`:2148`) — the whole compositor runs at full size, so every effect scratch canvas it touches is resized to full size (see §2).
3. Then a halving chain of up to 2 more canvases and a 360 px canvas (`:2151-2162`), then `toDataURL`.
4. Nothing sets `width = 0` afterwards. A second thumbnail path, `makeLayerThumb` (`js/storage.js:2215-2216`), has the same project-size canvas. A search of every file in `js/` for `.width = 0` finds no match, so the only way these canvases are freed is garbage collection.

**Estimate:** 300 captures per hour of continuous editing × ~10 MB (1080×1920 + halves) ≈ **3 GB of canvas backing store allocated and dropped per hour**; at 4K about 4× that. Steady-state retention should be near zero if the browser collects promptly. **Guess:** Safari counts canvas memory against a hard total and does not always collect promptly, which is the well-known way "the canvas goes black / the tab reloads" arrives after a long session. This is the highest-value thing to change because it affects every user and happens with no export involved.

*Smallest fix (app-side, real-user value):* render the thumbnail at the reduced size the preview already uses (the compositor takes a render scale from `canvas.width / project.width`, see the note at `js/fx-thumbs.js:24-37`), i.e. `src` at ~360 px wide instead of project size, and `src.width = src.height = 0` on every temporary canvas when done. *Guard:* §5.

## 2. Compositor scratch canvases and buffers are created once and never shrink (verified)

- About 35 depth-indexed pools plus ~60 lazily created singleton canvases in `js/compositor.js` (for example `_pmPool` `:3355`, `_dspPool` `:10165` with five canvases per slot, `_fbPool` `:16680`, `_mgPool` `:18411`; singletons such as `_nbA` `:1978`, `_dnA/_dnB/_dnM` `:12756`). Each is resized to the current plate size on use (`js/compositor.js:10177-10181` is the pattern) and **only** resized again on its next use. There is no release path (§1.4).
- Because §1 renders at full size every 12 s and the preview renders at a reduced size, a pool the user touches is resized **back and forth** between the two sizes (each resize is a reallocation).
- `_fxScratch` (`js/compositor.js:4690-4694`) is a `Uint8ClampedArray` that only grows to the largest frame ever seen: 8.3 MB at 1080×1920, 48 MB at 12 MP, kept for the session.
- `gl-warp.js` and `gl-color.js` each keep one WebGL canvas plus textures resized to the last plate (`js/gl-color.js:292`, `:340`; `js/gl-warp.js:264`, `:312`, ping-pong textures `:217-229`).
- Per nesting level, one canvas of every kind a project has used stays resident. **Estimate:** a project that uses 5 effect families holds roughly 15-20 full-size canvases ≈ **125-170 MB** at 1080×1920 (**~1 GB** at 12 MP) for the rest of the session. A project that uses many families holds more; there is no cap.
- Bounded, so not a leak: motion-flow state `_mflow` is limited to 12 layers (`js/compositor.js:12257-12258`), each with up to two project-size canvases (`:13264`) ⇒ at most ~200 MB at 1080×1920 and only with 13+ layers using it.

*Smallest fix:* one function, called from the export `finally` (`js/exporter.js:1629-1646`) and on project switch, that walks the pools and sets `width = height = 0` (and drops `_fxScratch`). Test: `tests` already has the pattern for this kind of check (`_fxScratchInfo`, `js/compositor.js:4696`).

## 3. Decoded audio and frame caches hang off the media record

| What | Where (verified) | Size (estimate) | Cap? |
|---|---|---|---|
| Full decoded soundtrack of every clip that has been exported, reversed, or used by an audio-reactive effect | `js/exporter.js:562`, `js/app.js:2629`, `js/audio-react.js:45`; freed only by `release` (`js/media.js:60`) | 48 kHz × 2 ch × 4 B = **23 MB per minute of source**. A 20-minute clip ≈ 460 MB; two of them ≈ 0.9 GB, kept until the clip is removed or the project is left. | **None.** One export of a long project is enough to hold all of it. |
| Reverse / frame-blend frame cache | `js/frames.js:163` (budget applies **per cache**), `js/app.js:1687-1699` (budget: up to 384 MB; 160 MB on touch devices) | Up to 160 MB **per clip** on a phone | **No global cap**: three reversed or slow-motion clips can hold ~480 MB. Cleared when the effect is toggled off (`js/app.js:3632`, `:4307`) or the clip is released. |
| Filmstrip canvases | `js/timeline.js:2143-2144`, 32 px high | ≤ 40 canvases | Capped (LRU of 40). Small. |
| Effect-browser tiles | `js/fx-thumbs.js:10-12` (own note: ~72 MB if every effect is opened), `:1492` (layer strips capped at 10 MB) | ≤ ~100 MB | Stock tiles are bounded by the number of effects; layer strips capped. |

*Smallest fix for the audio buffers:* after an export, drop `m.audioBuffer` for clips that are not playing (the preview does not use it: it plays the `<video>` element). Re-decoding on the next export costs one decode. Test: `FM.media` record has no `audioBuffer` after `FM.exporter.run`.
*Smallest fix for the frame caches:* one shared byte budget across records with oldest-first release.

## 4. Checked and bounded (so nobody re-checks them)

| Item | Where | Bound |
|---|---|---|
| Undo history | `js/history.js:298-302` | 120 snapshots **and** 48 000 000 characters (≈ 48-96 MB as JS strings). Discarding a snapshot releases the media only it reached. |
| Audio effect caches | `_irCache` `js/audio-fx.js:126-150` (12 entries), `_crushCache` (≤ 16 depths), `_lfoCache` | Capped. |
| Compositor sample cache | `_sampleCache` `js/compositor.js:2371-2395` | 64 entries. |
| Card thumbnails | `_thumbCache` `js/storage.js:2261`, one ~30-100 KB data URL per project; deleted with the project (`:2263`) | Linear in project count, small. |
| Work-with-friends file transfer | `js/collab-media.js:43` (`PART` 4 MiB), `:975-999` | Received data is flushed to IndexedDB every 4 MiB; RAM holds at most one part per transfer. |
| Autosave writes | `js/storage.js:2468` | Scene JSON goes to `localStorage`, media blobs to IndexedDB, neither held in RAM after the write. The cost is transient garbage, plus §1. |

## 5. A guard so it cannot creep back

1. **Heap + canvas count in the app itself, behind the existing test seam.** The driver already answers `window.__fmWantGc` with `heapMB`, DOM nodes and listeners from `Performance.getMetrics` (`tests/_cdp.py:365-388`). `JSHeapUsedSize` does **not** include canvas backing stores or typed-array buffers, which is where every finding above lives, so also report `Process` RSS (Linux: `/proc/<renderer pid>/status` VmRSS; macOS: `ps -o rss= -p <pid>`; the pid comes from `SystemInfo.getProcessInfo`).
2. **A test with a ceiling:** open a 1080×1920 project with three effect families, make 50 edits spaced to trigger 50 thumbnail captures (the 12 s timer can be stubbed through `thumbTimer`/`forceThumb`), force GC, assert RSS growth under N MB and that no canvas wider than 400 px is created by `makeThumb` (count with the `document.createElement` hook the suite already uses at `tests/tests.js` ~91712).
3. **A cheap live counter for his own phone:** a hidden Settings line "canvases alive / biggest" from a wrapper around `createElement('canvas')`, so a bad session can be reported with a number instead of "it went black".

## 6. What I could not verify

- Real iPhone/Android behaviour of canvas collection (the §1 "guess"). The allocations are verified; whether the browser reclaims them in time is not.
- Whether the Settings line or an RSS reading from a real phone matches the estimates. A 30-minute session on a real phone with the counter from §5.3 would settle it.
