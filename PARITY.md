# FreeMotion — Parity Matrix

_Single source of truth: every Alight Motion feature × FreeMotion status. Originally generated 2026-06-23._
_**Re-audited 2026-07-10** against the actual source (12 domains in parallel, evidence required for every status,
adversarial refutation of every "missing" claim). **120 of the 251 then-open rows were wrong** — the June matrix had
gone badly stale across v2.71→v2.84._

_**Caveat on that pass:** it re-checked only the `❌`/`🟡` rows, on the assumption that staleness runs one way and a
`✅` feature does not un-ship. **That assumption is false.** "Layer solo" was marked ✅ and has since REGRESSED — the
engine still honours `layer.solo` but the timeline button that set it is gone. Found by accident while fixing the
solo/audio bug, not by the audit. **The ~196 `✅` rows have never been re-verified and may hide other regressions.**_

## Where we stand (as of 2026-07-10)

- **Core:** 87 / 109 done (**80%**)
- **Common:** 76 / 153 done (50%)
- **All audited features:** 208 / 342 done (61%)
- **Remaining core gaps:** 22 (13 partial, 9 missing — and 1 of those, "Watermark on free-tier exports", is N/A by design)

> FreeMotion has a strong core editor (timeline, keyframes + graph editor, groups/masking groups, parenting/camera/null,
> speed ramping, project save/load, MP4/H.264 export) and — contrary to the June audit — a **deep effects catalog**
> (~180 registered effects: blurs, glows, warps, faux-3D meshes, halftone, clouds, edge and colour work) and a
> **genuinely touch-usable mobile UI** (pinch-zoom, long-press reorder, bottom-sheet inspector, `touch-action:none`
> across every drag surface).
>
> The real remaining gaps are narrower than they looked: **no true 3D** (camera FOV/Z, depth-of-field, lighting, mesh
> import — all impractical on a 2D canvas without WebGL), **no audio DSP** (pan, pitch/time-stretch, reverb/EQ/delay,
> beat detection), **export breadth** (no GIF, no alpha channel, no share sheet, no platform presets), and a handful of
> cheap-but-absent effects and easing curves.

Legend: ✅ done · 🟡 partial · ❌ missing · ❔ unknown

_Across 342 audited features: 208 ✅ · 52 🟡 · 81 ❌ · 1 ❔_ (was 90 ✅ · 62 🟡 · 189 ❌ before the 2026-07-10 re-audit; v2.86 shipped 13 more)

