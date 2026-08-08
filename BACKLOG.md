# FreeMotion — Backlog

_**Rebuilt 2026-07-10** from a full re-audit of the code (the 2026-06-23 list had gone badly stale: 120 of its 251
open parity rows were wrong, and 9 of its 12 "quick wins" plus 6 of its 18 bugs were already shipped)._

> ⚠️ The re-audit only re-checked rows marked `❌`/`🟡`, assuming a `✅` feature can't un-ship. The ~196 `✅` rows in
> PARITY.md have never been re-verified. A regression sweep over them is worth one session.
>
> ⚠️⚠️ **That sweep must check `git log` before calling anything a regression.** This file spent a month claiming the
> missing solo button was a high-severity regression "almost certainly lost in the mobile timeline rebuild". It was
> not lost — Ezra asked for it to be removed (`69563ae`, v1.75: *"Ezra didn't want the 'isolate one layer' toggle"*),
> and `js/timeline.js` says so at the spot where it used to be built. A feature that is absent is not automatically a
> bug. `git log -S'<the thing>'` answers "was this removed on purpose?" in one command.

_Top of each list = build next. Effort: S/M/L. When an item ships: flip it to ✅ in PARITY.md, delete it here,
add a POLISH-LOG.md line, and bump the version in `index.html`._

---

## ✅ Shipped since the June audit (was listed as missing)

Groups + masking groups + clipping masks · pen tool / Edit Points / Convert to Outline · freehand + vector drawing ·
speed ramping (keyframed speed) · volume keyframes + real `muted` flag · audio import + Extract Audio · eyedropper ·
custom font import (FontFace + IDB) · angular gradients · Elements library · motion tracking · crop tool · captions ·
Bounce + Elastic easing · layer Z-depth + skew · Copy Background · colour tag picker · timeline pinch-zoom ·
touch-usable mobile UI (`touch-action:none`, 6 `@media` blocks, bottom-sheet inspector, long-press reorder) ·
**193 registered effects** (blurs, glows, warps, faux-3D meshes, halftone, clouds, edges, colour) ·
19 blend modes · named export resolution presets + 12/25/50 fps.

---

## 🐞 Bugs — confirmed still real (verified 2026-07-10)

| Severity | Title | Domain | Detail |
|---|---|---|---|
| ~~high~~ **NOT A BUG** | ~~REGRESSION: the solo button is gone from the UI~~ | UI | **Withdrawn 2026-08-08 — do not "fix" this.** The per-layer Solo 'S' button was removed deliberately at Ezra's request in `69563ae` (v1.75): *"Removed the per-layer Solo ('S') button from each track head (Ezra didn't want the 'isolate one layer' toggle)."* `js/timeline.js` carries a comment at the spot where it used to be built. Nor is `layer.solo` orphaned engine code: it powers the **"Hide other layers"** checkbox in the export dialog (`#exp-solo-clip`, `js/app.js:1972`), which solos the selected clip for the duration of the export and restores it in a `finally`. The compositor / exporter / audio-play gates exist to serve that. The four dead `.th-solo` CSS rules — the thing that made this look half-built — were removed in v4.68. |
| ~~low~~ **FIXED** | ~~`overshoot`/`anticipate` easing exist only as stored beziers~~ | Keyframes | Verified fixed 2026-08-08: both live in `FM.EASE_PRESETS` (`js/scene.js:70`) and `evalProp` resolves bez → EASES → EASE_PRESETS with a `hasOwnProperty` guard (`js/scene.js:93-100`), so a hand-edited or AI-generated scene no longer silently animates linear. |
| low | Curved text collapses multi-line and ignores alignment | Text | `drawArcLine(ctx, lines.join(' '), …)` joins every line into one space-separated string, and `drawArcLine` forces `textAlign='center'`. Multi-line curved text loses its breaks; left/right align is silently dropped. **Effort M.** |
| low | Gradient fill renders wrong on curved text | Text | With gradient + curve both on, the gradient is built for a flat axis-aligned bbox, then glyphs are rotated along the arc — so the gradient stays fixed in pre-arc space. Build it in arc space or sample per-glyph. **Effort M.** |
| low | `letterSpacing` silently no-ops where canvas lacks it | Text | Guarded by `'letterSpacing' in ctx`; on browsers without it the Spacing control does nothing while the inspector still presents it as functional. Needs a per-glyph advance fallback. **Effort M.** |
| low | No guard prevents a camera being parented | Camera | Every layer including the camera gets a `parent` field with no validation; the camera composite reads `cam.transform` directly and never calls `applyParentChain`, so a programmatically/AI-set camera parent is a silent no-op. The UI hides the picker, but the scene model is AI-editable. Add a guard or warning. **Effort S.** |
| low | Reverse audio uses 2-tap linear sampling — aliasing on sped-up reversed clips | Audio | `reversedBuffer`/`makeClipBuffer` advance by `speed×` per output sample with linear interpolation and no low-pass, so `speed > 1` decimates without anti-aliasing. Consistent between preview and export, so fidelity not correctness. **Effort M.** |
| low | Per-prop `loopMode` only re-synced when `layer.loopMode !== 'none'` | Keyframes | `rebuild` only pushes `loopMode` onto animated props when it's set, relying on the context-menu having written `'none'` to every prop at click time. A prop animated *after* loop was turned off carries no explicit value. Harmless today (undefined ≡ no-loop) but fragile. Derive loop state from `layer.loopMode` at eval time. **Effort S.** |

