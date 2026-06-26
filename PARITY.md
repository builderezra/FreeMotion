# FreeMotion — Parity Matrix

_Single source of truth: every Alight Motion feature × FreeMotion status. Generated 2026-06-23 by the parity-audit council (11 domains, unbiased AM research → code audit → adversarial Opus verification). Re-run the audit to refresh; edit statuses here as features land._

## Where we stand

- **Overall parity (core+common): ~62%**
- **Core:** 48 / 66 done
- **Common:** 22 / 78 done
- **Open gaps:** 49  •  **Known bugs:** 18

> FreeMotion has a genuinely strong core editor (timeline, keyframes+graph editor, parenting/camera/null, masks, project save/load, MP4/H.264 export) but two existential gaps: it is unusable on touch/mobile despite the mobile-first mandate, and it has no audio import, no 3D depth, and a shallow effects catalog vs Alight Motion.

Legend: ✅ done · 🟡 partial · ❌ missing · ❔ unknown

_Across 342 audited features: 90 ✅ · 62 🟡 · 189 ❌ · 1 ❔_

## Timeline & playback (tracks, scrub, split, ripple/trim, speed & time-remap, markers, loop region, preview rate)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Multi-layer timeline with unlimited stacked tracks | ✅ done | core | Confirmed. timeline.js buildTracks() renders one track-row per FM.scene.layers entry; heads have eye/lock/solo/name/thumb and HTML5 drag-reorder via FM.reorderLayer (app.js:691). scene.js layers array unbounded. Grouping/precomp genuinely absent but that is an optional sub-feature; core multi-track is fully wired. |
| Playhead scrub and frame-by-frame navigation | ✅ done | core | Confirmed. timeline.js beginScrub + pointermove -> FM.setTime(timeFromX) (line 509). FM.setTime (app.js:143) calls render + seekVideosToTime. Frame-step on ArrowLeft/Right (app.js:946-947) and Comma/Period (949-950) by ±1/(project.fps\|\|30). |
| Timeline zoom (pinch to stretch) | 🟡 partial | core | Confirmed partial. Ctrl/Cmd+wheel zoom (timeline.js:404), zoom buttons (399-400), keyboard +/- (app.js:958-959), setZoom clamps 1-12x. No touch/pinch gesture anywhere (grep for touchstart/pinch/gesturestart returns nothing) — pinch absent. |
| Trim clips (drag handles) | ✅ done | core | Confirmed. buildLane appends .clip-grip left/right; pointerdown sets trimDrag; pointermove (timeline.js:472-499) recomputes start/duration/trimStart with source-length clamp and snapEdge. Non-destructive (trimStart preserved). |
| Split clip at playhead | ✅ done | core | Confirmed. FM.splitLayer (app.js:613-652) clones layer, sets B.start/B.trimStart, A.duration=into, loads fresh media rec for B (never aliases A's media), handles reversed-clip case. Wired to btn-split (index.html:58), S key (app.js:961), context menu (654-659). |
| Delete clip (with ripple-style gap close) | 🟡 partial | core | Confirmed partial. deleteSelected/deleteLayer (app.js:444-463) just filter the layer out; no ripple/gap-close — adjacent clips do not shift. Ripple-delete absent. |
| Constant-speed adjustment (Speed & Duration) | ✅ done | core | Confirmed. inspector.js:651-661 'Speed %' rangeRow (25-400) on video layers; keeps source span invariant (span=duration*speed), recomputes duration=span/sp, sets playbackRate, grows project duration. Timeline badge shows speed when !=1 (timeline.js:234-239). |
| Reverse clip playback | ✅ done | common | Confirmed. inspector.js:668 'Reverse (video + audio)' checkbox; ensureReverseCache decodes frames; audio-play.js reversedBuffer plays reversed audio via Web Audio; scene.js:288 layerLocalTime inverts time offset when reversed. |
| Time Remapping (velocity / speed-ramp keyframes) | ❌ missing | common | Confirmed missing. No timeRemap/speedRamp/velocity-keyframe code. layer.speed is a single static multiplier. The word 'velocity' appears only in graph-editor.js's comment header (that editor handles transform-property bezier easing, not per-clip speed curves). No remap sub-track in buildLane. |
| Keyframe animation easing curves (graph editor) | ✅ done | core | Confirmed. graph-editor.js bezier editor with draggable handles, mounted in inspector.js:443-444 (FM.graphEditor.mount). EASE_PRESETS (scene.js:52) Linear/In/Out/InOut/Overshoot/Anticipate + Hold; custom kf.bez; scene.js bezierAt evaluates per-frame. |
| Audio waveform display on timeline | 🟡 partial | common | Confirmed partial. timeline.js:248-258 draws .clip-wave canvas on video layers with a file; media.js getWaveform decodes audio into peaks. Note: it is 600 max-amplitude peaks, not '128 RMS' as the prior audit stated (cosmetic evidence error, status unchanged). Only video layers get it (no separate audio-layer type exists) and there is no show/hide toggle. |
| Beat marks / timeline markers | 🟡 partial | common | Confirmed partial overall, but one prior-audit claim is WRONG: the M-key handler (app.js:956) does NOT pause and works during playback, so tap-to-mark while playing DOES work. Markers themselves are fully done (add via M/ruler right-click, snap points, rename on dblclick, remove/clear). Status stays partial only because audio-transient/beat auto-detection is genuinely absent. |
| Retiming marks on preset Elements (intro/middle/outro) | ❌ missing | common | Confirmed missing. No preset-Elements system, no retimer/intro/outro mark logic anywhere. sample.js makes plain test clips. |
| Onion skinning (ghost frames) | ✅ done | nice | Confirmed. app.js:19-46 drawOnionSkin renders selected animated layer at t±0.2s tinted cyan(past)/red(future) at 40% alpha; parent-chain aware; only when FM.onionSkin && !FM.playing (line 64). Toggled by btn-onion (app.js:809-810). |
| Project-level frame rate selection | ✅ done | core | Confirmed. scene.js:172 project.fps default 30; cv-fps select written app.js:872; exp-fps read app.js:719; frame-step navigation uses project.fps. |
| Low-quality preview mode (Android) | 🟡 partial | common | Confirmed partial. #preview-rate select (index.html:61-67, values 0.25/0.5/1/2/4) wired app.js:817-818 to FM.setPreviewRate — controls playback SPEED only, not render resolution. No 360p/480p preview downscale. Not a true low-quality-preview equivalent. |
| Playback controls bar (play, pause, step-frame) | 🟡 partial | core | Confirmed partial. index.html transport has btn-tostart/btn-play/btn-toend/btn-loop/btn-split/btn-snap/btn-onion but NO dedicated step-frame buttons. Frame-stepping only via keyboard (,/. and arrows). Visual bar missing per-frame step buttons. |
| Bookmarks on timeline | ❌ missing | nice | Confirmed. project.markers exists but there is no named-bookmark concept, no bookmark panel, no jump-to-bookmark navigation. Closer to beat-marks than bookmarks. |
| Keyframe volume control on audio tracks (with keyframes) | ❌ missing | common | Confirmed. inspector.js:645 Volume % is a plain rangeRow on a number, no kf-btn diamond, FM.toggleProp never called for volume. Only static volume + fadeIn/fadeOut envelope; no per-keyframe volume animation. |
| Loop playback region for A/B preview | ✅ done | nice | Confirmed. FM.hasLoopRegion (app.js:165), wrapTo + tick wrap at project.loopOut back to loopIn (174-179). timeline.js updateLoopRegion draws #tl-loopregion shaded bar. Set via [ / ] (app.js:953-954), cleared with \ (955). Export respects loop region (app.js:733). |

## Keyframes & animation (easing presets, graph/velocity editor, hold/bezier, loop & pingpong modes, motion blur, wiggle)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Per-property keyframe recording | ✅ done | core | Confirmed. scene.js toggleKeyframe/toggleProp flip static→{kf:[]} for any transform prop or effect param; inspector kf-btn wired; evalProp interpolates at playback. animatedProps() enumerates both transform and effect-param kf containers. |
| Hold (step) keyframe interpolation | ✅ done | core | Confirmed. scene.js:73 `if (b.e==='hold') return a.v`. graph-editor setHold()/drawHold(); timeline context menu 'Hold (step)' item sets e='hold' and deletes bez. |
| Linear keyframe interpolation | ✅ done | core | Confirmed. EASES.linear, EASE_PRESETS.linear=[0,0,1,1]; graph-editor 'Linear' preset; timeline context menu 'Linear'. |
| Cubic Bezier easing curves with manual handle adjustment | ✅ done | core | Confirmed. graph-editor.js: two draggable handles, pointerdown picks nearest, pointermove→setBez; scene.bezierAt Newton-Raphson+bisection; kf.bez stored and used in evalProp:76. |
| One-tap easing presets: Ease In, Ease Out, Ease In-Out | ✅ done | core | Confirmed. graph-editor preset buttons In/Out/In-Out map to EASE_PRESETS; also via timeline right-click menu (iterates EASE_PRESETS keys). |
| Bounce easing preset | ❌ missing | common | Confirmed missing. grep found no 'bounce' key anywhere (only a 'bounce-ish' word in a comment). Not in EASE_PRESETS, EASES, or any preset list. |
| Elastic easing preset | ❌ missing | common | Confirmed missing. No 'elastic' anywhere in js/. |
| Steps easing preset | ❌ missing | common | Confirmed missing. Only 'hold' provides stepping; no step-count/discrete-interval easing. |
| Elastic Steps easing preset | ❌ missing | nice | Confirmed missing — neither component exists. |
| Cyclic easing preset | ❌ missing | nice | Confirmed missing. No cyclic/pendulum easing. |
| Overshoot / Back easing (anticipation curves) | ✅ done | common | Confirmed. EASE_PRESETS overshoot=[.34,1.56,.64,1], anticipate=[.36,0,.66,-.56]; both as graph-editor preset buttons and in timeline menu; canvasToGraph clamps Y to [-1,2] to allow handles past axis. Note: these only animate correctly via stored bez (EASES table has no overshoot/anticipate key) — and the code always sets bez when applying them, so it works. |
| Graph (curve) editor with velocity visualisation | 🟡 partial | core | Confirmed partial. graph-editor.js is a single value/timing curve editor (slope implies speed), mounted in inspector transform category. Despite the file header calling it a 'Velocity editor', there is no separate velocity/speed-graph view mode. |
| Motion Blur effect (velocity-based, per-layer) | 🟡 partial | core | Confirmed partial. compositor drawMotionBlur sub-samples transform motion across shutter window with renormalized opacity; inspector exposes Motion blur checkbox + Shutter + Samples. Only shutter+samples controls (no per-axis Position/Scale/Angle toggles); blurs transform motion only, not a video clip's intrinsic subject motion (acknowledged in code comment). |
| Oscillate effect (procedural wiggle/shake) | 🟡 partial | core | UPGRADED from missing. A working procedural shake EXISTS: layer.wiggle {enabled,amp,freq}, applied via compositor wiggleOffset()/wnoise() in drawLayer (deterministic sum-of-sines, renders + exports identically), with inspector UI (Wiggle / amount / speed). amp≈Magnitude, freq≈Frequency. It is NOT a full AM Oscillate (position-only, no Angle/Phase/wave-type, not an addable effect-stack entry), but a genuinely functioning oscillate/shake feature — 'missing' was too harsh. |
| Auto-Shake effect (randomised procedural shake) | ❌ missing | common | Confirmed missing as a distinct effect. wiggle is deterministic, not a random-noise generator; no 'autoShake' type. |
| Random Jitter effect | ❌ missing | common | Confirmed missing. No 'jitter'/random-noise effect in FM.EFFECTS or anywhere. |
| Echo Keyframes effect (motion trails / ghost frames) | ❌ missing | common | Confirmed missing. No echo/time-offset-copy effect in FM.EFFECTS. Onion-skin (preview only) is unrelated and not a rendered effect. |
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
| Motion Blur | 🟡 partial | core | Confirmed. drawMotionBlur (compositor.js:406-441) averages sub-frame renders via additive compositing across a shutter window; renormalizes opacity to in-clip sub-times. UI at inspector.js:599-601 (checkbox+shutter+samples). Only blurs transform motion, not intrinsic video motion. |
| Directional Blur | ❌ missing | core | Confirmed absent. Not in FM.EFFECTS, effectFilter, POSTFX, or any draw fn. |
| Box Blur / Precise Box Blur | ❌ missing | common | Confirmed absent. |
| Lens Blur | ❌ missing | common | Confirmed absent. |
| Zoom Blur | ❌ missing | common | Confirmed absent. |
| Spin Blur | ❌ missing | common | Confirmed absent. |
| Inner Blur | ❌ missing | nice | Confirmed absent. |
| Mask Blur | ❌ missing | nice | Confirmed: drawFeatheredMaskLayer blurs the mask shape (feathering) but there is no standalone Mask Blur effect entry. |
| Glow | 🟡 partial | core | Confirmed. FM.EFFECTS 'glow' (compositor.js:39, color:true) → effectFilter emits drop-shadow(0 0 Npx color) at line 177. CSS drop-shadow halo, not luminance-based; no sub-types. |
| Inner Glow | ❌ missing | common | Confirmed absent. |
| Edge Glow | ❌ missing | common | Confirmed absent. |
| Soft Glow | ❌ missing | common | Confirmed absent. |
| Dark Glow | ❌ missing | nice | Confirmed absent. |
| Glow Scan | ❌ missing | nice | Confirmed absent. |
| Light Glow | ❌ missing | common | Confirmed absent (only the single drop-shadow glow). |
| Lens Flare | ❌ missing | nice | Confirmed absent. |
| Chroma Key | ✅ done | core | Confirmed. chromaKey() (compositor.js:63-85) per-pixel color-distance keying, memoized, filters source before keying. Integrated in media draw path (lines 898-904) with correct FX→key ordering, tainted-canvas guards. In FM.EFFECTS:41 with color+tolerance, user-addable. |
| Luma Key | ✅ done | core | Confirmed. lumaKey() (compositor.js:89-112) per-pixel luma keying with 28-unit soft edge, memoized. Stacks correctly after chroma (lines 905-908). FM.EFFECTS:42 threshold slider, wired. |
| Matte Choker | ❌ missing | common | Confirmed absent. |
| Brightness / Contrast | ✅ done | core | Confirmed. FM.EFFECTS 'brightness'/'contrast' (compositor.js:32-33) → effectFilter CSS brightness()/contrast() (lines 170-171), keyframeable, wired. |
| Exposure / Gamma | 🟡 partial | core | Confirmed. Gamma slider (inspector.js:466) writes colorGrade.gamma; gradeLUT/gradeCanvas (compositor.js:117-143) apply gain*in^(1/gamma)+lift per-pixel to media sources (line 893). No named Exposure/EV effect; lives in Color Tune not the keyframeable effect stack. |
| Highlights and Shadows | 🟡 partial | core | Confirmed. Lift/Gamma/Gain sliders (inspector.js:465-467) via gradeCanvas. Lift≈shadows, Gain≈highlights, but no independent per-region controls; colorGrade props are not keyframeable effect-stack entries. |
| Saturation / Vibrance | 🟡 partial | core | Confirmed. FM.EFFECTS 'saturate' (compositor.js:34) → CSS saturate() (line 172), keyframeable; also colorGrade.sat via color wheel (effectFilter line 183). No vibrance mode. |
| Color Temperature | ❌ missing | core | Confirmed absent. No temperature/colortemp; grep found nothing. hue-rotate is distinct. |
| Hue Shift | ✅ done | core | Confirmed. FM.EFFECTS 'hue' deg 0-360 (compositor.js:35) → CSS hue-rotate() (line 173), keyframeable; also colorGrade.hue (line 182). Fully functional. |
| Color Tune (Lift/Gamma/Gain/Offset wheels) | 🟡 partial | common | Confirmed. Color Tune section (inspector.js:458-467): one hue+sat color wheel + Lift/Gamma/Gain sliders → gradeCanvas. No four-way Shadows/Mids/Highlights/Offset wheels; not keyframeable. |
| Color Curves (RGB and per-channel) | ❌ missing | common | Confirmed absent (only easing/text curves, unrelated). |
| Replace Color | ❌ missing | common | Confirmed absent. |
| Spot Color | ❌ missing | nice | Confirmed absent. |
| Colorize | 🟡 partial | common | Confirmed. FM.EFFECTS 'tint' (compositor.js:47); drawTint (530+) maps luma→color blended by amount; also in applyPixelFx for adjustment layers (line 961). Simplified 0.299/0.587/0.114 luma, single amount param. |
| Invert | 🟡 partial | common | Confirmed present and functional. FM.EFFECTS 'invert' (compositor.js:38) → CSS invert() (line 176), keyframeable. 'Partial' only because no per-channel toggle vs AM; the core invert itself fully works. |
| Gradient Map | ❌ missing | common | Confirmed: only two-stop 'duotone', not an arbitrary multi-stop gradient map. |
| Channel Remap (RGB) | ❌ missing | nice | Confirmed absent. |
| Channel Remap (HSV) | ❌ missing | nice | Confirmed absent. |
| Spectral Map | ❌ missing | nice | Confirmed absent. |
| Palette Map | ❌ missing | nice | Confirmed absent. |
| Hot Color | ❌ missing | nice | Confirmed absent. |
| LUT Import | ❌ missing | common | Confirmed absent. No .cube/.3dl parsing. |
| Posterize | ✅ done | common | Confirmed. FM.EFFECTS 'posterize' (compositor.js:45); drawPosterize (502-525) per-channel quantization; also applyPixelFx for adjustment layers (line 955). Keyframeable, wired. |
| Threshold | ✅ done | nice | Confirmed. FM.EFFECTS 'threshold' (compositor.js:48); drawThreshold (563+) luma 2-tone; applyPixelFx (line 958). Wired, keyframeable. |
| Contour Gradient | ❌ missing | nice | Confirmed absent. |
| Contour Lines | ❌ missing | nice | Confirmed absent. |
| Contour Strips | ❌ missing | nice | Confirmed absent. |
| Turbulent Displace | ❌ missing | common | Confirmed. wnoise() is wiggle position jitter only, no pixel displacement. |
| Wave Warp | ❌ missing | common | Confirmed absent. |
| Displacement Map | ❌ missing | common | Confirmed absent. |
| Bump Map | ❌ missing | common | Confirmed absent. |
| Pinch / Bulge | ❌ missing | common | Confirmed absent. |
| Inner Pinch / Bulge | ❌ missing | nice | Confirmed absent. |
| Swirl | ❌ missing | common | Confirmed absent. |
| Polar Coordinates | ❌ missing | nice | Confirmed absent. |
| Polar Displacement Map | ❌ missing | nice | Confirmed absent. |
| Bend | ❌ missing | nice | Confirmed absent. |
| Curl | ❌ missing | nice | Confirmed absent. |
| Fractal Warp | ❌ missing | nice | Confirmed absent. |
| Squeeze | ❌ missing | nice | Confirmed absent. |
| Tunnel | ❌ missing | nice | Confirmed absent. |
| Spherize | ❌ missing | nice | Confirmed absent. |
| Kaleidoscope | ❌ missing | common | Confirmed: only 'mirror' (2/4-way flip), no radial symmetry with count/rotation. |
| Mirror | ✅ done | common | Confirmed. FM.EFFECTS 'mirror' 4 modes (compositor.js:46); drawMirror (626-658) renders mirrored halves; wired as dropdown. POSTFX, works on layers. |
| RGB Split | ✅ done | common | Confirmed. FM.EFFECTS 'rgbsplit' (compositor.js:43); drawRgbSplit (463-498) per-pixel R/B horizontal shift; also applyPixelFx for adjustment layers (lines 940-953). Keyframeable, wired. |
| Vignette | ✅ done | core | Confirmed. FM.EFFECTS 'vignette' (compositor.js:40); radial darkening overlay at lines 913-925. NOTE confirmed: applied only inside media draw path, so text/shape layers get no vignette. |
| Sharpen | ❌ missing | common | Confirmed absent. |
| Unsharp Mask | ❌ missing | common | Confirmed absent. |
| Noise | ❌ missing | common | Confirmed: wnoise is wiggle jitter only, no pixel grain effect. |
| Block Noise | ❌ missing | nice | Confirmed absent. |
| Pixelate / Mosaic | ✅ done | common | Confirmed. FM.EFFECTS 'pixelate' (compositor.js:44); drawPixelate (662-691) down/up-scale with smoothing off; adjustment-layer path at lines 987-998. Wired, keyframeable. |
| Find Edges | ❌ missing | nice | Confirmed absent. |
| Electric Edges | ❌ missing | nice | Confirmed absent. |
| Roughen Edges | ❌ missing | common | Confirmed absent. |
| Smooth Edges | ❌ missing | nice | Confirmed absent. |
| Omino Glass | ❌ missing | nice | Confirmed absent. |
| Omino Diffusion+ | ❌ missing | nice | Confirmed absent. |
| Copy Background | ❌ missing | common | Confirmed: adjustment layers grade composited layers below (applyAdjustment 969+) but no copybg effect that replaces layer pixels with masked background. |
| Fill Behind | ❌ missing | common | Confirmed absent. |
| Magnify Background | ❌ missing | nice | Confirmed absent. |
| Echo Keyframes (motion trails) | ❌ missing | nice | Confirmed: no discrete echo copies; motion blur is sub-frame averaging only. |
| Time Quantization | ❌ missing | nice | Confirmed absent. |
| Particle Emitter | ❌ missing | common | Confirmed: no particle layer type in scene.js, none in FM.EFFECTS. |
| 3D Shape Effects | ❌ missing | nice | Confirmed: 2D canvas compositor, no WebGL/3D. |
| 360 Viewer / Reorient Sphere | ❌ missing | nice | Confirmed absent. |
| Halftone Dots / Lines | ❌ missing | nice | Confirmed absent. |
| Clouds / Fractal Ridges | ❌ missing | nice | Confirmed absent. |
| Voronoi Cells | ❌ missing | nice | Confirmed absent. |
| Radial Rays | ❌ missing | nice | Confirmed absent. |
| Rays | ❌ missing | nice | Confirmed absent. |
| Long Shadow | ❌ missing | nice | Confirmed: a generic drop shadow exists (layer.shadow, compositor.js:741-747) but no directional long flat shadow. |
| Radial Shadow | ❌ missing | nice | Confirmed absent. |
| Smooth Bevel | ❌ missing | nice | Confirmed absent. |
| Raster Extrude | ❌ missing | nice | Confirmed absent. |
| Layer Styles Presets | 🟡 partial | common | Confirmed. FM.fxPresets (inspector.js:160-174) with 4 builtins (VHS Glitch/Duotone/Dreamy/Comic) + localStorage user stacks; UI chips with apply/delete/save (lines 207-227). Covers only implemented effects, not full AM style catalog. |
| Blend Modes (20+) | 🟡 partial | core | Confirmed. BLEND map (compositor.js:11-25) = 13 modes, all native globalCompositeOperation; FM.BLEND_MODES wired in inspector.js:446. Missing hue/saturation/color/luminosity/pin-light etc. (note: canvas2D actually DOES support hue/saturation/color/luminosity, so those 4 could be added trivially — they are simply not in the map). |
| Auto-Shake / Random Jitter | ✅ done | common | Confirmed. wiggleOffset() (compositor.js:193-198) applies deterministic incommensurate-sine noise to position; UI inspector.js:608-613 (enabled/amount/speed); applied in drawLayer line 749/750. Procedural, exports identically. |
| Turbulence (position-based) | ✅ done | common | Confirmed: same wiggleOffset/wnoise system as Auto-Shake; functionally equivalent to AM position turbulence. |

## Layers &amp; compositing (layer types, groups/precomps, blend modes, adjustment layers, parenting/null/rig)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Video clip layer | ✅ done | core | Confirmed: makeLayer handles non-text/shape/null kinds; drawLayer renders m.el for media; loadVideoFile in media.js; addMediaLayer in app.js wired to file-input video/*. |
| Image layer | ✅ done | core | Confirmed: loadImageFile path + same drawLayer media branch; imported via handleFiles for image/* files. |
| Text layer | ✅ done | core | Confirmed: makeLayer('text') with full props; compositor text branch (font/align/stroke/gradient/curve/anim/captions); addTextLayer wired to btn-add-text; inspector 'element' controls present. |
| Shape / vector layer | ✅ done | core | Confirmed: compositor renders rect/ellipse/line/polygon/triangle/star/heart with fill/gradient/stroke/cornerRadius; inspector exposes ALL seven shape kinds in a selector (line 573); addShapeLayer wired to Add menu (only Rectangle/Ellipse shown there but selector switches kind). |
| Audio layer | ❌ missing | core | Confirmed missing: file-input accept is exactly 'video/*,image/*' (index.html:87). No 'audio' type, no addAudioLayer, no loadAudioFile. Audio exists only as a property of video layers (volume/fade/reverse in audio-play.js). |
| Null object layer | ✅ done | common | Confirmed: addNullLayer; drawLayer returns early for type==='null'; renderThumb draws crosshair; in Add menu as 'Null (rig control)'. |
| Camera object layer | ✅ done | common | Confirmed: addCameraLayer (enforces one camera, toasts otherwise); renderScene renders scene to _camCv then composites through camera x/y/scale/rotation; thumb drawn. |
| Multi-layer stacking / stacking order | ✅ done | core | Confirmed: renderScene iterates layers high-index-first so layers[0] draws last (top); reorderLayer in app.js; track-head drag in timeline.js. |
| Layer visibility (eye) and locking | ✅ done | core | Confirmed: timeline th-eye toggles visible, th-lock toggles locked; isLayerVisibleAt gates drawing; locked layers skipped in edit/keyboard ops. |
| Layer solo | ✅ done | common | Confirmed: timeline th-solo 'S' button toggles layer.solo; renderScene computes soloActive and skips non-solo layers. |
| Layer renaming and color-coding | 🟡 partial | common | Confirmed exactly as audited: rename via double-click th-name input works; clipColor is ONLY auto-cycled from CLIP_COLORS (scene.js) and read by timeline.js — grep shows no manual color-label UI anywhere. |
| Layer grouping | ❌ missing | core | Confirmed missing: no 'group' layer type, no addGroupLayer/groupSelected. The only 'group' in timeline.js is multi-clip drag movement (clipMove.group), not a compositing group. |
| Elements (nested compositions / precomps) | ❌ missing | common | Confirmed missing: no precomp/element layer type. inspector 'element' key is just the per-layer property panel. No save-as-element or reuse. |
| Blend modes per layer | ✅ done | core | Confirmed: BLEND map has exactly 13 modes; FM.BLEND_MODES exposed; inspector selectRow('Blend mode', …, FM.BLEND_MODES) at line 446. No 'hue/saturation/color/luminosity' separable blend modes (canvas GCO limitation), but the 13 common ones are wired. |
| Per-layer opacity | ✅ done | core | Confirmed: transform.opacity default 1; drawLayer reads evalProp(tr.opacity); inspector 'blend' category + keyframeable. |
| Masking groups (composited alpha-holdout groups) | ❌ missing | core | Confirmed missing: no group-level alpha-holdout / shared-matte pass in renderScene. Only per-layer masks and the adjustment layer exist. |
| Per-layer masks (rect, oval, pen/Bezier) | 🟡 partial | core | Confirmed: applyMaskClip + drawFeatheredMaskLayer support rect/ellipse/polygon with feather + invert; inspector exposes shape (rect/ellipse/polygon), X/Y/W/H, sides, feather, invert. No freeform pen/Bezier path mask. |
| Clipping mask (clip to layer below) | ❌ missing | common | Confirmed missing: grep shows no clipTo/clipMask/trackMatte. The only destination-in usage is inside drawFeatheredMaskLayer (its own shape matte), not an inter-layer clip. No UI option. |
| Chroma key (green/blue screen) | ✅ done | common | Confirmed: chromaKey() per-pixel Euclidean distance + memo; 'chromakey' in FM.EFFECTS (tolerance+color); drawLayer applies before composite; inspector effectsSection renders it. |
| Luma key | ✅ done | common | Confirmed: lumaKey() with 28-unit soft ramp; 'lumakey' in FM.EFFECTS; applied in drawLayer media branch alongside chromakey. |
| Video transparency (alpha channel) | ❔ unknown | common | Confirmed code does NOT strip alpha — drawImage(src,…) passes browser-decoded alpha straight through, so WebM/alpha would composite if the browser decodes it. But there is no explicit alpha detection/flag/test, so behavior depends entirely on codec support. 'unknown' is the right call. |
| Adjustment-layer behavior (Copy Background equivalent) | 🟡 partial | common | Confirmed: native 'adjustment' layer (addAdjustmentLayer; applyAdjustment snapshots ctx.canvas below and re-composites with CSS filter + per-pixel posterize/tint/threshold/duotone/rgbsplit/pixelate). Better than AM's Copy-Background hack, but no literal 'Copy Background' effect / 'Fill 0%'. Note: adjustment ignores its own blendMode (forced source-over) and mask — a limitation, not a break. |
| Layer parenting (parent-child hierarchy) | ✅ done | common | Confirmed: layer.parent + isAncestor cycle guard; applyParentChain walks chain root-first composing translate/rotate/scale; inspector parent picker excludes cycle candidates; multi-level chains work. |
| Parenting Helper effect (weighted motion inheritance) | 🟡 partial | nice | Confirmed: applyParentRotMode implements normal/locked/weighted via parentMode + parentWeight; inspector exposes the dropdown + weight slider. No 'Auto Rotate' (orient-to-motion-direction) mode — grep finds none. |
| Character rigging via parenting | 🟡 partial | nice | Confirmed: full parenting infra (multi-level chains, nulls, rotation modes) present and usable for rigs, but no dedicated rig tooling / bone presets / character UI. Manual only. |

## Masking & shapes (vector masks, shape primitives, pen/path, mask feather/invert, stroke/fill)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Shape layer type (dedicated vector shape layer) | ✅ done | core | Confirmed: scene.js makeLayer() type==='shape' (lines 229-237) with live props shape/shapeW/shapeH/fill/stroke/cornerRadius/sides. compositor.js drawLayer() shape branch at line 812. app.js FM.addShapeLayer() line 320. Never flattened. |
| Built-in shape primitives (rectangle, ellipse, polygon, star, arrow, line, pie) | 🟡 partial | core | Confirmed partial. compositor.js (812-858) and inspector.js dropdown (line 573) implement rect/ellipse/line/polygon/triangle/star/heart. No arrow, no pie/sector (grep confirms only keyboard-arrow matches). Add menu (app.js 788-789) exposes only Rectangle + Ellipse directly; other primitives require the inspector shape dropdown. |
| Pen tool for freeform vector paths | ❌ missing | core | Confirmed missing. No pen tool, no anchor creation. canvas-edit.js only does move/scale/rotate/campan (lines 71-100). No 'path'/'pen' layer type in scene.js. The bezierCurveTo at compositor.js 843 is a hardcoded heart, not editable. |
| Edit Points mode — anchor point & Bezier handle manipulation | ❌ missing | core | Confirmed missing. canvas-edit.js drag modes are only move/scale/rotate/campan. No editPoints state or anchor/handle UI anywhere. |
| Convert to Outline (flatten parametric shape to editable bezier path) | ❌ missing | common | Confirmed missing. grep for outline/convert in contextmenu.js/app.js/inspector.js finds no such action. |
| Solid fill on shapes | ✅ done | core | Confirmed: compositor.js line 855 fills layer.fill (default '#3a7bd5'). inspector.js 576-578 colorField for fill. Line-shape uses fill as its stroke color (852). |
| Gradient fill on shapes (linear, radial, angular) | 🟡 partial | common | Confirmed partial. buildGradient() (694-707) does linear+radial only; grep for angular/conic returns nothing. inspector gradientControls() (392-408) exposes linear/radial, angle, two colors. Strictly 2-stop (addColorStop 0/1 at line 705) and not keyframeable. |
| Stroke (border/outline) on shapes and text | ✅ done | core | Confirmed: compositor.js 857 strokes when stk.enabled && width>0. inspector 589-594 (shapes) and text path. scene.js initializes stroke for shapes (234) and text (226). No cap/join-style or end-decoration controls. |
| Stroke Taper effect | ❌ missing | nice | Confirmed missing. Not in FM.EFFECTS (30-50); grep for taper finds nothing. |
| Drawing Progress effect (animated stroke draw-on) | ❌ missing | common | Confirmed missing. No drawing-progress/trim-path effect; grep finds nothing. |
| Freehand drawing layer (brush-based, raster strokes) | ❌ missing | common | Confirmed missing. No freehand/brush/draw layer type or tool; grep finds nothing. |
| Vector masking (apply vector shape as a layer mask) | ✅ done | core | Confirmed: applyMaskClip() (352-359) clips to Path2D; drawFeatheredMaskLayer() (364-398) for feathered. inspector 616-639 toggles layer.mask. Called in drawLayer at 754 / routed at 727. |
| Mask shapes: rectangle, oval, pen/freeform Bezier | 🟡 partial | core | Confirmed partial. inspector 630 offers rect/ellipse/polygon; addMaskShape() (336-351) handles those three. No pen/freeform bezier mask shape. |
| Mask feathering (edge softness) | ✅ done | core | Confirmed: drawFeatheredMaskLayer() applies blur(feather) at line 385 to the offscreen mask before destination-in/out composite. inspector Feather row 638; routed when feather>0 at line 727. |
| Mask expansion (contract / expand mask boundary) | ❌ missing | common | Confirmed missing. Mask object (621) has no expansion field; addMaskShape() applies no offset; grep finds no expand/expansion in mask code. |
| Mask opacity | ❌ missing | common | Confirmed missing. Mask object has no opacity field; feathered path uses destination-in/out with no per-mask opacity multiplier; no inspector control. |
| Mask invert / Exclude mode | ✅ done | core | Confirmed: applyMaskClip() invert path uses full-rect + evenodd (356-358); drawFeatheredMaskLayer() switches to destination-out when invert (379). inspector Invert checkbox 639. |
| Multiple masks per layer | ❌ missing | common | Confirmed missing. layer.mask is a single object; applyMaskClip/addMaskShape read singular layer.mask; grep finds no mask array or add-mask. No mask stack. |
| Animated masks (keyframeable shape, position, feather, opacity) | ❌ missing | core | Confirmed missing. inspector mask controls (633-638) use rangeRow writing static numbers, no keyframe diamonds. addMaskShape reads mk.x/y/w/h as plain numbers, not via evalProp. animatedProps() (scene.js 126-131) iterates only transform + effects, not mask. |
| Clipping mask (parent-child layer clip) | ❌ missing | common | Confirmed missing. Parenting (parent field) is transform inheritance only; no layer-pair destination-in clip. |
| Alpha mask (transparency-channel mask) | ❌ missing | common | Confirmed missing. No alpha-channel track-matte mode; grep for alphaMask/matte finds nothing. |
| Luma mask (brightness-based mask) | ❌ missing | common | Confirmed missing. lumaKey() (88-112) is a self-keying effect on a layer's own content, not a cross-layer luma matte. grep for lumaMask finds nothing. |
| Boolean shape operations (Union, Subtract, Intersect) | ❌ missing | nice | Confirmed missing. grep for union/subtract/intersect/boolean finds no shape-combine logic. |
| Move Along Path effect | ❌ missing | common | Confirmed missing. Not in FM.EFFECTS; grep for along-path finds nothing. |
| Repeat Along Path effect | ❌ missing | nice | Confirmed missing. No such effect anywhere. |
| Use text or shape outlines as masks | ❌ missing | nice | Confirmed missing. layer.mask only accepts its own embedded geometric shape; no reference to another layer's outline as mask path. |

## Camera & 3D (camera layer, position/scale/rotation/anchor, pan/zoom, 3D layers/perspective)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Camera Object layer | ✅ done | core | Confirmed. app.js:369 FM.addCameraLayer creates type='camera' layer; reachable from timeline ctx menu (timeline.js:441) and add-layer menu (app.js:790). compositor.js:1015-1051 routes the whole composite through the first visible camera via an offscreen canvas. |
| Camera X/Y/Z position (pan and depth) | 🟡 partial | core | Confirmed. X/Y pan fully implemented (inspector.js:414-415 Pan X/Y; canvas-edit.js:77/107-112 drag-pan; compositor.js:1041 reads camX/camY). Z/depth absent — transform has only x,y,scale,rotation,opacity,anchorX,anchorY (scene.js:206-214); grep for perspective/depth/posZ across js/ returns zero. |
| Camera rotation (roll/tilt/pan) | ✅ done | core | Confirmed done, but the audit's evidence is partly wrong: rotation is edited only via the inspector (inspector.js:417). The canvas rotate handle (canvas-edit.js:97-98) is UNREACHABLE for a camera because the selection box is hidden for cameras (canvas-edit.js:169). Compositor applies ctx.rotate(rot) at line 1042/1047 — roll works. |
| Zoom Distance and View Angle (field of view) | ❌ missing | core | Confirmed. No viewAngle/FOV/zoomDistance anywhere. Camera 'Zoom' is a flat 2D ctx.scale (compositor.js:1040/1047), no perspective projection. |
| Active Camera / Default Camera system | ❌ missing | core | Confirmed. app.js:371 blocks a second camera ('Scene already has a camera'). compositor.js:1015 uses .find() (first match). No camera-cut / multi-camera / default-vs-active concept. |
| Keyframe animation of all camera properties | 🟡 partial | core | Confirmed. x/y/scale/rotation keyframe via the shared setTransform/toggleKeyframe/evalProp path (scene.js:93-117) and render diamonds (inspector.js:414-417). Focus/fog/Z/FOV/exposure don't exist, so cannot be keyframed. |
| Layer Z-axis (depth) positioning | ❌ missing | core | Confirmed. transform has no z/depth (scene.js:206-214). Compositor composites flat in 2D order; no perspective. |
| Layer position, scale, rotation transform properties | ✅ done | core | Confirmed. scene.js:207-211 init x/y/scale/rotation; inspector.js:414-417 exposes keyframeable rows; canvas-edit.js handles drag-move/scale/rotate; compositor.js:748-752 applies the transform stack. |
| Pivot point / Anchor point | ✅ done | core | Confirmed. scene.js:212-213 anchorX/Y=0.5; inspector.js:439-440 Anchor X/Y sliders with position compensation (lines 420-436); compositor uses anchor as draw origin. |
| Focus Blur (depth of field) on Camera layer | ❌ missing | common | Confirmed. No focusDistance/depthOfField/DOF anywhere. Camera inspector limited to transform category (inspector.js:377-380). |
| Fog effect on Camera layer | ❌ missing | common | Confirmed. grep for 'fog' across js/ returns zero hits. |
| Motion Blur on Camera layer | 🟡 partial | common | Confirmed. Per-layer transform motion blur exists (compositor.js:400-441; inspector.js shutter/samples). Camera is skipped from layer drawing (compositor.js:1033) and the inspector restricts the camera to transform-only, so no camera-level motion blur with Position/Scale/Angle toggles. |
| Layer Parenting and Null Objects | ✅ done | common | Confirmed. scene.js:203-205 parent/parentMode/parentWeight; compositor.js:200-237 cycle-safe applyParentChain + rotation modes; inspector.js:480-499 Parent picker w/ Normal/Locked/Weighted; app.js:309/timeline.js:439 addNullLayer (invisible type='null'). |
| Parallax depth rig via Z-layering and camera | ❌ missing | common | Confirmed. No layer Z; camera pan shifts whole scene uniformly (single drawImage of the composite, compositor.js:1048). No differential parallax. |
| Preview Pan and Zoom (editor viewport navigation) | ❌ missing | common | Confirmed. Wheel-zoom and drag-pan (canvas-edit.js:107-112/146-162) write the CAMERA layer's transform; with no camera selected, wheel returns early (line 148). No independent editor viewport offset/scale. |
| Cube effect (faux-3D box from layer texture) | ❌ missing | common | Confirmed. POSTFX dispatcher (compositor.js:448) lists only rgbsplit/pixelate/posterize/mirror/tint/threshold/duotone. No 'cube'. |
| Box effect (faux-3D box with beveling) | ❌ missing | common | Confirmed. No 'box' 3D effect. Shape layer supports rect/ellipse/line/polygon only (scene.js:230), flat 2D. |
| Raster Extrude effect | ❌ missing | common | Confirmed. grep for extrude/rasterExtrude returns zero. |
| Parenting Helper effect | 🟡 partial | common | Confirmed. Normal/Locked/Weighted rotation modes implemented (inspector.js:494; compositor.js:231-236). No AM 'Auto Rotate' mode — grep for auto.?rotate returns zero. It's a per-layer setting, not a separate effect. |
| Oscillate effect (camera/layer shake) | ❌ missing | common | Confirmed. No 'oscillate' type. Only 'Wiggle' exists (compositor.js:193-198) with amp/freq, no Angle/Wave Type/Phase. |
| Auto-Shake effect | ❌ missing | common | Confirmed. No autoShake/auto-shake type; Wiggle is the only procedural jitter. |
| Skew / perspective distortion transform | ❌ missing | common | Confirmed. grep for skew returns zero; transform has no skewX/skewY (scene.js:206-214). |
| 3D lighting system (Point/Directional/Spot/Area/Ambient) | ❌ missing | nice | Confirmed. No light types/intensity/shadow/specular. Renderer is pure 2D canvas. |
| 3D object import (.obj, .glb, .gltf) | ❌ missing | nice | Confirmed. No gltf/glb/obj references in js/. |
| 3D text layer with extrusion, bevel, and lighting | ❌ missing | nice | Confirmed. Text is flat 2D canvas text (compositor.js:760+); scene.js:216-227 text props have no depth/bevel/3D-rotation. |
| Camera Scale property (wireframe coverage) | ❌ missing | nice | Confirmed. No cameraScale/wireframe coverage. The camera glyph in renderThumb (compositor.js:1097-1101) is a fixed thumbnail icon only. |
| Camera Exposure control | ❌ missing | nice | Confirmed. No exposure property; camera inspector limited to transform (inspector.js:377-380); no scene exposure pass. |
| Camera immunity to layer effects and parent transforms | 🟡 partial | nice | Refined. Effect immunity confirmed (compositor.js:1033 skips camera). Parent immunity is stronger in practice than the audit implied: the camera composite (compositor.js:1038-1050) reads cam.transform directly via evalProp and never calls applyParentChain, AND the Parent picker is hidden because catsFor(camera) returns only the transform category (inspector.js:377-380). So a parent can't be set via UI and would be ignored by the composite anyway. Still no explicit guard, so a programmatic/AI scene edit could set layer.parent with no effect — partial is fair. |
| Move along path effect (curved motion for parented layers) | ❌ missing | nice | Confirmed. No movePath/followPath; keyframes interpolate linearly/bezier on value only (scene.js:70-79); no vector path to follow. |

## Text & typography (fonts, styling, gradients, stroke, text animation presets, curved/path text)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Font family selection from built-in library | 🟡 partial | core | Confirmed inspector.js:310 FONTS = 10 system-stack strings; <select> built at 505-509, wired to layer.fontFamily and read at compositor.js:760. Works but only 10 fonts. |
| Custom font import (TTF / OTF) | ❌ missing | core | Confirmed: no FontFace, no font file input, no .ttf/.otf handling anywhere in js/. FONTS array is hardcoded with no extension path. |
| Font style variants (bold, italic, underline) | 🟡 partial | core | Confirmed bold/italic toggles inspector.js:521-525 wired into compositor font string (760). grep for 'underline' across all js returns nothing — underline truly absent. |
| Font size and scale | ✅ done | core | Confirmed inspector.js:510 numeric Size input wired to layer.fontSize; transform scale keyframeable separately. Canvas vector text stays sharp. |
| Text alignment (left, center, right) | ✅ done | core | Confirmed inspector.js:511-518 L/C/R buttons set layer.align; compositor.js:758 ctx.textAlign and drawAnimatedText honour it. (Note: curved-text path ignores align — see bugs.) |
| Solid color fill | ✅ done | core | Confirmed inspector.js:453-456 colorField sets layer.color; compositor.js:757 ctx.fillStyle=layer.color. Not keyframeable (direct field assignment). |
| Gradient fill for text (linear, radial, angular) | 🟡 partial | core | Confirmed gradientControls (inspector.js:392-408) called for text at line 540: linear+radial only, 2 stops, angle for linear only. compositor buildGradient (694) + per-unit sampling (287-297). No angular/conic; stops not keyframeable. |
| Transparent / no fill | ❌ missing | common | Confirmed: no fill-off toggle for text; compositor.js:757 always sets fillStyle then fillText. Stroke-only text not achievable. |
| Stroke / outline with color and width | ✅ done | core | Confirmed inspector.js:531-539 Outline check + width + color; compositor.js:800-809 strokeText with doubled lineWidth before fill (correct outside-stroke). Also in drawAnimatedText:299 and drawArcLine:327. |
| Drop shadow | 🟡 partial | core | Confirmed inspector.js:469-477 + compositor.js:741-746 set shadowColor/Blur/OffsetX/Y. No opacity control; applies to all layer types. |
| Glow effects (Light Glow, Soft Glow, Dark Glow) | 🟡 partial | common | Confirmed single 'glow' effect (compositor.js:39) rendered as drop-shadow(0 0 r color) at 177. No Light/Soft/Dark variants. |
| Letter spacing (tracking) control | 🟡 partial | core | Confirmed inspector.js:528 Spacing rangeRow -> layer.letterSpacing; compositor.js:761 ctx.letterSpacing behind 'letterSpacing' in ctx guard. Not keyframeable; no-ops in browsers lacking canvas letterSpacing (see bugs). |
| Line height (line spacing) control | 🟡 partial | core | Confirmed inspector.js:529 Line height rangeRow; compositor.js:765 lh = fontSize*lineHeight. Wired, not keyframeable (direct field). |
| Text Spacing effect (random / even spacing animation) | ❌ missing | common | Confirmed: no text-spacing entry in FM.EFFECTS (30-50). letterSpacing is a static property only; no animatable/randomise spacing effect. |
| Text Progress effect (character-by-character typewriter reveal) | 🟡 partial | common | Confirmed 'typewriter' preset (inspector.js:545; compositor.js:280 binary alpha per unit with stagger). No continuous keyframeable 0-1 progress param. |
| Text Randomizer effect (scramble / matrix-style characters) | ❌ missing | common | Confirmed: grep for scramble/randomiz/matrix returns nothing; preset list is none/fade/fade-up/typewriter/pop/slide only. |
| Text Transform effect (per-letter/word/line animation) | 🟡 partial | nice | Confirmed drawAnimatedText (245-307) staggers char/word/line with 5 reveal presets, but no independent per-unit position/scale/rotation animator. Stagger-reveal, not AE-style text animator. |
| Scrolling text presets (30 built-in scrolling title animations) | ❌ missing | common | Confirmed: no scrolling effect type, no scroll preset list, no ticker logic. Presets are reveals only. |
| Layer styles for text (30 built-in style presets) | ❌ missing | common | Confirmed FM.fxPresets (inspector.js:160-166) holds 4 builtin EFFECT-stack presets (VHS Glitch/Duotone/Dreamy/Comic), not text fill+stroke+shadow style presets. No 30-style concept. |
| Keyframe animation of all text properties | 🟡 partial | core | Confirmed transform props (x/y/scale/rotation/opacity) keyframeable via setTransform; effect params via setProp. But color/fontSize/letterSpacing/lineHeight/fontFamily/bold/italic use colorField/rangeRow/textRow with plain field assignment (no setProp, no diamond) -> not keyframeable. |
| 27 blending modes for text layers | 🟡 partial | common | Confirmed BLEND object (compositor.js:11-25) has 13 modes; FM.BLEND_MODES applied to all layer types incl. text. 13 of AM's 27. |
| Mask / clipping using text layer outlines | ❌ missing | common | Confirmed mask system (inspector.js:617-640) supports rect/ellipse/polygon shapes only. No text-as-mask / track-matte / clip-to-text. |
| Convert text to vector outline (iOS/iPadOS) | ❌ missing | nice | Confirmed: no Convert-to-Outline / glyph-path extraction anywhere. Canvas 2D has no glyph-outline API. |
| Curved / arched text via Bend effect | ✅ done | nice | Confirmed inspector.js:530 Curve range (-180..180) -> layer.textCurve; compositor.js drawArcLine (311-333) places chars on a circular arc with per-char rotation; invoked at 796-797 when \|curve\|>0.5. Native arc renderer. (Has quality limitations — see bugs.) |
| Contour Gradient effect (gradient glow around text edges) | ❌ missing | nice | Confirmed: no contour/edge-detect gradient effect in FM.EFFECTS or elsewhere. |
| Motion blur on text | ✅ done | common | Confirmed inspector.js:599-604 motion-blur controls available to all layer types; compositor.js drawMotionBlur averages sub-frames; applies to text (no exclusion). |
| Preset / XML import of community text animations | ❌ missing | common | Confirmed fxPresets is localStorage-only save/load of effect stacks. No XML parse, no file import, no community library. |

## Color, fill & gradients (solid/gradient fills, color themes/palettes, eyedropper, swatches)

| Feature | Status | Tier | Notes |
|---|---|---|---|
| Solid color fill for shapes and text layers | ✅ done | core | Confirmed. Shape fill: inspector.js:577 colorField(()=>layer.fill) wired; compositor.js:855 ctx.fillStyle uses layer.fill (or gradient). Text color: inspector.js:455 colorField(()=>layer.color); compositor.js:757 ctx.fillStyle=layer.color. End-to-end. |
| Gradient fill for shapes and text layers (linear, radial, and angular types) | 🟡 partial | core | Confirmed partial. inspector.js:392-408 gradientControls gives enable checkbox + Linear/Radial select + angle slider (linear only) + 2 color pickers; compositor.js:694-707 buildGradient renders linear/radial. NO angular type (select only [linear,radial]). Two-stop only (c0/c1). Not keyframeable — g.angle/c0/c1 are set directly, never via setProp/evalProp. |
| Color picker with color wheel, hex input, RGB and HSL/CMYK sliders, and alpha/opacity control | 🟡 partial | core | Confirmed. colorField (inspector.js:131-155) = native <input type=color> swatch + hex text input only. No RGB/HSL/CMYK sliders, no per-color alpha. color-wheel.js is a hue/sat GRADING wheel (writes colorGrade), not a color chooser. Layer opacity is a separate transform prop. |
| Mini (floating) color picker — adjust color while seeing canvas in real time | ❌ missing | common | Confirmed. No floating/mini picker. position:fixed matches in styles.css are modal/overlay/context-menu/toast, not a color picker. colorField opens the native OS dialog. |
| Eyedropper / color sampler tool | ❌ missing | core | Confirmed. No EyeDropper API, no canvas color-sampling, no dropper UI anywhere. (The 'sample' grep hits are audio sampleRate / sample-clip recording, unrelated.) |
| Custom color swatches palette — save, add, and remove project colors | 🟡 partial | common | Confirmed. FM.recentColors (inspector.js:127-153) is an auto-populated recents row (up to 10 chips, click to reapply). In-memory only — no localStorage persistence, resets on reload. No manual add/remove, not a named palette. |
| Full-screen palette editor with row rearrangement | ❌ missing | common | Confirmed. No palette editor or rearrangement UI anywhere. |
| Stroke/outline color (solid color on layer stroke) | ✅ done | core | Confirmed. Shape stroke: inspector.js:589-594 toggle+width+colorField; compositor.js:857 strokeStyle=stk.color. Text outline: inspector.js:533-538 toggle+width+colorField; compositor.js:805 strokeStyle=stk.color. Line shapes use layer.fill as color (inspector.js:576). Wired. |
| Gradient Map effect (luma-to-gradient color remapping) | ❌ missing | common | Confirmed. No gradient-map in FM.EFFECTS (compositor.js:30-50). Duotone (drawDuotone, line 594) maps luma to two colors (shadows/highlights) — closest analog but not exposed as Gradient Map and not multi-stop. |
| Four-Color Gradient effect (four individually positioned color points) | ❌ missing | common | Confirmed. No four-color-gradient in FM.EFFECTS or compositor. |
| Gradient Overlay effect (two-color overlay on layer opaque areas) | ❌ missing | common | Confirmed. No gradient-overlay effect; fillGradient is a fill, not a post-process overlay. |
| Contour Gradient effect (gradient radiating from layer edges) | ❌ missing | nice | Confirmed. No contour-gradient / edge-radiating effect. |
| Colorize effect (tint a layer while preserving luminance) | 🟡 partial | common | Confirmed. drawTint (compositor.js:530-558) maps luma*color blended with original by amount — functionally a colorize. Labeled 'Tint', not 'Colorize'; no separate Colorize entry. |
| Replace Color effect (swap one hue with another) | ❌ missing | common | Confirmed. No replace-color / hue-selective replacement effect. |
| Spot Color effect (selective color — keep one hue, desaturate rest) | ❌ missing | nice | Confirmed. No spot-color / selective saturation effect. |
| Palette Map effect (map pixel colors to closest color in a custom palette) | ❌ missing | nice | Confirmed. No palette-map effect. |
| Spectral Map effect (luminance-to-spectrum color mapping) | ❌ missing | nice | Confirmed. No spectral-map effect. |
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
| Resolution selection (720p / 1080p / composition max) | 🟡 partial | core | Confirmed. Export dialog (index.html:101-107) offers relative SCALE factors only (1x/0.5x/0.75x), not named presets. Named 720/1080/1440/2160p presets live in the canvas-SIZE dialog (project setup, index.html:145-151), not per-export. Functional but not named export presets. |
| Custom project resolution (arbitrary width × height) | 🟡 partial | common | Confirmed. Canvas dialog computes dimensions from aspect-chip (16:9/9:16/4:5/1:1/4:3) × resolution preset (cvCompute, app.js:844-849), even-rounded. No freeform W×H text entry; only preset combinations. |
| Frame rate selection (12 / 24 / 25 / 30 / 50 / 60 fps) | 🟡 partial | core | Confirmed. exp-fps offers only 30/24/60 (index.html:109-114); cv-fps only 24/30/60 (153-158). 12, 25, 50 fps absent. |
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
| Import audio from device (music, SFX, voice recordings) | ❌ missing | core | Confirmed. app.js handleFiles (lines 702-708) only branches on video/image; index.html file-input accept="video/*,image/*" (line 87). scene.js makeLayer has no 'audio' type (types: video\|image\|text\|shape). Standalone audio files are silently dropped. |
| In-app voice/microphone recording | ❌ missing | common | Confirmed. No getUserMedia/MediaRecorder for microphone anywhere (media.js, app.js). sample.js uses MediaRecorder only to synthesize a test clip. No mic UI. |
| Extract (detach) audio from a video layer | ❌ missing | common | Confirmed. layerMenuItems (app.js 654-686) has no Extract/Detach Audio; audio stays attached to the video layer in audio-play.js and exporter.js. |
| Multiple simultaneous audio layers | ❌ missing | core | Status defensible but nuanced. There is no dedicated audio-only layer type (scene.js makeLayer). HOWEVER simultaneous audio mixing genuinely works for video layers: audio-play.js iterates ALL reversed layers and exporter.js buildAudioMix (lines 77-111) mixes ALL visible video layers into one OfflineAudioContext. So 'multiple simultaneous audio sources' functionally exists; only a standalone audio track type is absent. Could be argued 'partial'. |
| Waveform display on timeline | ✅ done | core | Confirmed. media.js getWaveform (94-114) builds a 600-bin peak array from the decoded AudioBuffer; timeline.js drawWaveform (109-118) renders it onto the clip canvas. |
| Trim audio (drag handles) | ✅ done | core | Confirmed. timeline.js trimDrag (470-498) adjusts start/duration/trimStart per edge, clamped to source length and speed. exporter.js makeClipBuffer (48) and audio-play.js reversedBuffer (25) both slice from trimStart. |
| Split audio clip | ✅ done | common | Confirmed. app.js splitLayer (613-652) splits at playhead, computing trimStart correctly for both forward (629) and reversed (624-627) clips; clones media so B never aliases A. |
| Volume/gain control per layer | ✅ done | core | Confirmed and consistent. layer.volume is stored 0-1 (scene.js makeLayer line 196 = 1). inspector.js line 645 shows a 0-100 slider but writes v/100. app.js tick line 206 applies it to m.el.volume; exporter buildAudioMix line 90 uses it as gain. Audit's note that the slider is '0-100' and exporter 'reads layer.volume for gain' is internally consistent because the stored value is 0-1. |
| Volume keyframe automation | ❌ missing | core | Confirmed. Volume uses rangeRow (inspector.js 111, 645), a plain slider with NO keyframe diamond — only transformRow and effect rows expose the ◆/FM.toggleProp machinery. layer.volume is read as a scalar in tick (206) and export (90). |
| Fade in / fade out (handles or keyframes) | ✅ done | core | Confirmed. scene.js fadeIn/fadeOut (197-198), fadeWindows (295-298) and fadeMul (303-308). inspector.js 649-650 sliders. Envelope scheduled via Web Audio gain in audio-play.js (61-69) and exporter buildAudioMix (94-106). fadeWindows scales overlapping fades to a triangle to avoid out-of-order ramps. |
| Crossfade between audio clips | ❌ missing | common | Confirmed. Only independent per-layer fade-in/out sliders; no linked/automatic crossfade logic between adjacent clips. |
| Mute per audio layer | 🟡 partial | common | Confirmed partial. inspector.js 347-350 Mute toggle sets layer.volume=0 (saving layer._lastVol) rather than an independent mute flag. Solo (timeline.js 199-202) only affects visual compositing (compositor.js 1029-1032) and does NOT silence non-soloed audio in audio-play.js or buildAudioMix (both check only layer.visible). |
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
| Multi-panel workspace (Preview / Timeline / Layers / Properties) | 🟡 partial | core | Confirmed: index.html has #stage, #inspector-panel, #timeline-panel. No separate Layers panel (timeline.js line 3 comment + FM.layersPanel in app.js line 689 is just a thin alias that calls timeline.rebuild()). styles.css uses a fixed grid (grid-template-rows:50px 1fr 232px) and has ZERO @media queries, so there is no mobile/collapse behavior. 3 of 4 areas exist. |
| Touch-drag on-canvas object manipulation (move, scale, rotate via handles) | 🟡 partial | core | DOWNGRADED from done. Mouse manipulation is fully wired (canvas-edit.js startMove/startHandle/onMove, handles attach pointerdown). BUT it is NOT genuinely touch-usable: there is no touch-action:none on #preview, #canvas-wrap, or .sb-handle (grep confirms touch-action only exists on .cw-canvas and .ge-canvas). On a touchscreen a drag scrolls/zooms the page instead of manipulating the layer. Works on desktop pointer; not on touch. |
| Two-finger pinch-to-zoom / pan on Preview canvas | ❌ missing | core | Confirmed. canvas-edit.js handles only single-pointer drag + mouse wheel (camera only). Grep for pinch/touchstart/multi-pointer/pointer-cache returns nothing. No two-finger gesture anywhere. |
| Two-finger pinch zoom on the Timeline (temporal zoom) | ❌ missing | core | Confirmed. timeline.js line 404 only handles Cmd/Ctrl+wheel; buttons + keyboard zoom. No pinch/multi-pointer logic. |
| Undo / Redo (button and keyboard shortcut) | ✅ done | core | Confirmed. history.js: 120-step JSON snapshot stack, undo()/redo(). Buttons wired app.js 821-823. Cmd/Ctrl+Z, Shift+Cmd+Z, and Cmd+Y wired app.js 894-900. |
| Contextual property panel (stays open and follows layer selection) | ✅ done | core | Confirmed. inspector.js refresh() repopulates from the selected layer; #inspector-panel is always visible. view resets to 'home' only when layer.id changes (line 684), so the open category persists when the same layer is re-selected. |
| Move & Transform numeric input panel | 🟡 partial | core | Confirmed. buildCategory('transform') renders X, Y, Scale, Rotation, Opacity, Anchor X/Y with keyframe diamonds, all wired to FM.setTransform with live preview. Skew is absent from scene.js makeLayer and from the inspector — not implemented. |
| Keyframe graph editor with Bezier curve handles | ✅ done | core | Confirmed. graph-editor.js draws a canvas bezier curve, two draggable handles (pointerdown/move), Hold/step display, preset buttons Linear/In/Out/In-Out/Overshoot/Anticipate/Hold, numeric From/To value entry. Mounted in inspector Transform category. scene.js bezierAt() evaluates. |
| Layer list: tap to select, long-press drag to reorder | 🟡 partial | core | Confirmed. timeline.js buildHead: click selects (line 204); reorder uses HTML5 drag-and-drop (head.draggable=true, dragstart/drop, lines 207-215) — NOT long-press, and HTML5 DnD is unreliable on touch. The list is the timeline track head, not a dedicated panel. |
| Layer grouping (non-destructive) | ❌ missing | core | Confirmed. No 'group' layer type in scene.js makeLayer, no groupLayers/ungroup function. The 'group' references in timeline.js (lines 266/270/464/517) are a multi-clip drag-move helper, not container grouping. Parent/child parenting exists (inspector 481-502) but only links transforms — not grouping. |
| Razor / Split tool | ✅ done | core | Confirmed. app.js FM.splitLayer (613) splits at playhead, handles trim/reverse/speed, clones fresh media. Wired to btn-split (833), S key (961), and layer context menu (659). |
| Trim handles on timeline clips | ✅ done | core | Confirmed. timeline.js buildLane appends left/right .clip-grip handles (280-292), trimDrag set on pointerdown, window pointermove does real-time trim with speed/source-duration limits and snapping; history committed on pointerup. |
| Playback control bar (Play, Pause, Skip, Scrub) | ✅ done | core | Confirmed. Transport row in index.html (btn-tostart/play/toend/loop/split/snap/onion, preview-rate, time-readout). FM.togglePlay, scrub via ruler/lane pointerdown, readout updates each tick, double-click readout to type exact time (app.js 761). |
| Layer visibility toggle (eye icon) | ✅ done | common | Confirmed. timeline.js th-eye toggles layer.visible (175), icon 👁/🚫, requestRender + history commit. Also a Visible checkbox in Element Properties (inspector 479). |
| Layer locking | ✅ done | common | Confirmed. timeline.js th-lock toggles layer.locked (197). canvas-edit topHit skips locked layers (65). Inspector quick-row lock button (345). Context menu lock/unlock (665). |
| Layer color labels and naming | 🟡 partial | common | Confirmed. Naming via double-click th-name (timeline 183) and inspector name input (321). clipColor auto-assigned from CLIP_COLORS (scene.js 17) but there is NO UI to change a layer's color label — grep finds no clip-color picker. |
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
| Grid effect as visual alignment aid | ❌ missing | nice | Confirmed. btn-guides draws rule-of-thirds + title-safe overlay (app.js 48-59), a preview overlay — not a per-layer procedural grid effect. No 'Grid' type in FM.EFFECTS (compositor.js). Grep finds no grid effect. |
