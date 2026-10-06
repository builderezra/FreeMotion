# The 25 most useful things FreeMotion lacks (R1)

Against `origin/main` b46b47d (v17.23). Research only: no app code changed.
**Verified** = I read the code or ran a search. **Knowledge** = what I know of CapCut and Alight Motion from general knowledge; two web searches returned only generic pages (CapCut: speed ramp, freeze frame, zoom, glitch, auto captions, transitions like "glare" and "pull-in"; Alight Motion: 160+ effect building blocks, shake, glow, 3D, blur, wave, VHS, glitch, zoom, velocity motion blur, masks, camera, blending), so the ranking of what beginners expect is my judgement, not a measurement.

## 1. What already exists (so none of this is listed again)

Counted from the code:
- **Effects:** 206 in `FM.EFFECTS` (`js/compositor.js:50-1647`), including blurs (Gaussian, Box, Lens, Zoom, Spin, Directional, Tilt Shift, Motion Blur ×2), glows, glitch, VHS Tape, CRT, Halftone, Pixelate, Mosaic, Kaleidoscope, mirrors and tiles, 3D solids (Cube, Cylinder, Spherize…), Page Curl, Card Flip, Depth Push, the motion set (Wiggle, Shake, Swing, Pulse, Drift, Orbit), Chroma Key and Chroma Key Pro, Luma Key, **Particles** (`:1399`, one colour), Snow & Rain, Lightning, Starfield, text effects (Type-On, Scramble, Text Curve…), Light Leak, Lens Flare, Frame Stutter, Time Warp Scan, Pixel Sort, Remove Object, Backfill (blurred fill), Dissolve, Block Dissolve, Wipe, Radial Wipe.
- **Filters:** 56 looks in `js/filters.js` (Teal & Orange, Bleach Bypass, VHS Tape, Super 8, Old Film, Polaroid, Kodachrome, Risograph, Infrared, Datamosh, Noir…).
- **Sound effects:** 30 (`js/sfx.js`: Whoosh, Swish, Impact, Riser, Click, Pop, Ding, Camera shutter, Sparkle, Glass break, Heartbeat, Success, Error, Vinyl crackle, Wind, Rain, Fire crackle…).
- **Audio effects:** 23 (`js/audio-fx.js`: EQ, Reverb, Echo, Chorus, Flanger, Phaser, Pitch Shift, Compressor, Limiter, Telephone, Vocal Remove, Lo-Fi…).
- **Clip tools:** speed with keyframes, reverse, frame blend, fade in and out (`js/inspector.js:5648`), motion tracking (`js/tracker.js:161`), captions (Detect speech lays down empty cues only, per tutorial 12).
- **Already queued by the PM:** `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §B lists 56 new items (B1 to B56). Where one of my 25 is already there I say so and keep it in the ranking, because the ranking is the new part.

**Verified gaps (searched `js/` and found nothing):** no freeze-frame action, no video stabilisation (0 hits for "stabiliz"), no split-screen or layout templates (0 hits), no Ken Burns / auto pan-zoom for photos (0 hits), no beat or tempo detection (the only "tempo" hits are comments in `js/exporter.js:319` and `js/media.js:90`), no speed-curve presets, no one-tap transition on a cut, no sticker pack.

## 2. The 25, ranked by value to a beginner

Size: S = a day or less, M = a few days, L = a week or more. "Shape" = how it fits the compositor. The existing shape is: a row in `FM.EFFECTS` with `params`, a kernel in `PIXEL_FX`, `WARP_FX`, `CANVAS_FX` or an explicit draw function (`js/compositor.js` dispatch `applyPostFx` `:3835`), preview and export sharing one `renderScene`.

### A. Transitions (the biggest gap: there is no concept of a transition)

Today a "cut" is just two clips touching. Dissolve, Block Dissolve, Wipe, Radial Wipe and 3D flips exist only as per-layer effects you keyframe yourself, which no beginner will discover.

| # | Item | What it does | Fit | Size | In §B? |
|---|---|---|---|---|---|
| 1 | **Transition picker on a cut** | Tap the join between two clips, pick a transition from a short list; the app writes the keyframes. The one change that makes the rest of this section reachable. | UI plus a "preset writes keyframes on existing effects" layer (the same idea as `FM.fxPresets`). No new kernel. | L (UI), then S per transition | no |
| 2 | **Zoom transition** | Outgoing clip zooms in fast with a blur, incoming settles from large | Scale keyframes plus Zoom Blur (both exist) | S | no |
| 3 | **Whip pan** | Both clips slide sideways with a streak of motion blur | Position keyframes plus Directional Blur (exists) | S | no |
| 4 | **Flash / white-out** | Brightness spikes to white on the cut | Brightness keyframes (exists) | S | no |
| 5 | **Glitch cut** | A burst of Glitch and RGB Split across the join | Glitch and RGB Split keyframed (exist) | S | no |
| 6 | **Spin** | Outgoing spins away, incoming spins in | Rotation keyframes plus Spin Blur (exists) | S | no |

**Risk:** transitions need the two clips to overlap on two rows, or one clip to fade into the other on the same row; check how `fadeIn` and `fadeOut` already overlap two clips (`js/app.js:2783` `reconcileFades`) before designing the data. **Test:** render frame N of each transition in preview and export and compare (the preview-versus-export check from `preview-export-parity.md`).

### B. Clip tools beginners ask for by name

| # | Item | What it does | Fit | Size | In §B? |
|---|---|---|---|---|---|
| 7 | **Freeze frame** | Hold the frame under the playhead for N seconds | A clip action: split at the playhead, add a still of that frame, ripple the rest. Uses the frame capture the thumbnail code already has. | S | no |
| 8 | **Speed curve presets** (Montage, Hero, Bullet, Jump, Flash in, Flash out) | One tap writes a speed ramp | Writes speed keyframes (speed keyframes exist, tutorial 08) | S | no |
| 9 | **Beat markers** | Detect the beat of a song and drop markers on the timeline so cuts land on it | Offline analysis of the decoded audio buffer (`m.audioBuffer` exists) writing `project.markers` | M | no |
| 10 | **Stabilise** | Smooth out a shaky clip | Reuse the tracker (`js/tracker.js:161`), apply the inverse of the smoothed track as a transform and crop | M to L | no |
| 11 | **Ken Burns** | Slow automatic zoom and pan on a photo | Two scale and position keyframes written on add | S | no |

### C. Layouts and overlays

| # | Item | What it does | Fit | Size | In §B? |
|---|---|---|---|---|---|
| 12 | **Split screen** (2-up, 3-up, grid) | Drop N clips into a layout in one tap | Writes N layers with positions and masks | M | no |
| 13 | **Picture-in-picture presets** | Corner, rounded, with a shadow | Positions, a rounded mask and Drop Shadow (exist) | S | no |
| 14 | **Sticker and emoji pack** | Tap to add animated stickers, arrows, speech bubbles | Shape layers with built-in animation; asset size is the cost | M | no |
| 15 | **Confetti and multicolour particles** | Confetti, hearts, sparkles in several colours | Particles (`js/compositor.js:1399`) has one colour; add a palette param and three presets | S | no |

### D. Looks and picture tools (already queued in §B; ranked here for a beginner)

| # | Item | Fit | Size | §B |
|---|---|---|---|---|
| 16 | **Shape wipe (iris, heart, star)** | a matte and a progress param | S | B15 |
| 17 | **Karaoke captions (word highlight)**, CapCut's signature look | text layer with per-word timing | L | B9 |
| 18 | **Echo trails** (time ghosts) | needs the `_mflow` history (`js/compositor.js:12249`), so check preview-versus-export first | M | B3 |
| 19 | **Skin smooth** | edge-preserving blur | M | B14 |
| 20 | **Colour wheels (lift / gamma / gain)** | three colour params in the grade shape | M | B18 |

### E. Sound

| # | Item | Fit | Size | §B |
|---|---|---|---|---|
| 21 | **Voice changer** (chipmunk, deep, robot) | built from Pitch Shift and Ring Mod, which exist | M | B1 |
| 22 | **Reduce noise** (hiss, hum) | an audio clip tool; offline spectral gate | L | B24 |
| 23 | **Auto-duck music under voice** | one analysis plus gain keyframes | M | B25 |
| 24 | **Meme and cartoon sounds** (boing, bruh, airhorn) | recipes in `js/sfx.js`; some are samples, which means shipping audio | M | B4 |
| 25 | **Transition and glitch sounds** (record scratch, tape stop) | pairs with item 1: each transition could carry its sound | S | B12 |

## 3. What I would build first

1. **Item 1 with 2 to 6 as its first presets.** It is the one change that makes the app feel like CapCut to a beginner, and it needs no new kernel. Draw the picker first (his rule, #545).
2. **Items 7, 8 and 11** (freeze frame, speed presets, Ken Burns): each is S, all use what exists, all are things people look for by name.
3. **Item 9** (beat markers) then **24 and 25** for sound.
4. Everything else in §D and §E follows the PM's own §B order.

## 4. Risks that apply to all of it

- **Preview versus export.** Anything with memory across frames (echo, stabilise, transitions that read the previous clip) is the class `preview-export-parity.md` found unguarded. Each new effect needs the parity test before it ships.
- **Phone cost.** A new kernel that walks the whole frame costs on a phone (`phone-perf.md` item 10); prefer presets over kernels.
- **Names.** BEFORE-PUBLISHING.md asks that effect names not copy Alight Motion's; use plain names ("Zoom", "Whip pan"), not the apps' own.

## 5. Verified vs knowledge

Verified: every existing-feature claim (counts and `file:line` above) and every gap (the searches). Knowledge, not verified here: which of these CapCut and Alight Motion users expect most, the sizes (estimates from how similar items were built in the repo), and that a beginner would not find the existing Dissolve and Wipe effects.