**Fixed in v2.85:** solo now silences preview audio (shared `FM.soloSilenced` gate matching the exporter) · export offers the OS share sheet with download fallback · speed clamps against remaining source.

**Fixed in v2.86:** Dreamy preset wrote `amount` instead of `radius` (silently ignored) · vignette was a no-op on text/shape/path/group layers (now renders comp-space on non-media; media keeps its clip-bounds draw) · longshadow smeared shadow from the canvas edge along every diagonal before seeing any content (found by an isolation test of all 154 effects — the other 153 render clean).

**Fixed since June** (were on this list): no responsive layout · no `touch-action:none` · HTML5-DnD layer reorder ·
reversed-clip audio ignoring previewRate · spacebar firing in contenteditable · adjustment-layer mirror unsupported ·
solo not gating audio *on export*.

---

## ⚡ Quick wins (high value, low effort — do these first)

- [x] ~~**Add `overshoot`/`anticipate` to `EASES`**~~ — SHIPPED. They live in `FM.EASE_PRESETS` (`js/scene.js:70`) and `evalProp` resolves bez → EASES → EASE_PRESETS, so the silent-linear path is closed.
- [ ] **Steps + Cyclic easing presets** — `EASES` entries + preset buttons; Steps needs a count param. **S**
- [ ] **Underline / strike-through text** — only bold/italic exist; manual line under the measured width. **S**
- [ ] **Stroke-only (transparent-fill) text** — text `fillMode` is `[solid, gradient]` with no `none`, and `fillOpacity` is never read in the text draw path. **S**
- [ ] **Dedicated ±1-frame transport buttons** — the step logic already exists, it's keyboard-only (`,`/`.`). **S**
- [ ] **Export: stereo/mono select, direct Mbps field, Max Render Quality** (`latencyMode:'quality'`) — `channels` is hardcoded to 2. Three trivial adds to the export dialog. **S**

## 🎨 Cheap effects — a self-contained pixel fn + one registry entry each

**Shipped 2026-07-10 (v2.86):** Soft Glow · Replace Color · Spot Color · Four-Color Gradient (with new
generic color3/color4 picker support) · Spectral Map · Channel Remap HSV modes (Hue Invert, Swap Sat/Val) ·
Radial Shadow · Tunnel · Voronoi Cells. Turbulent Displace was dropped — the shipped `fractalwarp` IS
sum-of-sines noise displacement; a second one would be a duplicate.

Still open:

- [ ] **Contour Gradient** — needs an edge-distance transform pass before the gradient map. **M**
- [x] ~~**Luma matte**~~ — SHIPPED v4.63 as its own effect (`lumamatte`, `js/fx-registry.js:101`), reading brightness from any layer in the stack rather than only the one directly above.

- [ ] **Box-tool overlays under a zoomed viewport** — crop/touch-up/point-edit/tracker/draw overlays are children of the transformed #canvas-wrap and lay out in screen px, so at viewport zoom ≠ 1 they render scale× off (values written are correct — input maps through getBoundingClientRect). v2.92 sidesteps it by resetting the view when a tool opens; the real fix is dividing each tool's dispScale-derived sizes by FM.viewport.scale (one-ish line each — see canvas-edit's localScale()). Would let you zoom in first, then draw a precise touch-up box. **S/M**

## 🧩 Feature gaps (by priority)

