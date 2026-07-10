# FreeMotion — Backlog

_**Rebuilt 2026-07-10** from a full re-audit of the code (the 2026-06-23 list had gone badly stale: 120 of its 251
open parity rows were wrong, and 9 of its 12 "quick wins" plus 6 of its 18 bugs were already shipped)._

_Top of each list = build next. Effort: S/M/L. When an item ships: flip it to ✅ in PARITY.md, delete it here,
add a POLISH-LOG.md line, and bump the version in `index.html`._

---

## ✅ Shipped since the June audit (was listed as missing)

Groups + masking groups + clipping masks · pen tool / Edit Points / Convert to Outline · freehand + vector drawing ·
speed ramping (keyframed speed) · volume keyframes + real `muted` flag · audio import + Extract Audio · eyedropper ·
custom font import (FontFace + IDB) · angular gradients · Elements library · motion tracking · crop tool · captions ·
Bounce + Elastic easing · layer Z-depth + skew · Copy Background · colour tag picker · timeline pinch-zoom ·
touch-usable mobile UI (`touch-action:none`, 6 `@media` blocks, bottom-sheet inspector, long-press reorder) ·
**~180 registered effects** (blurs, glows, warps, faux-3D meshes, halftone, clouds, edges, colour) ·
19 blend modes · named export resolution presets + 12/25/50 fps.

---

## 🐞 Bugs — confirmed still real (verified 2026-07-10)

| Severity | Title | Domain | Detail |
|---|---|---|---|
| med | **Solo doesn't silence audio in PREVIEW (but does on export)** | Audio | `solo` appears **zero** times in `js/app.js` and `js/audio-play.js`. Preview gates audio only on `layer.visible === false` (`app.js:432,441,468`; `audio-play.js:49`). But `exporter.js:98-101` *does* gate on `soloActive && !layer.solo`. So you solo a clip, still hear every layer while editing, then the exported MP4 contains only the soloed audio. Preview and export disagree. Fix: mirror the exporter's gate in both preview paths. **Effort S.** |
| low | **Speed change doesn't re-clamp against remaining source — freezes on last frame** | Timeline | The speed control keeps `span = duration × speed` invariant but never re-checks that `trimStart + span` stays inside the source. For a clip with `trimStart > 0`, slowing it lengthens duration past the available source and the tail freezes on the last decoded frame. Clamp against `(srcDur − trimStart)`. Note speed is now keyframeable, so clamp the *evaluated* value. **Effort S.** |
| low | **`Dreamy` preset writes the wrong blur param** | Effects | The preset defines `blur {amount: 6}` but the blur effect's key is `radius` (`compositor.js:38`, `def: 6`). The value is ignored and blur silently falls back to its default — which is also 6, masking the bug. If that default ever changes, the preset diverges. Rename to `radius`. **Effort S.** |
| low | **`overshoot`/`anticipate` easing exist only as stored beziers** | Keyframes | `EASES` keys are `linear, easeIn, easeOut, easeInOut, bounce, elastic, hold` — no `overshoot`/`anticipate`. `evalProp` falls back to `EASES[b.e] \|\| EASES.linear` when a keyframe has no `bez`. Both apply-paths currently write `bez`, so it works today — but a hand-edited, imported, or AI-generated scene silently animates **linear**. The scene model is explicitly meant to be AI-edited, so this is a real data-loss path. Add both to `EASES`. **Effort S.** |
| low | Curved text collapses multi-line and ignores alignment | Text | `drawArcLine(ctx, lines.join(' '), …)` joins every line into one space-separated string, and `drawArcLine` forces `textAlign='center'`. Multi-line curved text loses its breaks; left/right align is silently dropped. **Effort M.** |
| low | Gradient fill renders wrong on curved text | Text | With gradient + curve both on, the gradient is built for a flat axis-aligned bbox, then glyphs are rotated along the arc — so the gradient stays fixed in pre-arc space. Build it in arc space or sample per-glyph. **Effort M.** |
| low | `letterSpacing` silently no-ops where canvas lacks it | Text | Guarded by `'letterSpacing' in ctx`; on browsers without it the Spacing control does nothing while the inspector still presents it as functional. Needs a per-glyph advance fallback. **Effort M.** |
| low | Vignette is media-only | Effects | The vignette overlay is drawn in exactly one place (`compositor.js:2879`), inside the media/crop branch. Added to a text or shape layer it is tweakable but never renders. Either gate it out of the picker for non-media layers, or move it to a post-rasterization pass. **Effort S.** |
| low | No guard prevents a camera being parented | Camera | Every layer including the camera gets a `parent` field with no validation; the camera composite reads `cam.transform` directly and never calls `applyParentChain`, so a programmatically/AI-set camera parent is a silent no-op. The UI hides the picker, but the scene model is AI-editable. Add a guard or warning. **Effort S.** |
| low | Reverse audio uses 2-tap linear sampling — aliasing on sped-up reversed clips | Audio | `reversedBuffer`/`makeClipBuffer` advance by `speed×` per output sample with linear interpolation and no low-pass, so `speed > 1` decimates without anti-aliasing. Consistent between preview and export, so fidelity not correctness. **Effort M.** |
| low | Per-prop `loopMode` only re-synced when `layer.loopMode !== 'none'` | Keyframes | `rebuild` only pushes `loopMode` onto animated props when it's set, relying on the context-menu having written `'none'` to every prop at click time. A prop animated *after* loop was turned off carries no explicit value. Harmless today (undefined ≡ no-loop) but fragile. Derive loop state from `layer.loopMode` at eval time. **Effort S.** |

