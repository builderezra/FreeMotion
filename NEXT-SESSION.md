# Next session — the open queue

Rewritten 2026-08-08. **Everything above v4.09 is committed locally and NOT pushed** — Ezra pushes
via GitHub Desktop. Fifty-six releases are waiting (v4.10 → v4.65). The app is at **193 effects**.

Work the list top-to-bottom.

**Ezra turned `/loop` on and said "you can do everything without stopping" — so taste calls that
would normally be his are mine to make. He paused the loop on 2026-08-08 to compact the chat.**

---

## 1. TWO BUGS EZRA REPORTED 2026-08-08 — do these first, they are the live ones

Verbatim: *"IT would be also good if you made it when the quality lowers for perfomance it doesnt
make the picture smaller, so like if the quality goes down atleast zoom in the picture so it stays
consistent. Also for some reason its having to lower the quality when i do something as simple as
just have one simple video with no effects, idk how it cant even playback one video without issues"*

### 1a. The preview gets SMALLER when the adaptive tier drops

It must keep its on-screen size and only lose resolution. **NOT YET REPRODUCED** — investigate before
changing anything. What is already established:

- `#preview { width:100%; height:100% }` and `#canvas-wrap { aspect-ratio: var(--comp-ar) }`
  (styles.css). So in the NON-crop path the display size is pinned by CSS and the backing store
  shrinking should NOT shrink the picture. That path looks innocent — check it, don't assume.
- The **crop path** in `resizeCanvas()` (js/app.js ~line 240) is the prime suspect. It pins the wrap
  to `kw/kh` in PIXELS and positions the canvas `absolute` with percentage width/height. If a tier
  change flips between cropped and uncropped, or the pinned px box goes stale, the picture moves and
  resizes. `previewCrop()` bails on: `zoom < 1.35`, unlaid-out elements, scrolled out of view, and
  `(u1-u0) > 0.92 && (v1-v0) > 0.92`. A tier change alters `s`, not the crop rect — so if the
  reproduction only happens while zoomed in, it is this path.
- Ask Ezra whether it happens zoomed OUT (crop path off) or only zoomed in. That single answer
  splits the search in half.

### 1b. Quality drops on ONE video with NO effects

That should never need a tier drop. Where to look, all in js/app.js:

- `notePlaybackCost(ms)` drops a tier when `_renderAvg > (1000/60)*0.72` — i.e. **12ms**. A 1080p
  `drawImage(video)` plus the composite can exceed that on a first frame or during a decode stall,
  and the measurement cannot tell a decode stall from real render cost.
- `_tierCooldown = FM.playing ? 24 : 8` — once it drops, it is locked in for 24 frames, so a single
  early stall sinks the whole playback.
- `_renderAvg` is an EWMA seeded from the first sample (`_renderAvg ? ... : ms`), so one slow first
  frame sets a bad starting point.
- Likely fixes to weigh: seed `_renderAvg` from a median of the first few frames rather than the
  first; ignore the first ~5 frames after play starts; or measure only the compositor's own time and
  exclude the video decode wait. Verify with `FM.playbackQualityInfo()` — it reports tier, factor,
  avgFrameMs and mode live.

---

## 2. EFFECTS-PLAN.md round 11 — the standing autonomous order

**Round 10 is COMPLETE. All thirteen effects on that file's BUILD NEXT table are shipped** (v4.54 →
v4.61): Levels, Halation, Frame Stutter, Shockwave, Speed Lines, HSL Bands, Time Warp Scan, Chroma
Key Pro, Light Wrap, Dispersion, VHS Tape, Compression Crunch, Temporal Denoise. The app is at 188
effects.

**Round 11 is under way.** Shipped off the WORTH DOING LATER list: **Lens Distortion + Pixel Sort
(v4.62)**, **Luma Matte (v4.63)**, **Compound Blur + Match Grade (v4.64)** — five of the ten. The app
is at 193 effects.

Still open on that list, and all five now need NEW UI rather than just a render branch:

- **Curves** — needs a curve-editor param type in the registry. The biggest of the five and the most
  used tool in any editor. Levels covers ~80% of it with sliders that already fit the schema.
- **Corner Pin** — the homography solve is 20 lines; the ON-CANVAS DRAG HANDLES are the entire job
  (`js/point-edit.js` is the pattern). Sliders alone would be unusable. Start the mesh at 8x8.
