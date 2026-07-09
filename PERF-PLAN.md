# FreeMotion — mobile performance fix plan

Diagnosed 2026-07-09 (multi-agent perf audit). The app is laggy on mobile because of a few
compounding costs. Fixes are ordered best-felt-win-for-least-risk. Verify each at ~380px in the
preview, then ship as a version bump.

## Why it's slow (root causes)
1. **Preview renders at full comp res (1080×1920 ≈ 2.07M px)** regardless of on-screen size — a phone
   only shows ~400px wide (~75k px), so every frame does ~27× more work than needed. This multiplies
   every other cost (effects, blur, shadow, group flatten). `app.js:76-77` sets `canvas.width/height`
   to `P.width/P.height`; on-screen size is CSS-only.
2. **Timeline scrub re-renders synchronously per pointermove** (60–120 Hz) — `timeline.js:869,937,774,674`
   call `FM.setTime` → synchronous `render()` (`app.js:355`), uncoalesced, plus `seekVideosToTime()`
   (video.currentTime write → decode) every event.
3. **CPU per-pixel effects** (`drawPixelEffect` `compositor.js:781-796`, getImageData at :794) run at
   full res every frame and nest (3-effect stack = 3 get/put passes + 3 re-renders/frame).
4. **Group flatten** (`drawGroupUnit` `compositor.js:3010-3033`) allocates 2× full-frame canvases per
   group per frame; `groupNeedsUnit` (:2973-2985) fires on opacity<0.999 or ANY enabled effect — too eager.
5. **Timeline rebuilds on every iOS resize** (address bar / keyboard) — `timeline.js:992` undebounced,
   re-rasterizes up-to-8192px filmstrips per media clip.

## Ship order

### 1. Quick wins (low risk, biggest felt improvement) — do first
- **Fix B — coalesce scrubbing.** Add a scrub variant of `setTime` that sets `FM.time`, updates
  playhead/readout, and calls `FM.requestRender()` (NOT synchronous `render()` at `app.js:355`). Point the
  4 scrub sites (`timeline.js:869,937,774,674`) at it. Throttle `seekVideosToTime()` to pointer-up / ≤1 per
  rAF. (Inspector sliders already do exactly this — proven pattern: `inspector.js:289,339`.)
- **Fix E (resize half) — debounce `timeline.rebuild()`** on `window resize` (`timeline.js:992`) with a
  ~150ms trailing debounce / rAF so iOS resize storms collapse to one rebuild.
- **Fix C — guard scratch-canvas reallocs.** Wrap every `_x.width=W;_x.height=H` in
  `if (_x.width!==W||_x.height!==H)` (pattern already at `compositor.js:1512,1686`). Apply to `_pfA/_pfB`
  (:788), `_mgA/_mgB` (:3014-3015), and sibling offscreens. Mechanical, zero logic risk.

### 2. Biggest lever (medium risk — one coordinate check)
- **Fix A — downscale the preview canvas** to CSS box × devicePixelRatio, cap longest edge ~1280px.
  Keep `P.width/P.height` ONLY for the exporter's `projCanvas` (`exporter.js:214-227`, already scales — export
  quality untouched). Recompute on (debounced) resize. **The one check:** hit-test / selection mapping
  (`layerSize`, `compositor.js:3147`) must still map screen↔comp coords correctly. Overlay tools already use
  their own DPR path, so they're independent.
- **Fix F (rider on A)** — scale/cap `ctx.filter` blur + `shadowBlur` radii by the preview-scale factor
  (`compositor.js:361,671,401`); blur cost scales with area.

### 3. Deliberate follow-up (highest remaining value, needs care)
- **Fix D — cache effect/group output on static frames.** Memoize a layer/group's rendered plate keyed on
  (frame-quantised time, params-hash, transform-hash); if `FM.isAnimated(...)` is false and params unchanged,
  blit the cache instead of re-running getImageData/JS-loop/putImageData. Tighten `groupNeedsUnit` so a static
  99%-opacity group doesn't re-flatten every frame. Cache-invalidation is the footgun — invalidate on any edit
  to the layer / its effects / the frame time.

### Separate track (stability, not lag)
- 900-frame ImageBitmap cache (`frames.js:51`) → up to 384MB (`app.js:343`) can OOM-kill mobile Safari.
  Lower the preview count / maxBytes for low-memory phones.

## What to measure (built-in preview, no external tooling)
- Baseline: wrap `render()` (`app.js:61`) with `performance.now()` → ms per `renderScene`. Target <16ms/frame.
- Scrub (B): count `render()` per scrub gesture — should drop from ~1-per-pointermove to ~1-per-rAF; `seekVideosToTime` ≤1/frame.
- Downscale (A): log `canvas.width×height` — should track CSS box × DPR (e.g. ~800×1422 on a 400px phone @DPR2), not 1080×1920. Confirm export unchanged.
- Effects (A/C/D): ms/frame for a 1-effect then 3-effect project; getImageData calls/frame → 0 on cached static frames.
- DOM (E): `timeline.rebuild()` count during an iOS address-bar scroll → collapse to 1.