**Fixed since June** (were on this list): no responsive layout · no `touch-action:none` · HTML5-DnD layer reorder ·
reversed-clip audio ignoring previewRate · spacebar firing in contenteditable · adjustment-layer mirror unsupported ·
solo not gating audio *on export*.

---

## ⚡ Quick wins (high value, low effort — do these first)

- [ ] **Share sheet after export** (`navigator.share({files})`, anchor-download fallback) — `exporter.js:11 download()`. Core tier, mobile-first mandate, no library. The single biggest payoff-per-line item on this page. **S**
- [ ] **Gate preview audio on solo** — mirror `exporter.js:98-101`. See bugs. **S**
- [ ] **Clamp speed against `(srcDur − trimStart)`** — stops the last-frame freeze. See bugs. **S**
- [ ] **Add `overshoot`/`anticipate` to `EASES`** — closes a silent data-loss path for imported/AI scenes. **S**
- [ ] **Fix the `Dreamy` blur param** (`amount` → `radius`). **S**
- [ ] **Steps + Cyclic easing presets** — `EASES` entries + preset buttons; Steps needs a count param. **S**
- [ ] **Underline / strike-through text** — only bold/italic exist; manual line under the measured width. **S**
- [ ] **Stroke-only (transparent-fill) text** — text `fillMode` is `[solid, gradient]` with no `none`, and `fillOpacity` is never read in the text draw path. **S**
- [ ] **Dedicated ±1-frame transport buttons** — the step logic already exists, it's keyboard-only (`,`/`.`). **S**
- [ ] **Export: stereo/mono select, direct Mbps field, Max Render Quality** (`latencyMode:'quality'`) — `channels` is hardcoded to 2. Three trivial adds to the export dialog. **S**

## 🎨 Cheap effects — a self-contained pixel fn + one registry entry each

The effect pipeline (`FM.EFFECTS` + `POSTFX`/`PIXEL_FX`/`WARP_FX` + a perf-whitelist line) makes these near-mechanical.
All verified absent 2026-07-10.

- [ ] **Soft Glow** — bright-pass → blur → screen composite. **S**
- [ ] **Replace Color** — HSV distance test + hue swap. **S**
- [ ] **Spot Color** — keep one hue, desaturate the rest. **S**
- [ ] **Four-Color Gradient** — bilinear blend of 4 corner colours. **S**
- [ ] **Spectral Map** — luma → hue sweep. **S**
- [ ] **Channel Remap (HSV)** — extend the shipped `channelremap` `options[]` with HSV modes. Cheapest of all. **S**
- [ ] **Radial Shadow** — point-light shadow projection. **S**
- [ ] **Tunnel** — log-polar coordinate warp. **S**
- [ ] **Voronoi Cells** — seed points + nearest-cell fill. **S/M**
- [ ] **Turbulent Displace** — value-noise displacement field. **M**
- [ ] **Palette Map** — nearest-colour snap (needs a small palette UI). **M**
- [ ] **Contour Gradient** — needs an edge-distance transform pass first. **M**
- [ ] **Luma matte** — a mask mode that converts the mask layer to luminance-alpha before `destination-in`. Matte compositing is alpha-only today. **S/M**

## 🧩 Feature gaps (by priority)