- **LUT (.cube)** — a new file-type param, IndexedDB persistence, and a parser eating untrusted text
  (`storage.js sanitizeImportedLayers` rules apply). A missing LUT id in an imported `.fmproj` must
  degrade to identity, never throw.
- **Defocus / Bokeh** — genuinely expensive (see flag F: 40-70ms full res). Quarter-res or export-only.
- **Stabilize** — as an offline Analyse pass over `js/tracker.js`'s frame cache, baking a correction
  curve. NOT as a live effect; see flag C.

`dspSlot(W,H)` + `_dspLvl` (v4.63) is the scratch pool for anything that reads ANOTHER layer — Luma
Matte, Compound Blur and Match Grade all sit on it. Corner Pin will not need it; a LUT will not either.
- the **full proposal table** of per-effect PARAM upgrades (~105 of them), which is what rounds 1-9
  worked through. Those carry the byte-identity rule; new effects do not.

Two things learned in round 10 that belong here:

- For a NEW effect there is no legacy value to match, so the identity check that matters is
  **"0 differing bytes vs HEAD across a spread of EXISTING effect stacks"** — it catches an
  accidental change to shared machinery, which is the only way a new effect can break an old project.
- A **CANVAS_FX at a no-op setting is not byte-identical to having no effect at all**: the plate
  round-trip (rasterise once, then blit) moves antialiased edge pixels by ±1. Light Wrap at intensity
  0 differs on 169 of them, Rounded Corners at radius 0 on 192. Judge a canvas effect's no-op by
  "confined to the antialiased edge, delta ≤ 1", not by zero.
- `FM.needsBgSnap` / `BG_SNAP_FX` (v4.58) is the gate for any effect that reads the layers
  UNDERNEATH. Add one key and it works.

---

## Not blocked, but lower value than the two above

- ~~**Effect descriptions.**~~ DONE v4.65 — all 193 are hand-written, 0 fall back to `describeOf()`.
- **Motion Blur (Footage) on a group.** Currently refused (`supportsLayer`) and stripped at render,
  because a group reaches the effect stack already flattened with its transform baked in. Real support
  means flattening the members with the group's transform excluded and re-applying it after the blur.

---

## Verification harnesses worth reusing (they have caught real bugs)

- **Export identity across all 175 effects.** `git show HEAD:js/compositor.js > _oldcomp.js`, then
  `sed 's|js/compositor.js?v=NNN|_oldcomp.js|' index.html > _old.html`, load `_old.html` in a hidden
  iframe and render the same scene through BOTH `FM.renderScene`s into UNSTAMPED canvases (that is the
  export path). Zero differing bytes = safe. **Always warm up with a throwaway render first** — the
  first call in a fresh window is cold and reports false differences — and ONE warm-up render is not
  always enough. The displace path allocates three canvases on first use and reported a false
  168-byte difference after a single warm-up, and cube3d a false 162-byte one after four. Use SIX
  warm-ups per side, and RE-RUN any non-zero result before believing it — both of those went to 0.
- **Reduced-scale geometry.** Render at scale 1, downscale, compare against a render at 0.5. Catches
  anything that assumed the preview canvas is 1:1 with the project.
- **Glide/momentum tests.** rAF is frozen when the Browser pane is hidden, AND a synchronous rAF stub
  makes `dt` 0 so time-based physics collapse to nothing. Stub rAF with a VIRTUAL CLOCK that advances
  16ms per frame.
- **`FM._layerCTM(layer, t, scene)`** returns a layer's exact placement matrix — the cheapest way to
  prove parenting, transforms or blur geometry without eyeballing a render.

## House rules (from CLAUDE.md — non-negotiable)

Vanilla HTML/CSS/JS, no build step. Mobile-first, verify at ~380px in the browser preview without
being asked. Verify then claim. Bump `index.html`'s version label + the `?v=` cache-busters on every
touched file + a POLISH-LOG.md entry per release. Commit locally; **never push**. Raise
BEFORE-PUBLISHING.md whenever publishing comes up. Add any new AM-modelled screen to that file's list
as you build it.

## The test checklist

Lives at <https://claude.ai/code/artifact/8b77fe99-8b9f-4df8-83ce-001bfa87a9fc> and currently covers
v3.79 → v4.64 (v4.65 not added yet). Every shipped feature gets an entry; re-publish the SAME url (pass it as `url`) rather
than minting a new one.
