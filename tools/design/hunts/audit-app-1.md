# AU9: audit of js/app.js, first third: lines 1 to 3050 of 9,151 (main fba44ca8)

Branch `hunt/audit-app-1`. **Measured** = I ran it here (headless Chromium, 1280 and 380), **Read** = I read the code, **Guess** = I did not check. The thirds are by line count: **AU9 = 1 to 3050, AU10 = 3051 to 6100, AU11 = 6101 to 9151.**

**Bottom line, honestly.** This third is the preview, the transport clock and the media sync, plus the first document helpers (insert layer, import media). It is heavily hardened by earlier hunts, and the one defect I could show is small: **one LOW fix, proven.** I did not read the middle of it (the playback tick and the media-to-clock sync) closely enough to say anything about it.

## Fixed (LOW), red on main and green with the fix at 1280 and 380, three mutations CAUGHT

| # | Where | What happens | Repro | Fix |
|---|---|---|---|---|
| AU9-1 | `FM.setTime` and `FM.scrubTime` (`app.js:1718`, `1750`) | **A time that is not a number makes the playhead NaN.** `Math.max(0, Math.min(duration, t))` is NaN for NaN, so `setTime(NaN)`, `setTime(undefined)` or a 0/0 from a zero-width lane set `FM.time` to NaN, and every render, readout and clip lookup after it reads a NaN time until something else moves the playhead (Measured: `FM.time` came back `null` in JSON, NaN in the page). There are 22 callers; the ones that take their number from outside the editor are the remote playhead and comment times in collab (`collab-presence.js:1124`, `1343`, `collab-comments.js:513`) and the AI ops (`ai-ops.js:483`). I did not show any of them sending a bad value (**Guess**: it needs a peer or an op with no time), so this is a robustness fix, not a report of something he has seen. | `AU9-1` (controls: ordinary values, both clamps, and Infinity clamp to the end) | a non-number leaves the playhead where it is (and a playhead that is already NaN goes to 0) |

Mutations (all CAUGHT, `au9_mut.log`): `setTime` unguarded (A1), `scrubTime` unguarded (A2), Infinity rejected as well (A3, caught by the clamp control). Busters bumped: `app.js?v=469`.

`audit-app-1-scripts/`: `au9-tests.js` (append before `async function run()`; `?only=AU9`), `au9-fixes.patch`, `au9_mut.sh`, `au9_mut.log`.

## Tried and held up (Measured)

- **Edit Group and the one insert:** delete the group while inside it, then add a shape: the context is cleared and the new layer has no dangling parent. Undo the group's creation while inside it: same.
- **Extreme canvas sizes through `resizeCanvas` (1x1, 1x10000, 10000x1, 16384x16384, 7680x4320 and others):** the preview canvas stays finite, at least 1 pixel and under 64 megapixels, no throw.
- **`fitProjectSize`:** the 12-megapixel phone still is capped to 2160x2880, a zero or NaN size becomes 2x2 (no throw).
- **`setTime` clamps:** below 0 and above the end, as designed.
- **Read:** `addMediaLayer` (3034 to 3130): a clip whose reported duration is Infinity is handled upstream (`media.js:165, 175, 214` force a finite one), so `Math.max(0.1, rec.duration || 5)` cannot produce an infinite project; a size of 0 gives a scale of 1. `autoFitDuration` (908 to 933) clears a loop region that the new end has made stale. `mediaSyncPlan` (1905) is a pure decision function: NaN input falls to "hold", rates are clamped to 0.0625 to 16.

## What I read, and how closely

Line by line: `autoFitDuration`, `toggleMarkerAtPlayhead`, `setThumbnailFrame`, `timelineSnapPoints`, `frameCacheLimits`, `setTime`, `scrubTime` (908 to 933, 1594 to 1790), the sync constants and `mediaSyncPlan` (1862 to 1950), `wrapTo` (2137 to 2182), `defaultLayerDuration`, the add-marker helpers, `insertLayer`, the oversize helpers and `addMediaLayer` (2792 to 3140).

**Not read, no claim either way:** the render-quality ladder (`noteMotion`, `playQualityFactor`, `notePlaybackCost`, `maybeOfferPerfProbe`, 167 to 555), `previewScale` / `previewCrop` / `resizeCanvas` beyond the size fuzz above (555 to 720), the clapper and drop hint (818 to 884), `refreshAll` and `syncSelectionChrome` (934 to 1040), the layer helpers (1039 to 1140: fit, extract audio, convert to outline, clipping mask), `syncTopBar`, `seekVideosToTime` and the stale-shell notice (1139 to 1392), `toast`, `reportError` and the job watchdog (1393 to 1590), `syncMediaToClock` (2187 to 2440), `play` past its first lines, `pause`, `requestPlay` and the review-play helpers (2510 to 2790).

**Read in a second pass, no defect found:** the transport clock (`clockAnchor`, `clockDemote`, `clockAdopt`, `clockNow`, 1796 to 1860: a stalled audio clock demotes to the wall clock without a jump) and `tick` (2447 to 2508: the loop wrap target is guarded, an empty timeline falls through to pause). One observation, not a finding: `tick` reads the clock into `nt` and compares it to the end with `>=`, so a NaN `nt` (from a NaN anchor or preview rate) would skip every branch and set `FM.time` to NaN each frame; nothing I found can produce one, and AU9-1 closes the door `setTime` left open.