| P | Feature | Domain | Tier | Effort | Why it matters |
|---|---|---|---|---|---|
| 1 | **Downscale the preview canvas** to CSS box × DPR (see `PERF-PLAN.md` Fix A) | Perf | — | M | Not a parity row, but the biggest change to how the app *feels*: the phone renders every frame at 1080×1920 to display it at ~400px. Multiplies the cost of every effect. |
| 1 | Two-finger pinch / pan on the **preview canvas** | UI | core | M | `canvas-edit.js` has zero multi-pointer handlers. The timeline's pinch code is a directly reusable pattern. Mobile viewport navigation. |
| 2 | Ripple delete (close the gap when a clip is removed) | Timeline | core | S | `deleteLayer` just filters the array; adjacent clips don't shift. Standard editing expectation. |
| 2 | Snap to grid + grid overlay | UI | common | S/M | `snapTo` snaps to centre/edges only. Extend it to quantize to a grid step. |
| 2 | Multi-stop + keyframeable gradients | Color | core | M | Every gradient is 2-stop (`c0`/`c1`) and set directly, never via `setProp`/`evalProp`. Blocks animated gradients and a real Gradient Map. |
| 2 | Trim-path / Drawing Progress (animated stroke draw-on) | Masking | common | M | Signature logo-reveal effect. Trim start/end params + `lineDashOffset` on the traced path, keyframeable. |
| 2 | Stereo panning per layer | Audio | common | M | No `StereoPannerNode`. Needs the preview path *and* the OfflineAudioContext export mix. |
| 3 | Colour Curves (RGB + per-channel) | Effects | common | M/L | The render is a trivial 256-LUT; the work is the curve-editor UI. |
| 3 | Move Along Path | Masking | common | M | Sample a path layer's points as a position source + optional auto-orient. |
| 3 | Multiple masks per layer + mask stack | Masking | common | M | `layer.mask` is singular; one mask layer per masking group. Nested masking groups partly work around it. |
| 3 | Live nested precomps | Layers | common | M/L | `FM.elements` re-IDs layers into independent **copies** — editing the source doesn't update instances. |
| 3 | Per-clip audio loop · crossfade · mic recording | Audio | common | M | Per-clip `source.loop`; linked fade envelopes; `getUserMedia` + `MediaRecorder`. |
| 3 | Text: scrolling/ticker presets + AE-style per-unit animator | Text | common | M/L | Only 5 fixed reveal presets; no rotation channel, no free per-unit animator. |
| 3 | Merge / flatten layers | UI | common | L | Offscreen render of N layers over a time range → a new baked media layer. |
| 4 | Active/multi-camera + camera cuts | Camera | core | M | `app.js:671` hard-blocks a second camera. Data model + timeline UI; no WebGL needed. |
| 4 | Independent preview pan/zoom viewport | Camera | common | S/M | Editor navigation currently writes the **camera layer's** transform. Pure editor-space offset/scale. |
| 4 | PNG sequence export (numbered frames) | Export | common | S/M | Loop the existing frame-step + `toBlob`. Niche on mobile. |
| 4 | Platform export presets (TikTok / Reels / YouTube) | Export | common | S | Presets just set canvas size + fps + bitrate. |
| 4 | Stroke Taper · Boolean shape ops | Masking | nice | M / L | Taper needs per-point width in the stroker. Booleans need robust polygon clipping — the one item here that isn't cheap in vanilla JS. |
| 4 | Keyframe animation of fontSize / spacing / lineHeight | Text | core | M | Colour, outline and shadow are keyframeable now; these still use direct assignment. |
| 5 | Multi-keyframe marquee select + bulk easing; in/out velocity fields | Keyframes | common | M/L | Bezier math already exists; the work is timeline selection state + inspector UI. |
| 5 | Audio beat / BPM auto-detection | Audio | common | L | Web Audio onset / energy-flux analysis. Markers already exist to receive the results. |
| 5 | Particle emitter | Effects | common | L | New layer type + per-frame simulation. |
| 5 | Pitch shift / pitch-preserving time-stretch | Audio | common | L | Phase-vocoder or WSOLA; no native primitive. |
| 5 | Reverb · delay · EQ · compressor | Audio | common | M each | Web Audio nodes in preview, but each must be re-implemented in the offline export mix. |

## 🚫 Non-goals / platform-blocked

- **True 3D** — camera FOV/zoom-distance, depth-of-field, fog, scene lighting, `.obj`/`.glb` import, real 3D text.
  Impractical on a 2D canvas without a WebGL rewrite. The faux-3D mesh effects (`cube3d`, `box3d`, `rasterextrude`,
  `smoothbevel`) already cover most of the *look*. **Document as a non-goal.**
- **Animated GIF export** — no native browser GIF encoder. Needs a CDN library (gif.js) or a hand-rolled LZW encoder;
  the only item that strains the no-npm rule.
- **Alpha-channel export** — `mp4-muxer` + `avc` have no alpha path. Would need WebM/VP9-alpha muxing.
- **MOV / ProRes / HEVC** — WebCodecs generally can't encode ProRes at all; the muxer is mp4-only.
- **Cloud share links** — the app is deliberately local-only (localStorage + IndexedDB, nothing leaves the device).
- **Watermark on free-tier exports** — N/A by design; there are no tiers.