| P | Feature | Domain | Tier | Effort | Why it matters |
|---|---|---|---|---|---|
| ✅ | ~~**Downscale the preview canvas**~~ SHIPPED — `previewScale()` in `js/app.js`. (Fix F, its rider, shipped v4.69.) | Perf | — | — | — |
| ✅ | ~~Two-finger pinch / pan on the **preview canvas**~~ SHIPPED — `vpPinch` in `js/canvas-edit.js:171`. | UI | core | — | — |
| 2 | Ripple delete (close the gap when a clip is removed) | Timeline | core | S | `deleteLayer` just filters the array; adjacent clips don't shift. Standard editing expectation. |
| 2 | Snap to grid + grid overlay | UI | common | S/M | `snapTo` snaps to centre/edges only. Extend it to quantize to a grid step. |
| 2 | Multi-stop + keyframeable gradients | Color | core | M | Every gradient is 2-stop (`c0`/`c1`) and set directly, never via `setProp`/`evalProp`. Blocks animated gradients and a real Gradient Map. |
| ✅ | ~~Trim-path / Drawing Progress~~ SHIPPED — `layer.trimPath` at `js/compositor.js:6349`, drawn via `lineDashOffset`. | Masking | common | — | — |
| ✅ | ~~Stereo panning per layer~~ SHIPPED — `createStereoPanner` at `js/audio-fx.js:118`. | Audio | common | — | — |
| 3 | Colour Curves (RGB + per-channel) | Effects | common | M/L | The render is a trivial 256-LUT; the work is the curve-editor UI. |
| 3 | Move Along Path | Masking | common | M | Sample a path layer's points as a position source + optional auto-orient. |
| ✅ | ~~Multiple masks per layer + mask stack~~ SHIPPED — `layer.masks` is an array; see `js/masks.js`. | Masking | common | — | — |
| 3 | Live nested precomps | Layers | common | M/L | `FM.elements` re-IDs layers into independent **copies** — editing the source doesn't update instances. |
| 3 | Per-clip audio loop · crossfade · mic recording | Audio | common | M | Per-clip `source.loop`; linked fade envelopes; `getUserMedia` + `MediaRecorder`. |
| 3 | Text: scrolling/ticker presets + AE-style per-unit animator | Text | common | M/L | Only 5 fixed reveal presets; no rotation channel, no free per-unit animator. |
| 3 | Merge / flatten layers | UI | common | L | Offscreen render of N layers over a time range → a new baked media layer. |
| 4 | Active/multi-camera + camera cuts | Camera | core | M | `app.js:671` hard-blocks a second camera. Data model + timeline UI; no WebGL needed. |
| 4 | Independent preview pan/zoom viewport | Camera | common | S/M | Editor navigation currently writes the **camera layer's** transform. Pure editor-space offset/scale. |
| ✅ | ~~PNG sequence export~~ SHIPPED — `FM.exporter.runFrames` (`js/exporter.js:452`), zipped via `js/zip-write.js`. | Export | common | — | — |
| 4 | Platform export presets (TikTok / Reels / YouTube) | Export | common | S | Presets just set canvas size + fps + bitrate. |
| 4 | Stroke Taper · Boolean shape ops | Masking | nice | M / L | Taper needs per-point width in the stroker. Booleans need robust polygon clipping — the one item here that isn't cheap in vanilla JS. |
| 4 | Keyframe animation of fontSize / spacing / lineHeight | Text | core | M | Colour, outline and shadow are keyframeable now; these still use direct assignment. |
| 5 | Multi-keyframe marquee select + bulk easing; in/out velocity fields | Keyframes | common | M/L | Bezier math already exists; the work is timeline selection state + inspector UI. |
| 5 | Audio beat / BPM auto-detection | Audio | common | L | Web Audio onset / energy-flux analysis. Markers already exist to receive the results. |
| ✅ | ~~Particle emitter~~ SHIPPED v3.41 — but as a CANVAS_FX (`particles`), **not** the new layer type this row describes. MISSION.md records that as the deliberate design. | Effects | common | — | — |
| 5 | Pitch shift / pitch-preserving time-stretch | Audio | common | L | Phase-vocoder or WSOLA; no native primitive. |
| ✅ | ~~Reverb · delay · EQ · compressor~~ SHIPPED — convolver/delay/biquad/compressor all in `js/audio-fx.js:115-120`, and all four are in `AFX_FEATURED`. | Audio | common | — | — |

## 🚫 Non-goals / platform-blocked

- **True 3D** — camera FOV/zoom-distance, depth-of-field, fog, scene lighting, `.obj`/`.glb` import, real 3D text.
  Impractical on a 2D canvas without a WebGL rewrite. The faux-3D mesh effects (`cube3d`, `box3d`, `rasterextrude`,
  `smoothbevel`) already cover most of the *look*. **Document as a non-goal.**
- ~~**Animated GIF export**~~ — **NO LONGER A NON-GOAL: it shipped in v3.39.** The LZW encoder was hand-rolled into
  `js/gif-encode.js` with no CDN and no npm, and `FM.exporter.runGif` drives it.
- **Alpha-channel export** — `mp4-muxer` + `avc` have no alpha path. Would need WebM/VP9-alpha muxing.
- **MOV / ProRes / HEVC** — WebCodecs generally can't encode ProRes at all; the muxer is mp4-only.
- **Cloud share links** — the app is deliberately local-only (localStorage + IndexedDB, nothing leaves the device).
- **Watermark on free-tier exports** — N/A by design; there are no tiers.