## Timeline & playback (tracks, scrub, split, ripple/trim, speed & time-remap, markers, loop region, preview rate)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Multi-layer timeline with unlimited stacked tracks | ✅ done | core | Confirmed. timeline.js buildTracks() renders one track-row per FM.scene.layers entry; heads have eye/lock/solo/name/thumb and HTML5 drag-reorder via FM.reorderLayer (app.js:691). scene.js layers array unbounded. Grouping/precomp genuinely absent but that is an optional sub-feature; core multi-track is fully wired. |
| Playhead scrub and frame-by-frame navigation | ✅ done | core | Confirmed. timeline.js beginScrub + pointermove -> FM.setTime(timeFromX) (line 509). FM.setTime (app.js:143) calls render + seekVideosToTime. Frame-step on ArrowLeft/Right (app.js:946-947) and Comma/Period (949-950) by ±1/(project.fps\|\|30). |
| Timeline zoom (pinch to stretch) | ✅ done | core | Re-audited 2026-07-10: two-finger pinch shipped — timeline.js `pinch`/`pdist()` capture-phase handler -> setZoom, alongside Ctrl+wheel and buttons. |
| Trim clips (drag handles) | ✅ done | core | Confirmed. buildLane appends .clip-grip left/right; pointerdown sets trimDrag; pointermove (timeline.js:472-499) recomputes start/duration/trimStart with source-length clamp and snapEdge. Non-destructive (trimStart preserved). |
| Split clip at playhead | ✅ done | core | Confirmed. FM.splitLayer (app.js:613-652) clones layer, sets B.start/B.trimStart, A.duration=into, loads fresh media rec for B (never aliases A's media), handles reversed-clip case. Wired to btn-split (index.html:58), S key (app.js:961), context menu (654-659). |
| Delete clip (with ripple-style gap close) | 🟡 partial | core | Confirmed partial. deleteSelected/deleteLayer (app.js:444-463) just filter the layer out; no ripple/gap-close — adjacent clips do not shift. Ripple-delete absent. |
| Constant-speed adjustment (Speed & Duration) | ✅ done | core | Confirmed. inspector.js:651-661 'Speed %' rangeRow (25-400) on video layers; keeps source span invariant (span=duration*speed), recomputes duration=span/sp, sets playbackRate, grows project duration. Timeline badge shows speed when !=1 (timeline.js:234-239). |
| Reverse clip playback | ✅ done | common | Confirmed. inspector.js:668 'Reverse (video + audio)' checkbox; ensureReverseCache decodes frames; audio-play.js reversedBuffer plays reversed audio via Web Audio; scene.js:288 layerLocalTime inverts time offset when reversed. |
| Time Remapping (velocity / speed-ramp keyframes) | ✅ done | common | Re-audited 2026-07-10: speed ramping shipped v2.52. layer.speed is keyframeable (inspector.js `FM.toggleProp(layer,'speed')`); scene.js `layerSourceAdvance` integrates the eased curve; exporter.js resamples audio along the same integral. |
| Keyframe animation easing curves (graph editor) | ✅ done | core | Confirmed. graph-editor.js bezier editor with draggable handles, mounted in inspector.js:443-444 (FM.graphEditor.mount). EASE_PRESETS (scene.js:52) Linear/In/Out/InOut/Overshoot/Anticipate + Hold; custom kf.bez; scene.js bezierAt evaluates per-frame. |
| Audio waveform display on timeline | 🟡 partial | common | Confirmed partial. timeline.js:248-258 draws .clip-wave canvas on video layers with a file; media.js getWaveform decodes audio into peaks. Note: it is 600 max-amplitude peaks, not '128 RMS' as the prior audit stated (cosmetic evidence error, status unchanged). Only video layers get it (no separate audio-layer type exists) and there is no show/hide toggle. |
| Beat marks / timeline markers | 🟡 partial | common | Confirmed partial overall, but one prior-audit claim is WRONG: the M-key handler (app.js:956) does NOT pause and works during playback, so tap-to-mark while playing DOES work. Markers themselves are fully done (add via M/ruler right-click, snap points, rename on dblclick, remove/clear). Status stays partial only because audio-transient/beat auto-detection is genuinely absent. |
| Retiming marks on preset Elements (intro/middle/outro) | ❌ missing | common | Confirmed missing. No preset-Elements system, no retimer/intro/outro mark logic anywhere. sample.js makes plain test clips. |
| Onion skinning (ghost frames) | ✅ done | nice | Confirmed. app.js:19-46 drawOnionSkin renders selected animated layer at t±0.2s tinted cyan(past)/red(future) at 40% alpha; parent-chain aware; only when FM.onionSkin && !FM.playing (line 64). Toggled by btn-onion (app.js:809-810). |
| Project-level frame rate selection | ✅ done | core | Confirmed. scene.js:172 project.fps default 30; cv-fps select written app.js:872; exp-fps read app.js:719; frame-step navigation uses project.fps. |
| Low-quality preview mode (Android) | 🟡 partial | common | Confirmed partial. #preview-rate select (index.html:61-67, values 0.25/0.5/1/2/4) wired app.js:817-818 to FM.setPreviewRate — controls playback SPEED only, not render resolution. No 360p/480p preview downscale. Not a true low-quality-preview equivalent. |
| Playback controls bar (play, pause, step-frame) | 🟡 partial | core | Confirmed partial. index.html transport has btn-tostart/btn-play/btn-toend/btn-loop/btn-split/btn-snap/btn-onion but NO dedicated step-frame buttons. Frame-stepping only via keyboard (,/. and arrows). Visual bar missing per-frame step buttons. |
| Bookmarks on timeline | ❌ missing | nice | Confirmed. project.markers exists but there is no named-bookmark concept, no bookmark panel, no jump-to-bookmark navigation. Closer to beat-marks than bookmarks. |
| Keyframe volume control on audio tracks (with keyframes) | ✅ done | common | Re-audited 2026-07-10: inspector.js `volumePanel` has a ◆ diamond wired to `FM.toggleProp(layer,'volume')`; `FM.layerVolume` evals the animated prop; exporter mixes animated volume. |
| Loop playback region for A/B preview | ✅ done | nice | Confirmed. FM.hasLoopRegion (app.js:165), wrapTo + tick wrap at project.loopOut back to loopIn (174-179). timeline.js updateLoopRegion draws #tl-loopregion shaded bar. Set via [ / ] (app.js:953-954), cleared with \ (955). Export respects loop region (app.js:733). |

## Keyframes & animation (easing presets, graph/velocity editor, hold/bezier, loop & pingpong modes, motion blur, wiggle)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Per-property keyframe recording | ✅ done | core | Confirmed. scene.js toggleKeyframe/toggleProp flip static→{kf:[]} for any transform prop or effect param; inspector kf-btn wired; evalProp interpolates at playback. animatedProps() enumerates both transform and effect-param kf containers. |
| Hold (step) keyframe interpolation | ✅ done | core | Confirmed. scene.js:73 `if (b.e==='hold') return a.v`. graph-editor setHold()/drawHold(); timeline context menu 'Hold (step)' item sets e='hold' and deletes bez. |
| Linear keyframe interpolation | ✅ done | core | Confirmed. EASES.linear, EASE_PRESETS.linear=[0,0,1,1]; graph-editor 'Linear' preset; timeline context menu 'Linear'. |
| Cubic Bezier easing curves with manual handle adjustment | ✅ done | core | Confirmed. graph-editor.js: two draggable handles, pointerdown picks nearest, pointermove→setBez; scene.bezierAt Newton-Raphson+bisection; kf.bez stored and used in evalProp:76. |
| One-tap easing presets: Ease In, Ease Out, Ease In-Out | ✅ done | core | Confirmed. graph-editor preset buttons In/Out/In-Out map to EASE_PRESETS; also via timeline right-click menu (iterates EASE_PRESETS keys). |
| Bounce easing preset | ✅ done | common | Re-audited 2026-07-10: shipped v2.67. `EASES.bounce` (scene.js) is a real oscillating fn; one-tap preset in graph-editor.js; evalProp resolves it. |
| Elastic easing preset | ✅ done | common | Re-audited 2026-07-10: shipped v2.67. `EASES.elastic` (scene.js) + graph-editor preset; drawn via CURVE_EASES sampling. |
| Steps easing preset | ❌ missing | common | Confirmed missing. Only 'hold' provides stepping; no step-count/discrete-interval easing. |
| Elastic Steps easing preset | ❌ missing | nice | Confirmed missing — neither component exists. |
| Cyclic easing preset | ❌ missing | nice | Confirmed missing. No cyclic/pendulum easing. |
| Overshoot / Back easing (anticipation curves) | ✅ done | common | Confirmed. EASE_PRESETS overshoot=[.34,1.56,.64,1], anticipate=[.36,0,.66,-.56]; both as graph-editor preset buttons and in timeline menu; canvasToGraph clamps Y to [-1,2] to allow handles past axis. Note: these only animate correctly via stored bez (EASES table has no overshoot/anticipate key) — and the code always sets bez when applying them, so it works. |
| Graph (curve) editor with velocity visualisation | 🟡 partial | core | Confirmed partial. graph-editor.js is a single value/timing curve editor (slope implies speed), mounted in inspector transform category. Despite the file header calling it a 'Velocity editor', there is no separate velocity/speed-graph view mode. |
| Motion Blur effect (velocity-based, per-layer) | 🟡 partial | core | Confirmed partial. compositor drawMotionBlur sub-samples transform motion across shutter window with renormalized opacity; inspector exposes Motion blur checkbox + Shutter + Samples. Only shutter+samples controls (no per-axis Position/Scale/Angle toggles); blurs transform motion only, not a video clip's intrinsic subject motion (acknowledged in code comment). |
| Oscillate effect (procedural wiggle/shake) | ✅ done | core | Re-audited 2026-07-10: a full addable 'move' effect family now exists — wiggle/shake/swing/spin/pulse/drift/orbit (compositor.js, fx-registry 'move' category). swing=angular, pulse=scale, spin=rotation, so the position-only critique is resolved. |
| Auto-Shake effect (randomised procedural shake) | ✅ done | common | Re-audited 2026-07-10: dedicated addable `shake` effect (amount/speed/twist) using `wnoise` procedural noise on position + rotation twist. Deterministic, so it exports identically. |
| Random Jitter effect | ❌ missing | common | Confirmed missing. No 'jitter'/random-noise effect in FM.EFFECTS or anywhere. |
| Echo Keyframes effect (motion trails / ghost frames) | 🟡 partial | common | Re-audited 2026-07-10: `motionflow` style 'Echo Trails' (compositor.js) gives long-exposure ghost trails via persistence accumulation + lighten merge. Not the classic time-offset N-echoes-with-decay/count. |
| Keyframe loop / repeat modes (Loop and Ping-Pong) | 🟡 partial | common | Confirmed partial. scene.evalProp implements loopMode 'cycle' and 'pingpong' correctly (incl. odd-pass reversal); timeline context menu sets layer.loopMode + syncs to all animated props; rebuild re-syncs. Missing: no crossfade looping, loop is layer-wide (all props uniform, no per-property/subset loop selection). |
| Retiming Marks (intro/middle/outro time-stretch) | ❌ missing | common | Confirmed missing. Only project-level ruler markers exist (plain reference points). No per-element intro/outro protection or freeze/stretch middle regions. |
| Copy / paste and clone keyframes across layers | 🟡 partial | common | Confirmed partial. timeline copyKfAt() snapshots all animated-prop keyframes at a time (path-keyed: transform.x / effect.i.k), pasteKfAtPlayhead() re-drops onto selected layer; cross-layer works. Missing: no clone-with-timing-offset; paste is flat value+easing at playhead only. |
| Apply easing to multiple selected keyframes simultaneously | ❌ missing | common | Confirmed missing. No box-select/shift-click multi-keyframe selection (grep found no selectedKfs/marquee). Right-click on a diamond applies easing to all props sharing that single time, not a user-defined multi-time selection. |
| Spatial vs temporal interpolation set independently | ❌ missing | nice | Confirmed missing. x and y each have their own bezier but there is no separation of spatial path shape from temporal speed-along-path; no spatial path editor. |
| Incoming / outgoing keyframe velocity control | ❌ missing | common | Confirmed. Keyframe stores only {t,v,e,bez}. Bezier handles allow asymmetric in/out shaping but there are no explicit numeric in/out velocity fields per keyframe. |

## Effects & filters (full effect catalog: blur, glow, distortions, color grade, stylize, chroma/luma key, etc.)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Gaussian Blur | 🟡 partial | core | Confirmed. FM.EFFECTS 'blur' (compositor.js:31) → effectFilter emits CSS blur(Npx) at line 169; wired in inspector add-effect dropdown. CSS canvas blur, single radius param, no per-axis. Audit's line numbers are slightly off but substance correct. |
| Motion Blur | ✅ done | core | Re-audited 2026-07-10: `motionblur` is now a real per-pixel directional blur (distance+angle); plus `motionflow` content-aware temporal blur (Directional Smear / Echo Trails), shipped v2.49. |
| Directional Blur | ✅ done | core | Re-audited 2026-07-10: delivered by `motionblur`'s angle param (per-pixel blur along an arbitrary angle) and `linstreaks` (length+angle). No separately-named entry, but the capability ships. |
| Box Blur / Precise Box Blur | ✅ done | common | Re-audited 2026-07-10: `boxblur` in FM.EFFECTS with a render branch. |
| Lens Blur | ✅ done | common | Re-audited 2026-07-10: `lensblur` in FM.EFFECTS. |
| Zoom Blur | ✅ done | common | Re-audited 2026-07-10: `zoomblur` in FM.EFFECTS; also `zoomstreaks`. |
| Spin Blur | ✅ done | common | Re-audited 2026-07-10: `spinblur` in FM.EFFECTS; also `spinstreaks`. |
| Inner Blur | ✅ done | nice | Re-audited 2026-07-10: `innerblur` in FM.EFFECTS. |
| Mask Blur | ❌ missing | nice | Confirmed: drawFeatheredMaskLayer blurs the mask shape (feathering) but there is no standalone Mask Blur effect entry. |
| Glow | 🟡 partial | core | Confirmed. FM.EFFECTS 'glow' (compositor.js:39, color:true) → effectFilter emits drop-shadow(0 0 Npx color) at line 177. CSS drop-shadow halo, not luminance-based; no sub-types. |
| Inner Glow | ✅ done | common | Re-audited 2026-07-10: `innerglow` (radius+intensity+color). |
| Edge Glow | ✅ done | common | Re-audited 2026-07-10: `edgeglow` in FM.EFFECTS. |
| Soft Glow | ✅ done | common | Shipped 2026-07-10 (v2.86): `softglow` — wide low-threshold bloom (bright-pass → separable box blur → screen). compositor.js PIXEL_FX batch 26. |
| Dark Glow | ✅ done | nice | Re-audited 2026-07-10: `darkglow` in FM.EFFECTS. |
| Glow Scan | ✅ done | nice | Re-audited 2026-07-10: `glowscan` (speed+width+color). |
| Light Glow | ✅ done | common | Re-audited 2026-07-10: `lightglow` in FM.EFFECTS. |
| Lens Flare | ✅ done | nice | Re-audited 2026-07-10: `lensflare` (x/y/intensity). |
| Chroma Key | ✅ done | core | Confirmed. chromaKey() (compositor.js:63-85) per-pixel color-distance keying, memoized, filters source before keying. Integrated in media draw path (lines 898-904) with correct FX→key ordering, tainted-canvas guards. In FM.EFFECTS:41 with color+tolerance, user-addable. |
| Luma Key | ✅ done | core | Confirmed. lumaKey() (compositor.js:89-112) per-pixel luma keying with 28-unit soft edge, memoized. Stacks correctly after chroma (lines 905-908). FM.EFFECTS:42 threshold slider, wired. |
| Matte Choker | ✅ done | common | Re-audited 2026-07-10: `mattechoker` (choke px) — erode/dilate on alpha. |
| Brightness / Contrast | ✅ done | core | Confirmed. FM.EFFECTS 'brightness'/'contrast' (compositor.js:32-33) → effectFilter CSS brightness()/contrast() (lines 170-171), keyframeable, wired. |
| Exposure / Gamma | ✅ done | core | Re-audited 2026-07-10: `exposure` is now a named keyframeable EV effect (2^stops per-pixel) and `gamma` its own effect. Both live in the keyframeable effect stack, not just Color Tune. |
| Highlights and Shadows | ✅ done | core | Re-audited 2026-07-10: `highlightsshadows` effect with independent highlights + shadows params, per-pixel luma-weighted, keyframeable. |
| Saturation / Vibrance | ✅ done | core | Re-audited 2026-07-10: `saturate` plus a dedicated `vibrance` effect. |
| Color Temperature | ✅ done | core | Re-audited 2026-07-10: `temperature` (-100..100) — real per-pixel warm/cool render. |
| Hue Shift | ✅ done | core | Confirmed. FM.EFFECTS 'hue' deg 0-360 (compositor.js:35) → CSS hue-rotate() (line 173), keyframeable; also colorGrade.hue (line 182). Fully functional. |
| Color Tune (Lift/Gamma/Gain/Offset wheels) | 🟡 partial | common | Re-audited 2026-07-10: unchanged: one HSV wheel + lift/gamma/gain sliders. No four-way Shadows/Mids/Highlights/Offset wheels (the `colorbalance` R/G/B effect partly overlaps). |
| Color Curves (RGB and per-channel) | ❌ missing | common | Confirmed absent (only easing/text curves, unrelated). |
| Replace Color | ✅ done | common | Shipped 2026-07-10 (v2.86): `replacecolor` — hue-window swap (From→To colour, tolerance + soft falloff, sat/val kept). |
| Spot Color | ✅ done | nice | Shipped 2026-07-10 (v2.86): `spotcolor` — keep one hue, desaturate the rest, soft window edge. |
| Colorize | 🟡 partial | common | Confirmed. FM.EFFECTS 'tint' (compositor.js:47); drawTint (530+) maps luma→color blended by amount; also in applyPixelFx for adjustment layers (line 961). Simplified 0.299/0.587/0.114 luma, single amount param. |
| Invert | 🟡 partial | common | Confirmed present and functional. FM.EFFECTS 'invert' (compositor.js:38) → CSS invert() (line 176), keyframeable. 'Partial' only because no per-channel toggle vs AM; the core invert itself fully works. |
| Gradient Map | 🟡 partial | common | Re-audited 2026-07-10: `gradientmap` ships as a real per-pixel shadows->highlights ramp, but it is still TWO-STOP only, not an arbitrary multi-stop map. (Upgraded from missing.) |
| Channel Remap (RGB) | ✅ done | nice | Re-audited 2026-07-10: `channelremap` with RGB swap/rotate modes. |
| Channel Remap (HSV) | ✅ done | nice | Shipped 2026-07-10 (v2.86): `channelremap` gained modes 6 'Hue Invert' and 7 'Swap Sat/Val'. |
| Spectral Map | ✅ done | nice | Shipped 2026-07-10 (v2.86): `spectralmap` — luma → spectrum sweep (violet shadows → red highlights). |
| Palette Map | ❌ missing | nice | Confirmed absent. |
| Hot Color | ✅ done | nice | Re-audited 2026-07-10: ships as `thermal`, labelled 'Hot Color' — was simply mismatched by name. |
| LUT Import | ❌ missing | common | Confirmed absent. No .cube/.3dl parsing. |
| Posterize | ✅ done | common | Confirmed. FM.EFFECTS 'posterize' (compositor.js:45); drawPosterize (502-525) per-channel quantization; also applyPixelFx for adjustment layers (line 955). Keyframeable, wired. |
| Threshold | ✅ done | nice | Confirmed. FM.EFFECTS 'threshold' (compositor.js:48); drawThreshold (563+) luma 2-tone; applyPixelFx (line 958). Wired, keyframeable. |
| Contour Gradient | ❌ missing | nice | Confirmed absent. |
| Contour Lines | ✅ done | nice | Re-audited 2026-07-10: `contourlines` in FM.EFFECTS + POSTFX. |
| Contour Strips | ✅ done | nice | Re-audited 2026-07-10: `contourstrips` in FM.EFFECTS + POSTFX. |
| Turbulent Displace | ❌ missing | common | Confirmed. wnoise() is wiggle position jitter only, no pixel displacement. |
| Wave Warp | ✅ done | common | Re-audited 2026-07-10: `wave` ('Wave') in FM.EFFECTS + POSTFX. |
| Displacement Map | ❌ missing | common | Confirmed absent. |
| Bump Map | ✅ done | common | Re-audited 2026-07-10: `bumpmap` ('Bump Map') in FM.EFFECTS + POSTFX. |
| Pinch / Bulge | ✅ done | common | Re-audited 2026-07-10: `bulge` ('Pinch / Bulge') in FM.EFFECTS + POSTFX. |
| Inner Pinch / Bulge | ✅ done | nice | Re-audited 2026-07-10: `innerpinch` ('Inner Pinch') in FM.EFFECTS + POSTFX. |
| Swirl | ✅ done | common | Re-audited 2026-07-10: ships as `twirl` ('Twirl'). |
| Polar Coordinates | ✅ done | nice | Re-audited 2026-07-10: `polarcoords` in FM.EFFECTS + POSTFX. |
| Polar Displacement Map | ❌ missing | nice | Confirmed absent. |
| Bend | ✅ done | nice | Re-audited 2026-07-10: `bend` in FM.EFFECTS + POSTFX. |
| Curl | ✅ done | nice | Re-audited 2026-07-10: `curl` in FM.EFFECTS + POSTFX. |
| Fractal Warp | ✅ done | nice | Re-audited 2026-07-10: `fractalwarp` in FM.EFFECTS + POSTFX. |
| Squeeze | ✅ done | nice | Re-audited 2026-07-10: `squeeze` in FM.EFFECTS + POSTFX. |
| Tunnel | ✅ done | nice | Shipped 2026-07-10 (v2.86): `tunnel` — radial-inversion warp in WARP_FX, amount-blended. |
| Spherize | ✅ done | nice | Re-audited 2026-07-10: `sphere3d` is labelled 'Spherize'; `fisheye` also ships. |
| Kaleidoscope | ✅ done | common | Re-audited 2026-07-10: `kaleidoscope` in FM.EFFECTS + POSTFX (distinct from `mirror`). |
| Mirror | ✅ done | common | Confirmed. FM.EFFECTS 'mirror' 4 modes (compositor.js:46); drawMirror (626-658) renders mirrored halves; wired as dropdown. POSTFX, works on layers. |
| RGB Split | ✅ done | common | Confirmed. FM.EFFECTS 'rgbsplit' (compositor.js:43); drawRgbSplit (463-498) per-pixel R/B horizontal shift; also applyPixelFx for adjustment layers (lines 940-953). Keyframeable, wired. |
| Vignette | ✅ done | core | Fixed 2026-07-10 (v2.86): now renders on EVERY layer type. Media keeps its inline clip-bounds draw; text/shape/path/group route through a new PIXEL_FX.vignette (comp-space) instead of silently ignoring the effect. |
| Sharpen | ✅ done | common | Re-audited 2026-07-10: `sharpen` in FM.EFFECTS + POSTFX. |
| Unsharp Mask | ✅ done | common | Re-audited 2026-07-10: `unsharpmask` in FM.EFFECTS + POSTFX. |
| Noise | ✅ done | common | Re-audited 2026-07-10: `noise` ('Noise') is a real pixel-grain effect (distinct from wiggle's `wnoise`). |
| Block Noise | ✅ done | nice | Re-audited 2026-07-10: `blocknoise` in FM.EFFECTS + POSTFX. |
| Pixelate / Mosaic | ✅ done | common | Confirmed. FM.EFFECTS 'pixelate' (compositor.js:44); drawPixelate (662-691) down/up-scale with smoothing off; adjustment-layer path at lines 987-998. Wired, keyframeable. |
| Find Edges | ✅ done | nice | Re-audited 2026-07-10: `edge` ('Find Edges') in FM.EFFECTS + POSTFX. |
| Electric Edges | ✅ done | nice | Re-audited 2026-07-10: `electricedges` in FM.EFFECTS + POSTFX. |
| Roughen Edges | ✅ done | common | Re-audited 2026-07-10: `roughenedges` in FM.EFFECTS + POSTFX. |
| Smooth Edges | ✅ done | nice | Re-audited 2026-07-10: `smoothedges` in FM.EFFECTS + POSTFX. |
| Omino Glass | 🟡 partial | nice | Re-audited 2026-07-10: a generic `glass` ('Glass') distortion ships; not the branded Omino variant. |
| Omino Diffusion+ | ❌ missing | nice | Confirmed absent. |
| Copy Background | ✅ done | common | Re-audited 2026-07-10: shipped v2.55. `copybg` effect def + `drawCopyBg` + `FM.hasCopyBg`; featured in the fx browser. |
| Fill Behind | ❌ missing | common | Confirmed absent. |
| Magnify Background | ❌ missing | nice | Confirmed absent. |
| Echo Keyframes (motion trails) | 🟡 partial | nice | Re-audited 2026-07-10: `motionflow`'s Echo style gives long-exposure echo trails; not discrete time-offset keyframe echoes. |
| Time Quantization | ❌ missing | nice | Confirmed absent. |
| Particle Emitter | ❌ missing | common | Confirmed: no particle layer type in scene.js, none in FM.EFFECTS. |
| 3D Shape Effects | ✅ done | nice | Re-audited 2026-07-10: a whole faux-3D mesh batch ships — cube3d, box3d, sphere3d, heart3d, axiscross3d etc. via CANVAS_FX (hand-rolled triangle painter, still 2D canvas). |
| 360 Viewer / Reorient Sphere | ❌ missing | nice | Confirmed absent. |
| Halftone Dots / Lines | ✅ done | nice | Re-audited 2026-07-10: `halftone` + `halftonelines` in FM.EFFECTS + POSTFX. |
| Clouds / Fractal Ridges | ✅ done | nice | Re-audited 2026-07-10: `clouds` + `fractalridges` in FM.EFFECTS + POSTFX. |
| Voronoi Cells | ✅ done | nice | Shipped 2026-07-10 (v2.86): `voronoi` — jittered-grid stained-glass mosaic (deterministic hash seeds, O(9)/px, Edge darkening). |
| Radial Rays | ✅ done | nice | Re-audited 2026-07-10: `rays` ('Radial Rays') in FM.EFFECTS + POSTFX. |
| Rays | ✅ done | nice | Re-audited 2026-07-10: covered by `rays` + `lightglow`. |
| Long Shadow | ✅ done | nice | Re-audited 2026-07-10: `longshadow` in FM.EFFECTS + POSTFX. |
| Radial Shadow | ✅ done | nice | Shipped 2026-07-10 (v2.86): `radialshadow` — point-light shadow (Light X/Y + Reach, 10-tap march toward the light). |
| Smooth Bevel | ✅ done | nice | Re-audited 2026-07-10: `smoothbevel` in FM.EFFECTS + POSTFX. |
| Raster Extrude | ✅ done | nice | Re-audited 2026-07-10: `rasterextrude` in FM.EFFECTS + POSTFX. |
| Layer Styles Presets | 🟡 partial | common | Confirmed. FM.fxPresets (inspector.js:160-174) with 4 builtins (VHS Glitch/Duotone/Dreamy/Comic) + localStorage user stacks; UI chips with apply/delete/save (lines 207-227). Covers only implemented effects, not full AM style catalog. |
| Blend Modes (20+) | ✅ done | core | Re-audited 2026-07-10: BLEND map is now 17 standard modes (hue/saturation/color/luminosity added) + 2 mask modes = 19 entries. `FM.BLEND_MODES` exposed to every layer type. |
| Auto-Shake / Random Jitter | ✅ done | common | Confirmed. wiggleOffset() (compositor.js:193-198) applies deterministic incommensurate-sine noise to position; UI inspector.js:608-613 (enabled/amount/speed); applied in drawLayer line 749/750. Procedural, exports identically. |
| Turbulence (position-based) | ✅ done | common | Confirmed: same wiggleOffset/wnoise system as Auto-Shake; functionally equivalent to AM position turbulence. |

## Layers &amp; compositing (layer types, groups/precomps, blend modes, adjustment layers, parenting/null/rig)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Video clip layer | ✅ done | core | Confirmed: makeLayer handles non-text/shape/null kinds; drawLayer renders m.el for media; loadVideoFile in media.js; addMediaLayer in app.js wired to file-input video/*. |
| Image layer | ✅ done | core | Confirmed: loadImageFile path + same drawLayer media branch; imported via handleFiles for image/* files. |
| Text layer | ✅ done | core | Confirmed: makeLayer('text') with full props; compositor text branch (font/align/stroke/gradient/curve/anim/captions); addTextLayer wired to btn-add-text; inspector 'element' controls present. |
| Shape / vector layer | ✅ done | core | Confirmed: compositor renders rect/ellipse/line/polygon/triangle/star/heart with fill/gradient/stroke/cornerRadius; inspector exposes ALL seven shape kinds in a selector (line 573); addShapeLayer wired to Add menu (only Rectangle/Ellipse shown there but selector switches kind). |
| Audio layer | ✅ done | core | Re-audited 2026-07-10: file-input accept is now video/*,image/*,audio/*; an Audio tab exists in the add menu; handleFiles routes audio/* to addMediaLayer (mp3/wav ride the video path with a 0x0 picture). |
| Null object layer | ✅ done | common | Confirmed: addNullLayer; drawLayer returns early for type==='null'; renderThumb draws crosshair; in Add menu as 'Null (rig control)'. |
| Camera object layer | ✅ done | common | Confirmed: addCameraLayer (enforces one camera, toasts otherwise); renderScene renders scene to _camCv then composites through camera x/y/scale/rotation; thumb drawn. |
| Multi-layer stacking / stacking order | ✅ done | core | Confirmed: renderScene iterates layers high-index-first so layers[0] draws last (top); reorderLayer in app.js; track-head drag in timeline.js. |
| Layer visibility (eye) and locking | ✅ done | core | Confirmed: timeline th-eye toggles visible, th-lock toggles locked; isLayerVisibleAt gates drawing; locked layers skipped in edit/keyboard ops. |
| Layer solo | 🟡 partial | common | Re-audited 2026-07-10: **REGRESSION.** The engine still honours it — `renderScene` computes `soloActive` and skips non-soloed layers (compositor.js:3097), and exporter.js:98 gates the audio mix the same way. But the timeline's `th-solo` 'S' button is GONE: timeline.js and index.html contain zero `th-solo` references (styles.css still has 4 orphaned `.th-solo` rules). The only writer of `layer.solo` is now `ai-ops.js:66`, so solo is unreachable from the UI. Likely lost in the mobile timeline rebuild. |
| Layer renaming and color-coding | ✅ done | common | Re-audited 2026-07-10: colour tag is now manual: `FM.setLayerLabel` + a swatch strip in the ⋯ menu, rendered as a `labelColor` stripe on the layer header. The 'no manual colour UI' claim is stale. |
| Layer grouping | ✅ done | core | Re-audited 2026-07-10: shipped v2.33/v2.38. `FM.addGroup`/`FM.ungroup`/`FM.groupDescendants`; real type==='group' layers; `collectGroupUnits`/`drawGroupUnit` flatten a unit; collapsible group rows in the timeline. |
| Elements (nested compositions / precomps) | 🟡 partial | common | Re-audited 2026-07-10: `FM.elements` saves a selection and re-inserts it (Elements tab in the add menu), but `insert()` re-IDs layers -> independent COPIES, not a live nested comp. Reusable-asset library yes; true precomp nesting no. |
| Blend modes per layer | ✅ done | core | Confirmed: BLEND map has exactly 13 modes; FM.BLEND_MODES exposed; inspector selectRow('Blend mode', …, FM.BLEND_MODES) at line 446. No 'hue/saturation/color/luminosity' separable blend modes (canvas GCO limitation), but the 13 common ones are wired. |
| Per-layer opacity | ✅ done | core | Confirmed: transform.opacity default 1; drawLayer reads evalProp(tr.opacity); inspector 'blend' category + keyframeable. |
| Masking groups (composited alpha-holdout groups) | ✅ done | core | Re-audited 2026-07-10: `{mask:true}` groups set `maskGroup`; `collectGroupUnits` derives a `maskId` from the top member and `drawGroupUnit` clips the flattened unit to it via destination-in. |
| Per-layer masks (rect, oval, pen/Bezier) | 🟡 partial | core | Confirmed: applyMaskClip + drawFeatheredMaskLayer support rect/ellipse/polygon with feather + invert; inspector exposes shape (rect/ellipse/polygon), X/Y/W/H, sides, feather, invert. No freeform pen/Bezier path mask. |
| Clipping mask (clip to layer below) | ✅ done | common | Re-audited 2026-07-10: `FM.toggleClippingMask` sets blendMode 'mask-include'; 'Create Clipping Mask' is in the layer context menu (v2.54). |
| Chroma key (green/blue screen) | ✅ done | common | Confirmed: chromaKey() per-pixel Euclidean distance + memo; 'chromakey' in FM.EFFECTS (tolerance+color); drawLayer applies before composite; inspector effectsSection renders it. |
| Luma key | ✅ done | common | Confirmed: lumaKey() with 28-unit soft ramp; 'lumakey' in FM.EFFECTS; applied in drawLayer media branch alongside chromakey. |
| Video transparency (alpha channel) | ❔ unknown | common | Confirmed code does NOT strip alpha — drawImage(src,…) passes browser-decoded alpha straight through, so WebM/alpha would composite if the browser decodes it. But there is no explicit alpha detection/flag/test, so behavior depends entirely on codec support. 'unknown' is the right call. |
| Adjustment-layer behavior (Copy Background equivalent) | ✅ done | common | Re-audited 2026-07-10: native adjustment layer PLUS a literal `copybg` effect (`drawCopyBg`, `FM.hasCopyBg`), featured in the fx browser. The rationale for 'partial' no longer holds. |
| Layer parenting (parent-child hierarchy) | ✅ done | common | Confirmed: layer.parent + isAncestor cycle guard; applyParentChain walks chain root-first composing translate/rotate/scale; inspector parent picker excludes cycle candidates; multi-level chains work. |
| Parenting Helper effect (weighted motion inheritance) | 🟡 partial | nice | Confirmed: applyParentRotMode implements normal/locked/weighted via parentMode + parentWeight; inspector exposes the dropdown + weight slider. No 'Auto Rotate' (orient-to-motion-direction) mode — grep finds none. |
| Character rigging via parenting | 🟡 partial | nice | Confirmed: full parenting infra (multi-level chains, nulls, rotation modes) present and usable for rigs, but no dedicated rig tooling / bone presets / character UI. Manual only. |

## Masking & shapes (vector masks, shape primitives, pen/path, mask feather/invert, stroke/fill)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Shape layer type (dedicated vector shape layer) | ✅ done | core | Confirmed: scene.js makeLayer() type==='shape' (lines 229-237) with live props shape/shapeW/shapeH/fill/stroke/cornerRadius/sides. compositor.js drawLayer() shape branch at line 812. app.js FM.addShapeLayer() line 320. Never flattened. |
| Built-in shape primitives (rectangle, ellipse, polygon, star, arrow, line, pie) | ✅ done | core | Re-audited 2026-07-10: `arrow` and `pie` both ship (SHAPE_POLYS.arrow; kind==='pie'), and the add menu exposes Pie/Arrow directly. 'No arrow, no pie' is stale. |
| Pen tool for freeform vector paths | ✅ done | core | Re-audited 2026-07-10: draw-tool.js vector mode (anchor dots + closing dash) -> `FM.addPathLayer` creates a real `path` layer. Shortcut Shift+3. |
| Edit Points mode — anchor point & Bezier handle manipulation | ✅ done | core | Re-audited 2026-07-10: shipped v2.47. point-edit.js is a full editor; `FM.shapeToPoints` converts any primitive; inspector has Edit Points with curve/corner + delete. |
| Convert to Outline (flatten parametric shape to editable bezier path) | ✅ done | common | Re-audited 2026-07-10: `FM.convertToOutline` (app.js) + a 'Convert to Outline' context-menu item (v2.54). NOTE: gated to shape layers — text glyphs are still not convertible. |
| Solid fill on shapes | ✅ done | core | Confirmed: compositor.js line 855 fills layer.fill (default '#3a7bd5'). inspector.js 576-578 colorField for fill. Line-shape uses fill as its stroke color (852). |
| Gradient fill on shapes (linear, radial, angular) | ✅ done | common | Re-audited 2026-07-10: angular shipped v2.45 — `createConicGradient` in buildGradient with a seamless 0/0.5/1 wrap; inspector has an Angular tab. Still 2-stop and not keyframeable. |
| Stroke (border/outline) on shapes and text | ✅ done | core | Confirmed: compositor.js 857 strokes when stk.enabled && width>0. inspector 589-594 (shapes) and text path. scene.js initializes stroke for shapes (234) and text (226). No cap/join-style or end-decoration controls. |
| Stroke Taper effect | ❌ missing | nice | Confirmed missing. Not in FM.EFFECTS (30-50); grep for taper finds nothing. |
| Drawing Progress effect (animated stroke draw-on) | ❌ missing | common | Confirmed missing. No drawing-progress/trim-path effect; grep finds nothing. |
| Freehand drawing layer (brush-based, raster strokes) | ✅ done | common | Re-audited 2026-07-10: shipped v2.39. draw-tool.js freehand mode -> `FM.addPathLayer(points,{closed:false,name:'Freehand'})`. Shortcut Shift+2. (Vector path, not raster — arguably better.) |
| Vector masking (apply vector shape as a layer mask) | ✅ done | core | Confirmed: applyMaskClip() (352-359) clips to Path2D; drawFeatheredMaskLayer() (364-398) for feathered. inspector 616-639 toggles layer.mask. Called in drawLayer at 754 / routed at 727. |
| Mask shapes: rectangle, oval, pen/freeform Bezier | ✅ done | core | Re-audited 2026-07-10: masking groups let ANY layer be the mask, so a vector/freeform path layer (draw-tool or Edit Points) now serves as a freeform Bezier mask. |
| Mask feathering (edge softness) | ✅ done | core | Confirmed: drawFeatheredMaskLayer() applies blur(feather) at line 385 to the offscreen mask before destination-in/out composite. inspector Feather row 638; routed when feather>0 at line 727. |
| Mask expansion (contract / expand mask boundary) | 🟡 partial | common | Re-audited 2026-07-10: no dedicated per-mask field, but the Matte Choker effect (erode/dilate on alpha, choke -20..+20) applied to a mask layer expands/contracts the matte. |
| Mask opacity | 🟡 partial | common | Re-audited 2026-07-10: no `mask.opacity` field, but a masking-group mask is a real layer, so its transform.opacity attenuates the matte through the destination-in composite. |
| Mask invert / Exclude mode | ✅ done | core | Confirmed: applyMaskClip() invert path uses full-rect + evenodd (356-358); drawFeatheredMaskLayer() switches to destination-out when invert (379). inspector Invert checkbox 639. |
| Multiple masks per layer | ❌ missing | common | Confirmed missing. layer.mask is a single object; applyMaskClip/addMaskShape read singular layer.mask; grep finds no mask array or add-mask. No mask stack. |
| Animated masks (keyframeable shape, position, feather, opacity) | 🟡 partial | core | Re-audited 2026-07-10: a mask is now a real layer, so position/scale/rotation/opacity keyframe via the normal transform path and feather via a keyframeable blur effect. Per-point SHAPE morphing over time is still not a keyframe channel. |
| Clipping mask (parent-child layer clip) | ✅ done | common | Re-audited 2026-07-10: `FM.toggleClippingMask` + mask-include/exclude blend modes (destination-in/out); masking groups composite as a unit. |
| Alpha mask (transparency-channel mask) | ✅ done | common | Re-audited 2026-07-10: a masking group / mask-include clips by the mask layer's rendered ALPHA (destination-in) — that is an alpha track-matte. |
| Luma mask (brightness-based mask) | ❌ missing | common | Re-audited 2026-07-10: still absent. Grepped luma.?matte, luma.?mask, luminance.?matte — only `lumakey` (a self-keying effect on a layer's own content). Matte compositing is alpha-only. Cheap-ish: add a luma-matte mode that converts the mask layer to luminance-alpha before destination-in. |
| Boolean shape operations (Union, Subtract, Intersect) | ❌ missing | nice | Confirmed missing. grep for union/subtract/intersect/boolean finds no shape-combine logic. |
| Move Along Path effect | ❌ missing | common | Confirmed missing. Not in FM.EFFECTS; grep for along-path finds nothing. |
| Repeat Along Path effect | ❌ missing | nice | Confirmed missing. No such effect anywhere. |
| Use text or shape outlines as masks | ✅ done | nice | Re-audited 2026-07-10: in a masking group the mask layer is drawn by type, so a text layer's glyph alpha or a shape/path outline becomes the matte. |

## Camera & 3D (camera layer, position/scale/rotation/anchor, pan/zoom, 3D layers/perspective)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Camera Object layer | ✅ done | core | Confirmed. app.js:369 FM.addCameraLayer creates type='camera' layer; reachable from timeline ctx menu (timeline.js:441) and add-layer menu (app.js:790). compositor.js:1015-1051 routes the whole composite through the first visible camera via an offscreen canvas. |
| Camera X/Y/Z position (pan and depth) | 🟡 partial | core | Confirmed. X/Y pan fully implemented (inspector.js:414-415 Pan X/Y; canvas-edit.js:77/107-112 drag-pan; compositor.js:1041 reads camX/camY). Z/depth absent — transform has only x,y,scale,rotation,opacity,anchorX,anchorY (scene.js:206-214); grep for perspective/depth/posZ across js/ returns zero. |
| Camera rotation (roll/tilt/pan) | ✅ done | core | Confirmed done, but the audit's evidence is partly wrong: rotation is edited only via the inspector (inspector.js:417). The canvas rotate handle (canvas-edit.js:97-98) is UNREACHABLE for a camera because the selection box is hidden for cameras (canvas-edit.js:169). Compositor applies ctx.rotate(rot) at line 1042/1047 — roll works. |
| Zoom Distance and View Angle (field of view) | ❌ missing | core | Confirmed. No viewAngle/FOV/zoomDistance anywhere. Camera 'Zoom' is a flat 2D ctx.scale (compositor.js:1040/1047), no perspective projection. |
| Active Camera / Default Camera system | ❌ missing | core | Confirmed. app.js:371 blocks a second camera ('Scene already has a camera'). compositor.js:1015 uses .find() (first match). No camera-cut / multi-camera / default-vs-active concept. |
| Keyframe animation of all camera properties | 🟡 partial | core | Confirmed. x/y/scale/rotation keyframe via the shared setTransform/toggleKeyframe/evalProp path (scene.js:93-117) and render diamonds (inspector.js:414-417). Focus/fog/Z/FOV/exposure don't exist, so cannot be keyframed. |
| Layer Z-axis (depth) positioning | ✅ done | core | Re-audited 2026-07-10: `transform.z` applied as a weak-perspective about the project centre in `applyLayerTransform`; inspector exposes a Z box (MT_PROPS.move = x,y,z). |
| Layer position, scale, rotation transform properties | ✅ done | core | Confirmed. scene.js:207-211 init x/y/scale/rotation; inspector.js:414-417 exposes keyframeable rows; canvas-edit.js handles drag-move/scale/rotate; compositor.js:748-752 applies the transform stack. |
| Pivot point / Anchor point | ✅ done | core | Confirmed. scene.js:212-213 anchorX/Y=0.5; inspector.js:439-440 Anchor X/Y sliders with position compensation (lines 420-436); compositor uses anchor as draw origin. |
| Focus Blur (depth of field) on Camera layer | ❌ missing | common | Confirmed. No focusDistance/depthOfField/DOF anywhere. Camera inspector limited to transform category (inspector.js:377-380). |
| Fog effect on Camera layer | ❌ missing | common | Confirmed. grep for 'fog' across js/ returns zero hits. |
| Motion Blur on Camera layer | 🟡 partial | common | Confirmed. Per-layer transform motion blur exists (compositor.js:400-441; inspector.js shutter/samples). Camera is skipped from layer drawing (compositor.js:1033) and the inspector restricts the camera to transform-only, so no camera-level motion blur with Position/Scale/Angle toggles. |
| Layer Parenting and Null Objects | ✅ done | common | Confirmed. scene.js:203-205 parent/parentMode/parentWeight; compositor.js:200-237 cycle-safe applyParentChain + rotation modes; inspector.js:480-499 Parent picker w/ Normal/Locked/Weighted; app.js:309/timeline.js:439 addNullLayer (invisible type='null'). |
| Parallax depth rig via Z-layering and camera | 🟡 partial | common | Re-audited 2026-07-10: layer Z now gives depth-based scale/offset toward a vanishing point, so a Z-layered depth rig is buildable. But camera pan still draws the flat composite uniformly — no camera-driven DIFFERENTIAL parallax. |
| Preview Pan and Zoom (editor viewport navigation) | ❌ missing | common | Confirmed. Wheel-zoom and drag-pan (canvas-edit.js:107-112/146-162) write the CAMERA layer's transform; with no camera selected, wheel returns early (line 148). No independent editor viewport offset/scale. |
| Cube effect (faux-3D box from layer texture) | ✅ done | common | Re-audited 2026-07-10: `cube3d` textured-mesh effect (hand-rolled triangle painter on 2D canvas). |
| Box effect (faux-3D box with beveling) | ✅ done | common | Re-audited 2026-07-10: `box3d` effect with Depth/Size/Shading. |
| Raster Extrude effect | ✅ done | common | Re-audited 2026-07-10: `rasterextrude` effect with Depth/Angle/Side-Darken. |
| Parenting Helper effect | 🟡 partial | common | Confirmed. Normal/Locked/Weighted rotation modes implemented (inspector.js:494; compositor.js:231-236). No AM 'Auto Rotate' mode — grep for auto.?rotate returns zero. It's a per-layer setting, not a separate effect. |
| Oscillate effect (camera/layer shake) | ✅ done | common | Re-audited 2026-07-10: addable 'move' effect family: wiggle/shake/swing/spin/pulse/drift/orbit. swing is angular oscillation; amplitude/frequency/twist params cover AM's Oscillate. |
| Auto-Shake effect | ✅ done | common | Re-audited 2026-07-10: dedicated addable `shake` effect (amount/speed/twist) on top of the deterministic `wiggleOffset`. |
| Skew / perspective distortion transform | ✅ done | common | Re-audited 2026-07-10: `skewX`/`skewY` applied via ctx.transform; inspector has a Skew mode (MT_MODES) with X/Y Skew inputs. Plus transform.z perspective. |
| 3D lighting system (Point/Directional/Spot/Area/Ambient) | ❌ missing | nice | Confirmed. No light types/intensity/shadow/specular. Renderer is pure 2D canvas. |
| 3D object import (.obj, .glb, .gltf) | ❌ missing | nice | Confirmed. No gltf/glb/obj references in js/. |
| 3D text layer with extrusion, bevel, and lighting | 🟡 partial | nice | Re-audited 2026-07-10: no dedicated text3d type, but `rasterextrude` + `smoothbevel` applied to a text layer's raster give extruded, bevelled, key-lit text. No independent 3D text rotation. |
| Camera Scale property (wireframe coverage) | ❌ missing | nice | Confirmed. No cameraScale/wireframe coverage. The camera glyph in renderThumb (compositor.js:1097-1101) is a fixed thumbnail icon only. |
| Camera Exposure control | 🟡 partial | nice | Re-audited 2026-07-10: `exposure` now exists as a keyframeable colour effect, but it is not a camera property (the camera inspector is transform-only). Achievable, just not camera-bound. |
| Camera immunity to layer effects and parent transforms | 🟡 partial | nice | Refined. Effect immunity confirmed (compositor.js:1033 skips camera). Parent immunity is stronger in practice than the audit implied: the camera composite (compositor.js:1038-1050) reads cam.transform directly via evalProp and never calls applyParentChain, AND the Parent picker is hidden because catsFor(camera) returns only the transform category (inspector.js:377-380). So a parent can't be set via UI and would be ignored by the composite anyway. Still no explicit guard, so a programmatic/AI scene edit could set layer.parent with no effect — partial is fair. |
| Move along path effect (curved motion for parented layers) | ❌ missing | nice | Confirmed. No movePath/followPath; keyframes interpolate linearly/bezier on value only (scene.js:70-79); no vector path to follow. |

## Text & typography (fonts, styling, gradients, stroke, text animation presets, curved/path text)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Font family selection from built-in library | 🟡 partial | core | Confirmed inspector.js:310 FONTS = 10 system-stack strings; <select> built at 505-509, wired to layer.fontFamily and read at compositor.js:760. Works but only 10 fonts. |
| Custom font import (TTF / OTF) | ✅ done | core | Re-audited 2026-07-10: `FM.fonts` with FontFace + IndexedDB persistence (import/pick/rehydrateAll/remove); picker accepts .ttf/.otf/.woff/.woff2/.ttc; wired to an 'Import font' button in the text editor. |
| Font style variants (bold, italic, underline) | 🟡 partial | core | Confirmed bold/italic toggles inspector.js:521-525 wired into compositor font string (760). grep for 'underline' across all js returns nothing — underline truly absent. |
| Font size and scale | ✅ done | core | Confirmed inspector.js:510 numeric Size input wired to layer.fontSize; transform scale keyframeable separately. Canvas vector text stays sharp. |
| Text alignment (left, center, right) | ✅ done | core | Confirmed inspector.js:511-518 L/C/R buttons set layer.align; compositor.js:758 ctx.textAlign and drawAnimatedText honour it. (Note: curved-text path ignores align — see bugs.) |
| Solid color fill | ✅ done | core | Confirmed inspector.js:453-456 colorField sets layer.color; compositor.js:757 ctx.fillStyle=layer.color. Not keyframeable (direct field assignment). |
| Gradient fill for text (linear, radial, angular) | ✅ done | core | Re-audited 2026-07-10: angular shipped — createConicGradient + an Angular tab; text samples the gradient per glyph. Still 2-stop and not keyframeable. |
| Transparent / no fill | ❌ missing | common | Confirmed: no fill-off toggle for text; compositor.js:757 always sets fillStyle then fillText. Stroke-only text not achievable. |
| Stroke / outline with color and width | ✅ done | core | Confirmed inspector.js:531-539 Outline check + width + color; compositor.js:800-809 strokeText with doubled lineWidth before fill (correct outside-stroke). Also in drawAnimatedText:299 and drawArcLine:327. |
| Drop shadow | ✅ done | core | Re-audited 2026-07-10: rebuilt in v2.83 Border & Shadow: layer.shadow = {enabled,blur,dx,dy,color,alpha}. `alpha` is the opacity control the old note said was missing, and blur/dx/dy/colour/alpha are all keyframeable. |
| Glow effects (Light Glow, Soft Glow, Dark Glow) | ✅ done | common | Complete as of v2.86: `lightglow` + `darkglow` shipped earlier; `softglow` closes the set (plus `glow`, `innerglow`, `edgeglow`, `glowscan`). |
| Letter spacing (tracking) control | 🟡 partial | core | Confirmed inspector.js:528 Spacing rangeRow -> layer.letterSpacing; compositor.js:761 ctx.letterSpacing behind 'letterSpacing' in ctx guard. Not keyframeable; no-ops in browsers lacking canvas letterSpacing (see bugs). |
| Line height (line spacing) control | 🟡 partial | core | Confirmed inspector.js:529 Line height rangeRow; compositor.js:765 lh = fontSize*lineHeight. Wired, not keyframeable (direct field). |
| Text Spacing effect (random / even spacing animation) | ✅ done | common | Re-audited 2026-07-10: a `textspacing` effect sets st.letterSpacing from `FM.evalProp(p.spacing,t)` — keyframeable. Registered text-only. |
| Text Progress effect (character-by-character typewriter reveal) | ✅ done | common | Re-audited 2026-07-10: a dedicated `textprogress` effect slices the string by a keyframeable 0-1 `progress` param — the continuous control the old note said was missing. |
| Text Randomizer effect (scramble / matrix-style characters) | ✅ done | common | Re-audited 2026-07-10: a `textrandomizer` effect with a TEXT_SCRAMBLE charset + keyframeable progress and speed. |
| Text Transform effect (per-letter/word/line animation) | 🟡 partial | nice | Confirmed drawAnimatedText (245-307) staggers char/word/line with 5 reveal presets, but no independent per-unit position/scale/rotation animator. Stagger-reveal, not AE-style text animator. |
| Scrolling text presets (30 built-in scrolling title animations) | ❌ missing | common | Confirmed: no scrolling effect type, no scroll preset list, no ticker logic. Presets are reveals only. |
| Layer styles for text (30 built-in style presets) | ❌ missing | common | Confirmed FM.fxPresets (inspector.js:160-166) holds 4 builtin EFFECT-stack presets (VHS Glitch/Duotone/Dreamy/Comic), not text fill+stroke+shadow style presets. No 30-style concept. |
| Keyframe animation of all text properties | 🟡 partial | core | Confirmed transform props (x/y/scale/rotation/opacity) keyframeable via setTransform; effect params via setProp. But color/fontSize/letterSpacing/lineHeight/fontFamily/bold/italic use colorField/rangeRow/textRow with plain field assignment (no setProp, no diamond) -> not keyframeable. |
| 27 blending modes for text layers | 🟡 partial | common | Confirmed BLEND object (compositor.js:11-25) has 13 modes; FM.BLEND_MODES applied to all layer types incl. text. 13 of AM's 27. |
| Mask / clipping using text layer outlines | 🟡 partial | common | Re-audited 2026-07-10: mask-include/mask-exclude blend modes are exposed for any layer including text, so a text layer clips layers below to its glyph alpha. No dedicated 'use as matte' toggle, hence partial. |
| Convert text to vector outline (iOS/iPadOS) | ❌ missing | nice | Confirmed: no Convert-to-Outline / glyph-path extraction anywhere. Canvas 2D has no glyph-outline API. |
| Curved / arched text via Bend effect | ✅ done | nice | Confirmed inspector.js:530 Curve range (-180..180) -> layer.textCurve; compositor.js drawArcLine (311-333) places chars on a circular arc with per-char rotation; invoked at 796-797 when \|curve\|>0.5. Native arc renderer. (Has quality limitations — see bugs.) |
| Contour Gradient effect (gradient glow around text edges) | ❌ missing | nice | Confirmed: no contour/edge-detect gradient effect in FM.EFFECTS or elsewhere. |
| Motion blur on text | ✅ done | common | Confirmed inspector.js:599-604 motion-blur controls available to all layer types; compositor.js drawMotionBlur averages sub-frames; applies to text (no exclusion). |
| Preset / XML import of community text animations | ❌ missing | common | Confirmed fxPresets is localStorage-only save/load of effect stacks. No XML parse, no file import, no community library. |

## Color, fill & gradients (solid/gradient fills, color themes/palettes, eyedropper, swatches)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Solid color fill for shapes and text layers | ✅ done | core | Confirmed. Shape fill: inspector.js:577 colorField(()=>layer.fill) wired; compositor.js:855 ctx.fillStyle uses layer.fill (or gradient). Text color: inspector.js:455 colorField(()=>layer.color); compositor.js:757 ctx.fillStyle=layer.color. End-to-end. |
| Gradient fill for shapes and text layers (linear, radial, and angular types) | ✅ done | core | Re-audited 2026-07-10: angular shipped v2.45 (createConicGradient + Angular button + angle row). All three types render. Still 2-stop; stops not keyframeable. |
| Color picker with color wheel, hex input, RGB and HSL/CMYK sliders, and alpha/opacity control | 🟡 partial | core | Confirmed. colorField (inspector.js:131-155) = native <input type=color> swatch + hex text input only. No RGB/HSL/CMYK sliders, no per-color alpha. color-wheel.js is a hue/sat GRADING wheel (writes colorGrade), not a color chooser. Layer opacity is a separate transform prop. |
| Mini (floating) color picker — adjust color while seeing canvas in real time | 🟡 partial | common | Re-audited 2026-07-10: a floating colour popover exists in the text editor (openPop -> buildColorPop, anchored over the live canvas). Not universal — the inspector still opens the native OS dialog. |
| Eyedropper / color sampler tool | ✅ done | core | Re-audited 2026-07-10: js/eyedropper.js — `FM.eyedropper`, wired into colorField and canvas-tap ownership. Samples the preview canvas (iOS-safe). |
| Custom color swatches palette — save, add, and remove project colors | 🟡 partial | common | Re-audited 2026-07-10: the 'in-memory only' claim is FALSE — recents persist via localStorage 'fm.recentColors' and rehydrate on load. Still auto-populated recents with no manual add/remove and no named palette, so status stays partial. |
| Full-screen palette editor with row rearrangement | ❌ missing | common | Confirmed. No palette editor or rearrangement UI anywhere. |
| Stroke/outline color (solid color on layer stroke) | ✅ done | core | Confirmed. Shape stroke: inspector.js:589-594 toggle+width+colorField; compositor.js:857 strokeStyle=stk.color. Text outline: inspector.js:533-538 toggle+width+colorField; compositor.js:805 strokeStyle=stk.color. Line shapes use layer.fill as color (inspector.js:576). Wired. |
| Gradient Map effect (luma-to-gradient color remapping) | 🟡 partial | common | Re-audited 2026-07-10: `gradientmap` ships (luma -> shadows/highlights lerp) but is two-stop only, not an arbitrary multi-stop map. |
| Four-Color Gradient effect (four individually positioned color points) | ✅ done | common | Shipped 2026-07-10 (v2.86): `fourcolor` — bilinear blend of 4 corner colours over opaque pixels; registry + inspector gained generic color3/color4 picker support. Corner positions are fixed (not draggable points). |
| Gradient Overlay effect (two-color overlay on layer opaque areas) | ✅ done | common | Re-audited 2026-07-10: `gradientoverlay` (angle + amount + start/end colours) blended over opaque pixels. |
| Contour Gradient effect (gradient radiating from layer edges) | ❌ missing | nice | Confirmed. No contour-gradient / edge-radiating effect. |
| Colorize effect (tint a layer while preserving luminance) | ✅ done | common | Re-audited 2026-07-10: a dedicated `colorize` entry now exists, separate from `tint` (luma x colour, preserves luminance). |
| Replace Color effect (swap one hue with another) | ✅ done | common | Shipped 2026-07-10 (v2.86): `replacecolor` (see Effects section). |
| Spot Color effect (selective color — keep one hue, desaturate rest) | ✅ done | nice | Shipped 2026-07-10 (v2.86): `spotcolor` (see Effects section). |
| Palette Map effect (map pixel colors to closest color in a custom palette) | ❌ missing | nice | Confirmed. No palette-map effect. |
| Spectral Map effect (luminance-to-spectrum color mapping) | ✅ done | nice | Shipped 2026-07-10 (v2.86): `spectralmap` (see Effects section). |
| Color grading effect presets (saved CC preset stacks) | ✅ done | common | Confirmed. FM.fxPresets (inspector.js:160-174) — 4 builtins + user stacks persisted to localStorage 'fm.fxpresets'; preset chips row (inspector.js:207-229) with apply/delete/save. Wired. |
| No native project-wide color theme / global swatch system | ✅ done | nice | Confirmed. No project-wide palette/theme system; color is per-layer (fill/color/stroke.color). recentColors is the closest but session-scoped. Matches AM's own absence — correctly treated as 'done by intentional parity'. |

## Export & sharing (formats, resolution, fps, codecs, gif, transparency, quality, project save/load)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| MP4 video export | ✅ done | core | Confirmed. exporter.js FM.exporter.run() does deterministic frame-stepping → WebCodecs VideoEncoder → mp4-muxer → download() as '<project>.mp4'. Wired btn-export → showExportDialog → exp-go → runExport → FM.exporter.run (app.js:715-752, 804, 881). Works. |
| MOV video export | ❌ missing | common | Confirmed. grep for mov/quicktime finds nothing relevant; muxer is mp4-only. |
| Animated GIF export | ❌ missing | common | Confirmed. No GIF encoder, no GIF option, no 'gif' references in any export path. |
| PNG sequence export | 🟡 partial | common | Confirmed. FM.snapshotPNG (app.js:466-478) exports the CURRENT single frame via canvas.toBlob('image/png'), wired to btn-snapshot. No multi-frame numbered-sequence loop. Single-still export works; sequence does not. |
| H.264 codec | ✅ done | core | Confirmed. pickVideoCodec (exporter.js:142-151) probes avc1.640034/640028/4d0028/42e01e via VideoEncoder.isConfigSupported, falls back to baseline, passed to encoder.configure (line 211). Works. |
| H.265 / HEVC codec | ❌ missing | common | Confirmed. grep for hev1/hvc1/hevc/h265 finds nothing. Only avc1 probed. |
| ProRes HQ codec | ❌ missing | nice | Confirmed. No ProRes string or option anywhere. |
| Resolution selection (720p / 1080p / composition max) | ✅ done | core | Re-audited 2026-07-10: showExportDialog now builds named per-export presets — 'Full — WxH' plus 2160p/1440p/1080p/720p/480p/360p, each labelled with exact output pixels, downscale-only. |
| Custom project resolution (arbitrary width × height) | 🟡 partial | common | Confirmed. Canvas dialog computes dimensions from aspect-chip (16:9/9:16/4:5/1:1/4:3) × resolution preset (cvCompute, app.js:844-849), even-rounded. No freeform W×H text entry; only preset combinations. |
| Frame rate selection (12 / 24 / 25 / 30 / 50 / 60 fps) | ✅ done | core | Re-audited 2026-07-10: exp-fps offers all six (30/24/25/60/50/12). (The project-setup cv-fps is still 24/30/60, but that's comp fps, not export fps.) |
| Bitrate control | 🟡 partial | common | Confirmed. exp-quality maps High/Med/Low → 0.18/0.1/0.05 (index.html:116-121); runExport computes bitrate = W*scale*H*scale*fps*qf capped at 80 Mbps (app.js:723). Indirect tier control only; no direct Mbps field. |
| Max Render Quality toggle | ❌ missing | common | Confirmed. No quality-vs-speed / max-quality toggle in dialog or exporter. |
| Render Alpha Channel (transparency export) | ❌ missing | common | Confirmed. Export renders onto plain 2D canvases; muxer codec 'avc' has no alpha path; no alpha option. grep for alpha/transparent in exporter.js finds nothing. |
| Animated GIF with Transparency | ❌ missing | common | Confirmed. No GIF export of any kind exists. |
| Audio export: stereo / mono selection | ❌ missing | common | Confirmed. buildAudioMix hardcodes channels=2 / sampleRate=48000 (exporter.js:69); encodeAudio always emits 2 channels (mono source is duplicated). No UI to pick mono. |
| Render Only Effects isolation | ❌ missing | nice | Confirmed. No 'render only effects' toggle; all layers always composited. |
| Watermark on free-tier exports | ❌ missing | core | Confirmed N/A. No freemium tiers, no watermark logic. Correct to mark missing-by-design; arguably non-applicable to a free local app. |
| Project package save (own format, not .alm) | ✅ done | core | UPGRADE from audit's 'partial'. FM.storage.exportFile (storage.js:138-147) serializes the full scene graph + embedded media (≤6MB as base64 dataURLs) to '<name>.fmotion.json', wired to btn-save-proj (app.js:813-814). Round-trips fully via applyScene. It fully works as a project package; only the file extension/spec differs from Alight Motion's .alm — that's by-design for a separate app, not a partial implementation. |
| Project package import | ✅ done | core | UPGRADE from audit's 'partial'. FM.storage.importFile (storage.js:149-162) reads .json, validates obj.app==='freemotion', clears stale media (incl. IDB collision guard), rehydrates embedded media, calls applyScene, resets history. Wired to btn-open-proj (app.js:815-816). Fully functional for its own format; only-not-.alm is a naming quibble, not a defect. |
| Cloud-hosted project share links | ❌ missing | common | Confirmed. Fully local app (localStorage + IndexedDB). No network, no share-URL generation. |
| Save to device gallery | ❌ missing | core | Confirmed. download() (exporter.js:11-18) and snapshotPNG both trigger anchor-click browser downloads. No Web Share API, no showSaveFilePicker, no gallery write. grep for navigator.share finds nothing. |
| Direct in-app share to social platforms | ❌ missing | common | Confirmed. No navigator.share(), no OS share sheet, no platform APIs. |
| Platform-specific export presets | ❌ missing | common | Confirmed. No YouTube/TikTok/Reels/Instagram preset dropdown. The only 'preset' references are easing/effect-stack presets, unrelated to export. |

## Audio (import, trim, volume keyframes, fades, beat/rhythm tools, reverse audio)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Import audio from device (music, SFX, voice recordings) | ✅ done | core | Re-audited 2026-07-10: file-input accepts audio/*; 'Import audio…' in the add menu; handleFiles routes audio/* to addMediaLayer. |
| In-app voice/microphone recording | ❌ missing | common | Confirmed. No getUserMedia/MediaRecorder for microphone anywhere (media.js, app.js). sample.js uses MediaRecorder only to synthesize a test clip. No mic UI. |
| Extract (detach) audio from a video layer | ✅ done | common | Re-audited 2026-07-10: `FM.extractAudio` duplicates the layer at opacity 0 and mutes the original; 'Extract Audio' in the layer context menu (v2.54). |
| Multiple simultaneous audio layers | ✅ done | core | Re-audited 2026-07-10: dedicated audio-import layers now exist; exporter's buildAudioMix mixes all of them into one OfflineAudioContext and preview plays every layer's audio in tick(). |
| Waveform display on timeline | ✅ done | core | Confirmed. media.js getWaveform (94-114) builds a 600-bin peak array from the decoded AudioBuffer; timeline.js drawWaveform (109-118) renders it onto the clip canvas. |
| Trim audio (drag handles) | ✅ done | core | Confirmed. timeline.js trimDrag (470-498) adjusts start/duration/trimStart per edge, clamped to source length and speed. exporter.js makeClipBuffer (48) and audio-play.js reversedBuffer (25) both slice from trimStart. |
| Split audio clip | ✅ done | common | Confirmed. app.js splitLayer (613-652) splits at playhead, computing trimStart correctly for both forward (629) and reversed (624-627) clips; clones media so B never aliases A. |
| Volume/gain control per layer | ✅ done | core | Confirmed and consistent. layer.volume is stored 0-1 (scene.js makeLayer line 196 = 1). inspector.js line 645 shows a 0-100 slider but writes v/100. app.js tick line 206 applies it to m.el.volume; exporter buildAudioMix line 90 uses it as gain. Audit's note that the slider is '0-100' and exporter 'reads layer.volume for gain' is internally consistent because the stored value is 0-1. |
| Volume keyframe automation | ✅ done | core | Re-audited 2026-07-10: ◆ diamond wired to `FM.toggleProp(layer,'volume')`; `FM.layerVolume` evaluates the animated prop; consumed animated in both preview and export. |
| Fade in / fade out (handles or keyframes) | ✅ done | core | Confirmed. scene.js fadeIn/fadeOut (197-198), fadeWindows (295-298) and fadeMul (303-308). inspector.js 649-650 sliders. Envelope scheduled via Web Audio gain in audio-play.js (61-69) and exporter buildAudioMix (94-106). fadeWindows scales overlapping fades to a triangle to avoid out-of-order ramps. |
| Crossfade between audio clips | ❌ missing | common | Confirmed. Only independent per-layer fade-in/out sliders; no linked/automatic crossfade logic between adjacent clips. |
| Mute per audio layer | ✅ done | common | Re-audited 2026-07-10: a real independent `layer.muted` flag now exists (toggled in the inspector, honoured in `FM.layerVolume`). It no longer hijacks layer.volume. |
| Stereo panning per layer | ❌ missing | common | Confirmed. No pan field in makeLayer; no StereoPannerNode anywhere; no pan UI. |
| Beat marks — manual placement | ❌ missing | common | Confirmed. Generic timeline markers exist (timeline.js right-click ruler 412-422; app.js 'M' key 956) stored in P.markers[], but they are not audio-beat-aware (no snap-to-beat, no audio analysis, no distinct beat visual). |
| Beat marks — automatic detection with sensitivity control | ❌ missing | common | Confirmed. No onset/transient/BPM detection in any file; getWaveform produces display peaks only. |
| Pitch shift | ❌ missing | common | Confirmed. No pitch-shift param or node. Speed changes pitch (raw playbackRate in preview; resample in export); no independent pitch control or preservesPitch flag. |
| Time stretch (speed change with pitch preservation) | ❌ missing | common | Confirmed. layer.speed is raw playback-rate (inspector 652-661; m.el.playbackRate). No phase-vocoder/time-stretch; pitch follows speed. |
| Reverb effect | ❌ missing | common | Confirmed. No ConvolverNode; FM.EFFECTS are visual-only. |
| Echo / delay effect | ❌ missing | common | Confirmed. No DelayNode/createDelay anywhere. |
| Equalizer (EQ) | ❌ missing | common | Confirmed. No BiquadFilterNode; no EQ UI. |
| Noise reduction | ❌ missing | nice | Confirmed. No noise-reduction processing. |
| Audio compression | ❌ missing | nice | Confirmed. No DynamicsCompressorNode; no compression UI. |
| Loop audio clip | ❌ missing | common | Confirmed. No per-clip loop flag; AudioBufferSourceNodes never set loop=true. Only a project-level loop region (P.loopIn/loopOut, app.js 165) loops the whole timeline. |
| Reverse audio — NOT a native AM feature | ✅ done | nice | Confirmed. audio-play.js reversedBuffer (22-40) synthesizes reversed audio for preview; exporter makeClipBuffer (58) reads source backward on export. Triggered by layer.reversed (inspector checkRow 668; context menu app.js 669). |

## UI, gestures & workflow (on-canvas direct manipulation, snapping, shortcuts, panels, undo/redo, mobile feel)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Multi-panel workspace (Preview / Timeline / Layers / Properties) | 🟡 partial | core | Re-audited 2026-07-10: status holds (no separate Layers panel), but the rationale is STALE: styles.css has 6 @media blocks including a full max-width:700px phone layout, plus a swipe-down bottom-sheet inspector in mobile.js. |
| Touch-drag on-canvas object manipulation (move, scale, rotate via handles) | ✅ done | core | Re-audited 2026-07-10: `touch-action:none` now covers #preview, #canvas-wrap and .sb-handle; handles are wired via pointerdown. The 'not touch-usable' downgrade rationale is false. |
| Two-finger pinch-to-zoom / pan on Preview canvas | ❌ missing | core | Re-audited 2026-07-10: still absent — canvas-edit.js has ZERO pinch/multi-pointer handlers (the `pinch` hits elsewhere are timeline.js and the 'Pinch / Bulge' effect). The timeline's pinch code is a directly reusable pattern to port. |
| Two-finger pinch zoom on the Timeline (temporal zoom) | ✅ done | core | Re-audited 2026-07-10: timeline.js keeps a pointers Map and a capture-phase 2-finger handler computing pdist()/pmidX() -> setZoom. |
| Undo / Redo (button and keyboard shortcut) | ✅ done | core | Confirmed. history.js: 120-step JSON snapshot stack, undo()/redo(). Buttons wired app.js 821-823. Cmd/Ctrl+Z, Shift+Cmd+Z, and Cmd+Y wired app.js 894-900. |
| Contextual property panel (stays open and follows layer selection) | ✅ done | core | Confirmed. inspector.js refresh() repopulates from the selected layer; #inspector-panel is always visible. view resets to 'home' only when layer.id changes (line 684), so the open category persists when the same layer is re-selected. |
| Move & Transform numeric input panel | ✅ done | core | Re-audited 2026-07-10: Skew now exists — MT_MODES includes 'skew' with skewX/skewY inputs. The 'skew absent' note is stale. |
| Keyframe graph editor with Bezier curve handles | ✅ done | core | Confirmed. graph-editor.js draws a canvas bezier curve, two draggable handles (pointerdown/move), Hold/step display, preset buttons Linear/In/Out/In-Out/Overshoot/Anticipate/Hold, numeric From/To value entry. Mounted in inspector Transform category. scene.js bezierAt() evaluates. |
| Layer list: tap to select, long-press drag to reorder | ✅ done | core | Re-audited 2026-07-10: real pointer long-press (paint-select) and a `.row-drag` grip using setPointerCapture for touch reorder — no longer HTML5-DnD-only. |
| Layer grouping (non-destructive) | ✅ done | core | Re-audited 2026-07-10: `FM.groupSelection()` (incl. {mask:true} masking groups), real type==='group' layers with collapse/expand, Edit Group -> `FM.enterGroup`. |
| Razor / Split tool | ✅ done | core | Confirmed. app.js FM.splitLayer (613) splits at playhead, handles trim/reverse/speed, clones fresh media. Wired to btn-split (833), S key (961), and layer context menu (659). |
| Trim handles on timeline clips | ✅ done | core | Confirmed. timeline.js buildLane appends left/right .clip-grip handles (280-292), trimDrag set on pointerdown, window pointermove does real-time trim with speed/source-duration limits and snapping; history committed on pointerup. |
| Playback control bar (Play, Pause, Skip, Scrub) | ✅ done | core | Confirmed. Transport row in index.html (btn-tostart/play/toend/loop/split/snap/onion, preview-rate, time-readout). FM.togglePlay, scrub via ruler/lane pointerdown, readout updates each tick, double-click readout to type exact time (app.js 761). |
| Layer visibility toggle (eye icon) | ✅ done | common | Confirmed. timeline.js th-eye toggles layer.visible (175), icon 👁/🚫, requestRender + history commit. Also a Visible checkbox in Element Properties (inspector 479). |
| Layer locking | ✅ done | common | Confirmed. timeline.js th-lock toggles layer.locked (197). canvas-edit topHit skips locked layers (65). Inspector quick-row lock button (345). Context menu lock/unlock (665). |
| Layer color labels and naming | ✅ done | common | Re-audited 2026-07-10: colour-tag picker shipped: `FM.setLayerLabel` + ⋯-menu swatch strip, rendered as a stripe on the layer header. |
| Duplicate layer | ✅ done | common | Confirmed. app.js FM.duplicateLayer (496) clones with fresh id + 30px offset, loads fresh media. Wired to inspector dup button (323), Cmd+D (901), context menu Duplicate / Duplicate in place (655-656). |
| Copy / paste effects between layers | ✅ done | common | Confirmed. inspector.js effectsSection: Copy stores FM.effectClipboard as deep clone (200), Paste appends to target (203). Both wired, enabled/disabled appropriately. |
| Pivot / anchor point repositioning | 🟡 partial | common | Confirmed. inspector Anchor X/Y sliders with position-compensation (setAnchor, 427-440) so the layer doesn't shift when the pivot moves. No on-canvas pivot drag handle — numeric sliders only. |
| Multiselect layers (hold + tap) | ✅ done | common | Confirmed. app.js FM.toggleSelect (433) on shift/cmd/ctrl click of timeline head (204) and clip body (264). FM.selectAll for Cmd+A. Inspector shows align tools when selectionIds().length>=2 (688). |
| Merge layers | ❌ missing | common | Confirmed. No merge/flatten/rasterize-to-layer function. Grep for merge/flatten/rasteriz finds only compositor per-layer rasterization comments and a color-grade 'merge' comment — no layer-merge feature. |
| Snap to grid (grid overlay) | ❌ missing | common | Confirmed. canvas-edit snapTo() snaps to canvas center/edges only; btn-snap toggles timeline clip/trim snapping. No grid overlay, no snap-to-grid; btn-guides shows rule-of-thirds reference lines (not a snap grid). Grep for grid finds nothing. |
| Beat mark layer (manual + auto audio-beat detection) | ❌ missing | common | Confirmed. Project markers exist (M key, right-click ruler) but no beatmark layer type and no audio beat/onset/BPM analysis (grep finds none). Waveform display is visual only. |
| Mac / iPad keyboard shortcuts | ✅ done | common | Confirmed for keyboard. app.js 892-963: Cmd+Z/Shift+Cmd+Z/Cmd+Y, Cmd+D, Cmd+C/V, Cmd+A, Space, arrows (nudge/frame-step), brackets (loop in/out), backslash (clear), M, S, Tab/Shift+Tab, +/-, Delete/Backspace, Esc, Home/End, comma/period. shortcuts.js ? overlay lists them. |
| QR code project / preset import-export | ❌ missing | common | Confirmed. No QR library/encoding/decoding/camera scan (grep finds none). Project save/load is .fmotion.json via storage.exportFile/importFile. |
| Loop playback / range preview | ✅ done | common | Confirmed. FM.loop toggle wired to btn-loop (831). FM.hasLoopRegion checks project.loopIn/loopOut; tick() wraps playhead at loopOut→loopIn. [ ] set loop in/out, \ clears (953-955). loopRegionEl rendered as overlay (timeline 555-563). |
| Easing preset quick-apply to keyframes | ✅ done | common | Confirmed. graph-editor preset buttons apply via setBez/setHold (173-181). timeline.js right-click keyframe diamond shows easing-preset context menu incl. Hold (328-342). FM.EASE_PRESETS defined in scene.js 52. |
| Copy / paste / move keyframes in the graph editor | ✅ done | common | Confirmed. timeline.js kfDrag retimes by dragging the dot (313-318, pointermove 500-507). copyKfAt (76) / pasteKfAtPlayhead (84) copy/paste across layers via path-keying. Right-click menu Copy/Paste keyframe (357-358). Double-click deletes (320). |
| Onion skin for frame-by-frame animation | ✅ done | nice | Confirmed. app.js drawOnionSkin (19) renders selected layer at t-0.2 (cyan) and t+0.2 (red) as semi-transparent ghosts; runs only when FM.onionSkin && !FM.playing. Wired to btn-onion (810). Walks parent chain so rigged nulls show ghosts. |
| Custom easing curves (fully bespoke Bezier) | ✅ done | nice | Confirmed. graph-editor draggable handles write curKf.bez and set e='custom' (setBez 70). scene.js evalProp uses bezierAt for custom. Y clamped to [-1,2] (line 93) allowing overshoot. |
| Grid effect as visual alignment aid | ✅ done | nice | Re-audited 2026-07-10: a `grid` effect IS in FM.EFFECTS (type:'grid', param:'size') with a full pixel render fn. The old 'no Grid type' claim was simply wrong. |
