# ChatGPT pile: inventory of 261 commits

Branch `codex/690-reviewed-local`, tip `6ed01d4df0235d8b9f921a783dbe7deb74ff45ae`, compared with live `main` `f7716576` (v17.22). Source: `/private/tmp/freemotion-reviewed-local-20261005`, read-only (`git log --reverse f7716576..6ed01d4d`). Built 5 Oct 2026 from the commit list, each commit's files, the two merges' remerge-diffs, and ChatGPT's own reports under `outside/chatgpt/fixes/`. Nothing was run in a browser.

**39 themes; each of the 261 commits is in exactly one** (checked by script: 261 listed, 261 assigned, none twice, every theme in branch order). Request codes: `B` numbers are new effects and `C` numbers are known defects, both listed in `tools/design/plans/2026-09-29-idle-backlog/backlog.md` (the #966 / #482 idle backlog). #690 is his standing brief: find bugs and polish effects.

## Themes

| Theme | Kind | # | Files | Request |
|---|---|---|---|---|
| **T01** Filter layer workflow (B21) | feature | 1 | `index.html`, `js/addmenu.js`, `js/app.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B21 (backlog.md:1200) |
| **T02** New colour-grading effects: Colour Wheels, HSL Mixer, Clarity & Dehaze, B&W Mixer, Channel Mixer, Auto Grade, Log-to-Rec.709 x4 | feature | 10 | `index.html`, `js/compositor.js`, `js/fx-registry.js`, `js/inspector.js`, `styles.css`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B18, B20, B26, B33, B50, B51, B52 |
| **T03** New visual effects: Venetian Blinds, Radio Waves, Lens Magnifier, Circle Array, Cartoon, Oil Paint, Laser Beam, Fractal Noise, Gradient Wipe, Title Warp, Odometer Roll, Spill Suppressor, Deflicker | feature | 14 | `index.html`, `js/compositor.js`, `js/fx-registry.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B27-B32, B37-B41, B53, B54 |
| **T04** New sound-effect packs: Drums, Explosion & Thunder, Ambience, Everyday Foley | feature | 4 | `index.html`, `js/sfx.js`, `styles.css`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B22, B23, B35, B36 |
| **T05** Audio clip tools: Reduce Noise and Auto-duck music under speech | feature | 2 | `index.html`, `js/audio-tools.js`, `js/auto-duck.js`, `js/inspector.js`, `js/noise-reduction.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B24, B25 |
| **T06** New audio effects: Graphic EQ, Hum Remover, De-esser, Channel Utility, Stereoizer, Auto-Wah, Noise Gate, Loudness Match | feature | 8 | `index.html`, `js/audio-fx-live.js`, `js/audio-fx.js`, `js/exporter.js`, `js/inspector.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #966 idle backlog B34, B42-B48 |
| **T07** Rendered-scene and reduced-preview correctness (Shake smear fps, Backdrop Clone timecode, Smooth Edges, Linear Streaks, Roughen Edges scale, RGB Split, Smooth Bevel) | bug-fix | 7 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #690 clause 2 (bug hunting); follow-ups to #686 / #691 / #934 |
| **T08** Glow family: bloom past transparent edges, threshold softness, smoothness passes, blend, source colour (C23/C49) | feature | 7 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C23, C49 (backlog.md:430 s6.2) |
| **T09** Sharpening colour protection: Unsharp Mask control and Overdrive filter | feature | 2 | `index.html`, `js/compositor.js`, `js/filters.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #690 clause 3 (polish existing effects/filters) |
| **T10** Effect frame-buffer reuse: Unsharp Mask, Light/Soft Glow, Dark Glow, idle release | perf | 4 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | unrequested (#690 standing brief) |
| **T11** Project import hardening: malformed dimensions/canvas/layers, deep nesting, failed media and font restore, warning survives import | bug-fix | 7 | `index.html`, `js/storage.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #673 / #888 follow-ups; overlaps open #1051 (plain-value project), partly #1040 and #1042 - verify |
| **T12** Shared-file omission warnings: media and custom fonts missing from template, project and backup files | bug-fix | 3 | `index.html`, `js/home.js`, `js/settings.js`, `js/storage.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #888 / #343 follow-ups; related #1038 (test gap) |
| **T13** Replace media cancels when the project changes mid-pick | bug-fix | 1 | `index.html`, `js/app.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | unrequested (cites audits/937-hunt.json as distinct) |
| **T14** Home redesign, pre-v17.22 history (already live as v17.22) | mixed | 7 | `index.html`, `js/collab-ui.js`, `js/home-arrow.js`, `js/home.js`, `styles.css`, `tests/tests.js`, `outside/chatgpt/fixes/*` | the v17.22 Home reference layout |
| **T15** Side-branch consolidation merge | tooling | 1 | `index.html`, `js/compositor.js`, `styles.css`, `tests/tests.js`, `outside/chatgpt/fixes/* (conflict resolution only; brings in T01-T14)` | unrequested |
| **T16** Keyframed Speed/Rate phase continuity across effects (accumulated phase instead of rate x time) | bug-fix | 28 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #690 clause 2 (bug hunting); unrequested |
| **T17** Remove Vocals twin follows the source clip's speed changes | bug-fix | 1 | `index.html`, `js/audio-tools.js`, `js/history.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #690 clause 2 |
| **T18** Bundled font catalogue: 11 open (OFL) families plus FM Aster Round and FM Circuit Sans | fonts | 3 | `index.html`, `js/app.js`, `js/exporter.js`, `js/inspector.js`, `js/settings.js`, `js/storage.js`, `js/studio-fonts.js`, `js/text-edit.js`, `styles.css`, `tests/tests.js`, `fonts/README.md`, `fonts/open/**`, `fonts/original/*`, `fonts/original/source/**`, `outside/chatgpt/fixes/*` | unrequested |
| **T19** Original FM display font families: Meridian Serif, Lilt Marker, Vector Mono, Foundry Slab, Cloud Pop, Signal Pixel, Aperture Stencil, Ribbon Script, Palais Deco, Blackthorn, Reed, Stormbrush, plus middle dots | fonts | 14 | `index.html`, `js/studio-fonts.js`, `tests/tests.js`, `fonts/README.md`, `fonts/original/*`, `fonts/original/source/**`, `outside/chatgpt/fixes/*`, `outside/chatgpt/font-study/**` | unrequested |
| **T20** Shape silhouette redraws (pass, revert, independently reviewed subset) | mixed | 9 | `index.html`, `js/addmenu.js`, `js/app.js`, `js/compositor.js`, `js/exporter.js`, `tests/tests.js`, `outside/chatgpt/fixes/*`, `outside/chatgpt/shape-review/**` | #929 (shapes still bad) / #690; Ezra's shape-quality feedback quoted in shapes-quality-hold.md |
| **T21** Caption editor stops leaking document listeners on redraw | bug-fix | 1 | `index.html`, `js/captions.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #690 clause 2 |
| **T22** Worker-backed MP4 export (forward port of the #47 milestone) | feature | 1 | `index.html`, `js/compositor.js`, `js/eases.js`, `js/export-resume.js`, `js/export-worker.js`, `js/exporter.js`, `js/fx-registry.js`, `js/render-canvas.js`, `js/scene.js`, `js/storage.js`, `js/studio-fonts.js`, `tests/_xresume.html`, `tests/export-audio-snapshot-unit.cjs`, `tests/export-worker-unit.cjs`, `tests/fixtures/fonts/*`, `tests/render-canvas-unit.cjs`, `tests/tests.js`, `tests/worker-*.html`, `outside/chatgpt/fixes/*` | #47 (export must not lose the render; off the main thread) |
| **T23** Wipe effects: hard-wipe zero-progress fix, layer fit and radial directions (C36) | mixed | 3 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #904 / #690; backlog C36 (s12.3) |
| **T24** Service worker keeps offline cache writes alive | bug-fix | 1 | `index.html`, `sw.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #112 / #306 / #430 follow-up |
| **T25** Halftone smooth/averaged dots, Poster Print keeps colour, smooth Checker/Grid/Stripes (C32/C33) | feature | 3 | `index.html`, `js/compositor.js`, `js/filters.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C32, C33 (s13.1, s12.5); audits/912-audit.json |
| **T26** Border Frame: smooth rounded corners, styles and draw-on (C33, s12.5) | feature | 2 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C33, s12.5 |
| **T27** Glow Scan follows its layer and varies sweep timing (C35) | feature | 1 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C35 (s6.7) |
| **T28** Lightning path and draw controls (C34) | feature | 2 | `index.html`, `js/compositor.js`, `js/inspector.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C34 (s11.6); #320, #403, #904 |
| **T29** Roughen Edges seed, evolve, detail and erosion; Voronoi Cells seed (C37) | feature | 5 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C37 (s11.7, s11.5) |
| **T30** Lens Flare optics controls and percent position (C38) | feature | 1 | `index.html`, `js/compositor.js`, `js/fx-registry.js`, `js/inspector.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C38 (s6.5) |
| **T31** Radial Shadow quality/opacity and Long Shadow reach/angled edges (C42/C43) | feature | 2 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C42, C43 |
| **T32** Tilt Shift sharp band and smoother blur (C45) | feature | 1 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C45 (s14.1) |
| **T33** Vignette frame-fitted roundness (C50) | feature | 1 | `index.html`, `js/compositor.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C50 (s6.1) |
| **T34** Directional and Gaussian Blur edge repeat, one-sided smear, one-axis, mix and blend (C25) | feature | 4 | `index.html`, `js/compositor.js`, `js/gl-color.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C25 (s14.3, s15.7) |
| **T35** Warp edge/smooth sampling, Card Flip rotation and back, Ripple/Curl falloff (C26/C29/C30) | feature | 3 | `index.html`, `js/compositor.js`, `js/gl-warp.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C26, C29, C30 (s10.1, s10.2, s14.7) |
| **T36** C31 core: Frame Stutter holds and Time Warp Scan cold seeks rebuilt from history (shapes, stills, video, speed, parents, crop) | bug-fix | 21 | `index.html`, `js/app.js`, `js/compositor.js`, `js/export-worker.js`, `js/exporter.js`, `js/frames.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C31 |
| **T37** C31 masks: Frame Stutter and Time Warp Scan through hard/feathered vector masks and pen masks | bug-fix | 16 | `index.html`, `js/compositor.js`, `js/exporter.js`, `js/frames.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C31 |
| **T38** C31 keyed colour effects upstream of Frame Stutter / Time Warp Scan (Brightness, Contrast, Levels, Gamma, Vibrance, Saturation, Colour Balance, Exposure, Hue Shift) | bug-fix | 29 | `index.html`, `js/compositor.js`, `js/exporter.js`, `tests/tests.js`, `outside/chatgpt/fixes/*` | #482/#966 backlog C31 |
| **T39** Reports-only commits (verification records and font-study proofs) | reports-only | 31 | `outside/chatgpt/fixes/*`, `outside/chatgpt/font-study/**` | unrequested |
| **Total** | | **261** | | |

By kind: bug-fix 115, feature 74, reports-only 31, mixed 19, fonts 17, perf 4, tooling 1.

## Dependencies and landing order

1. Branch shape: three roots. Mainline from live f7716576 (v17.22): 90c78228..517bfa1a, then everything after 7bc6c9ab. Side branch from 28104a3e (v17.21, NOT v17.22): 63b2fb08..e7232077 (T01-T14 + part of T16), merged by 7bc6c9ab (T15). Font branch from f7716576: 87979bea, d7274642, merged by f8c2f757 (T18). Cherry-picking side-branch commits onto v17.22+ will replay T14's Home commits against a newer Home; skip T14 and reproduce T15's resolution (keep v17.22 Home, keep both the Fractal Noise and new Smooth Bevel compositor hunks, drop the 5 duplicate Home tests).
2. Hard code dependencies: T19 needs T18 (studio-fonts.js catalogue). T22 (worker export) needs T18 (FM.studioFonts source() for bundled faces in the worker). T36 needs T22 (b050da19/93b499ce change js/export-worker.js REVISION 18->19 and FM.withFrameStutterSources). T37 and T38 need T36 (same history path, interleaved commits; land T36->T37->T38 together in branch order). T16's 8efc6234 (Laser Beam pulse) needs T03's 44b15c57; 8516f675 (Radio Waves births) needs T03's 410a34d1/1b80bf41. T10's glow buffer reuse sits on T08's glow kernels (8324f0c0). T29 builds after T07's 746d53a8 (Roughen scale) and touches the same Voronoi function as T16's 329c5401. T26 0f98b861 needs cee51dcb. T25 16c061a6 and T09 b5ed0efb both edit js/filters.js recipes. T23 ce7768ac precedes e15da085 in the same wipe code.
3. Conflicts with the builder's unshipped v17.23 (polish batch 6, staged in /Users/ezrasmith/Claude/FreeMotion): T08 (glow C23/C49), T27 (Glow Scan C35), T30 (Lens Flare C38), T33 (Vignette C50) duplicate controls the builder already built and reviewed; T10 and T31 touch the same kernels. Expect to DROP T08/T27/T30/T33 and rebase T10/T31 after v17.23 lands. T25/T26/T28/T29/T32/T34/T35 implement backlog sections (12.5, 13.1, 11.6, 11.5/11.7, 14.1, 14.3, 10.1/10.2/14.7) the builder planned as later #482 polish batches; land before the builder reaches those sections or drop.
4. Every product commit bumps index.html ?v= cache tags, so every cherry-pick conflicts on index.html; renumber the buster at land time (ship.sh gate). No commit touches js/collab-core.js: the builder's batches bump SCHEMA_REV and the collab fingerprint for every new effect/audio param, and this pile does not (T02-T06, T08, T23, T25-T35 add params/effects). Tests are tagged { item: 'TBD' }, which prove.sh/ship.sh cannot map to a queue item; retag per landed item.
5. T14 (Home) and T15 (merge) are not landable as commits. T39 (reports) has no app code; land with or without the themes it records. T22 is one 30-file commit; land it alone, after T18.
6. Suggested land order (lowest risk first, Simple mode stays first): T24, T21, T17, T13, T11, T12, T07, T09, T16 (minus the two T03-dependent fixes) -> T01 -> T03/T02/T04/T05/T06 (after design review; colour wheels hidden at <=700px needs a phone check) -> T18 -> T19 (after he sees the fonts) -> T22 -> T36 -> T37 -> T38 -> T23, T25, T26, T28, T29, T32, T34, T35, T31 -> T20 only after his shape pick (#929). Drop T08, T27, T30, T33; rebase T10 after v17.23.


## Commits by theme (branch order)

### T01: Filter layer workflow (B21)

*feature*, 1 commit(s). Request: #966 idle backlog B21 (backlog.md:1200). Add > Filter layer: a neutral adjustment layer placed over the frontmost clip at the playhead, opening the Filters tab. Built on v17.21 (side branch).

- `63b2fb08` Add neutral Filter layer workflow

### T02: New colour-grading effects: Colour Wheels, HSL Mixer, Clarity & Dehaze, B&W Mixer, Channel Mixer, Auto Grade, Log-to-Rec.709 x4

*feature*, 10 commit(s). Request: #966 idle backlog B18, B20, B26, B33, B50, B51, B52. Ten new colour effects. NOTE styles.css hides .fx-colour-wheels at max-width 700px (phone gets sliders only) - a mobile-first design call to check.

- `7e8c0307` Add tonal Colour Wheels grade
- `ccfd69e2` Add eight-band HSL Mixer grade
- `3fc2e59e` Add Clarity and Dehaze colour effect
- `91632a27` Add Black and White Mixer effect
- `6d538904` Add Channel Mixer with selectable output controls
- `5a5c0391` Add temporally smoothed Auto Grade effect
- `8259b767` Add Panasonic V-Log to Rec.709 grade
- `a7eb2e87` Add Sony S-Log3 Cine to Rec.709 grade
- `1d9895b7` Add Apple Log to Rec.709 grade
- `fd8ffcbb` Add Canon Log 3 to Rec.709 grade

### T03: New visual effects: Venetian Blinds, Radio Waves, Lens Magnifier, Circle Array, Cartoon, Oil Paint, Laser Beam, Fractal Noise, Gradient Wipe, Title Warp, Odometer Roll, Spill Suppressor, Deflicker

*feature*, 14 commit(s). Request: #966 idle backlog B27-B32, B37-B41, B53, B54. Thirteen new compositor effects plus one Radio Waves follow-up fix (cropped preview anchoring).

- `d7dc22d3` Add Venetian Blinds matte effect
- `410a34d1` Add Radio Waves generative effect
- `1b80bf41` Keep Radio Waves anchored when preview is cropped
- `21dcd7ee` Add Lens Magnifier effect
- `84370498` Add Circle Array repeat effect
- `b15ff479` Add Cartoon stylization effect
- `3728d6f5` Add Oil Paint stylize effect
- `44b15c57` Add generative Laser Beam effect
- `fcda7fd2` Add animated Fractal Noise effect
- `3e591a41` Add map-driven Gradient Wipe effect
- `01d2f034` Add ten visible-bounds Title Warp shapes
- `93dceac1` Add mechanical odometer text effect
- `36039096` Add standalone spill suppressor effect
- `0cdc6732` Add temporal exposure deflicker effect

### T04: New sound-effect packs: Drums, Explosion & Thunder, Ambience, Everyday Foley

*feature*, 4 commit(s). Request: #966 idle backlog B22, B23, B35, B36. Synthesised SFX categories in js/sfx.js; Explosion/Thunder adds per-sound variant controls (new .sfx-variant-* CSS with a 700px phone rule).

- `b72dfd54` Add synthesized Drums sounds
- `30a75961` Add configurable Explosion and Thunder sounds
- `05116900` Add synthesized ambience sound pack
- `ae637420` Add synthesized everyday Foley sounds

### T05: Audio clip tools: Reduce Noise and Auto-duck music under speech

*feature*, 2 commit(s). Request: #966 idle backlog B24, B25. Two new files (js/noise-reduction.js, js/auto-duck.js) wired through audio-tools/inspector.

- `d59b8cfd` Add on-device Reduce Noise audio tool
- `3b65fae1` Generate music ducking keyframes from speech

### T06: New audio effects: Graphic EQ, Hum Remover, De-esser, Channel Utility, Stereoizer, Auto-Wah, Noise Gate, Loudness Match

*feature*, 8 commit(s). Request: #966 idle backlog B34, B42-B48. Eight audio effects in js/audio-fx.js; Loudness Match also touches audio-fx-live.js and exporter.js.

- `eda6773b` Add ten-band Graphic EQ audio effect
- `2e1e8ed1` Add configurable mains hum remover
- `081ee145` Add sibilance band de-esser
- `e74415e2` Add stereo channel routing utility
- `01297a19` Add mono-safe stereoizer with Haas option
- `cf34fcb2` Add Auto-Wah audio effect with LFO and envelope modes
- `c63db8ef` Add native audio noise gate effect
- `288c20fc` Add bounded LUFS loudness match audio effect

### T07: Rendered-scene and reduced-preview correctness (Shake smear fps, Backdrop Clone timecode, Smooth Edges, Linear Streaks, Roughen Edges scale, RGB Split, Smooth Bevel)

*bug-fix*, 7 commit(s). Request: #690 clause 2 (bug hunting); follow-ups to #686 / #691 / #934. Preview-vs-export and nested-scene mismatches in existing effects. f3455117 is on the mainline; the rest on the v17.21 side branch.

- `5bb0638f` Use rendered scene frame rate for Shake smear
- `d4461144` Use rendered scene for Backdrop Clone timecode footprint
- `faa53a1c` Keep Smooth Edges visible at reduced preview scale
- `1e36d1d9` Keep short Linear Streaks trails in reduced preview
- `746d53a8` Scale Roughen Edges controls consistently on preview plates
- `0f8ec39b` Keep RGB Split green and small shifts visible
- `f3455117` Keep Smooth Bevel depth distinct on reduced previews

### T08: Glow family: bloom past transparent edges, threshold softness, smoothness passes, blend, source colour (C23/C49)

*feature*, 7 commit(s). Request: #482/#966 backlog C23, C49 (backlog.md:430 s6.2). DUPLICATES the builder's unshipped v17.23 polish batch 6 (Light/Soft/Dark Glow threshold softness, smoothness, past the edges, blend, colour from). Expect to drop, or reconcile per control.

- `8324f0c0` Let light and soft glow bloom past transparent edges
- `75b4f2fd` Add Light Glow threshold softness
- `57c45e04` Allow Dark Glow to extend past transparent edges
- `2cea7b62` Add threshold softness to Soft and Dark Glow
- `783dad9f` Add smoothness passes to three glow effects
- `8bf9ee64` Add Light and Soft Glow blend choices
- `ac6601ca` Carry source colours through Light and Soft Glow

### T09: Sharpening colour protection: Unsharp Mask control and Overdrive filter

*feature*, 2 commit(s). Request: #690 clause 3 (polish existing effects/filters). New colour-protection option on Unsharp Mask; Overdrive filter recipe (js/filters.js) uses it to avoid colour fringes.

- `ca35afb3` Add colour protection to Unsharp Mask
- `b5ed0efb` Protect Overdrive highlights from sharpening colour fringes

### T10: Effect frame-buffer reuse: Unsharp Mask, Light/Soft Glow, Dark Glow, idle release

*perf*, 4 commit(s). Request: unrequested (#690 standing brief). Scratch-buffer reuse plus idle release. Glow parts sit in the same kernels the builder rewrote for v17.23, so expect conflicts.

- `dd2220fe` Reduce Unsharp Mask frame memory
- `a5d76ea7` Reuse glow luminance buffers across frames
- `b1ddcfd9` Reuse Dark Glow luminance buffers across frames
- `5dcfed17` Release cached glow frames after idle rendering

### T11: Project import hardening: malformed dimensions/canvas/layers, deep nesting, failed media and font restore, warning survives import

*bug-fix*, 7 commit(s). Request: #673 / #888 follow-ups; overlaps open #1051 (plain-value project), partly #1040 and #1042 - verify. js/storage.js import gate. 9cd5923c fixes #1051's case; a4de4183 rejects non-object layers (not #1040's missing-transform case); f1ac5fa8 counts failed embedded fonts (not #1042's index write).

- `52843cc2` Recover malformed project dimensions on load
- `9cd5923c` Reject malformed canvas objects before project import
- `a4de4183` Reject malformed layers before project import
- `e808c3c2` Warn when embedded media fails to restore
- `b48cb48f` Reject deeply nested project imports before creation
- `f1ac5fa8` Keep project import usable with corrupt embedded fonts
- `1fdd128b` Keep missing-content warnings visible after project import

### T12: Shared-file omission warnings: media and custom fonts missing from template, project and backup files

*bug-fix*, 3 commit(s). Request: #888 / #343 follow-ups; related #1038 (test gap). Toasts name omitted media and custom fonts (home.js template save, settings.js backup, storage.js).

- `e987e4f3` Name omitted media in shared template files
- `2e5e0cf0` Warn when project files lack source media
- `70797f4c` Warn about custom fonts omitted from shared files

### T13: Replace media cancels when the project changes mid-pick

*bug-fix*, 1 commit(s). Request: unrequested (cites audits/937-hunt.json as distinct). js/app.js replace-media flow captures project/layer, releases the abandoned record, finishes save before the reverse-frame build.

- `5e8337da` Cancel stale media replacements on project switch

### T14: Home redesign, pre-v17.22 history (already live as v17.22)

*mixed*, 7 commit(s). Request: the v17.22 Home reference layout. Built on v17.21. Live v17.22 (f7716576) already contains this layout; the merge 7bc6c9ab kept v17.22 and removed five duplicate Home tests. Net effect after the merge is about zero. Do not land; verify nothing extra survives.

- `b38e3d8f` Match Home phone reference and move selection into card menus
- `49742a3f` Refine Home spacing to match phone reference
- `c7763bfd` Match phone Home reference and add local profile photo
- `6a6db2d5` Match light Home header to phone layout
- `07baced9` Polish Home layout for PC
- `374f744c` Keep removed Home portraits from reappearing
- `e7232077` Dismiss Home project menus on editor entry

### T15: Side-branch consolidation merge

*tooling*, 1 commit(s). Request: unrequested. Merge of the v17.21-based side branch (T01-T14) into the mainline. Its conflict resolution (remerge-diff: index.html ?v= tags, 6 lines of compositor.js for Fractal Noise vs the new Smooth Bevel kernel, styles.css, -269 lines of duplicate tests) must be reproduced by hand if the side-branch commits are cherry-picked.

- `7bc6c9ab` Consolidate local FreeMotion implementation branches

### T16: Keyframed Speed/Rate phase continuity across effects (accumulated phase instead of rate x time)

*bug-fix*, 28 commit(s). Request: #690 clause 2 (bug hunting); unrequested. 28 fixes: VHS, Glow Scan, Breathe, Chunk Noise, Electric Edges, Orbit (2), Fractal Ridges, Spin, Noise, Glitch, Dissolve, Clouds, Iridescence, Lightning, Scramble, Pulse, Swing, Flicker, Wiggle, Shake, Frame Stutter, Laser Beam, Particles, Radio Waves, Voronoi, Flash Random, Scanlines. The Laser Beam and Radio Waves fixes need T03.

- `84799d50` Keep VHS tracking band phase through speed keyframes
- `304f6370` Keep Glow Scan phase through speed keyframes
- `53756221` Preserve Breathe phase through speed keyframes
- `90c78228` Keep keyframed Chunk Noise speed continuous
- `c5849478` Fix Electric Edges keyframed speed phase
- `91f77658` Fix Orbit keyframed speed phase
- `28c79891` Keep Orbit facing when reverse speed stops
- `96750bfb` Keep Fractal Ridges motion continuous across rate keyframes
- `1a780ccb` Keep Spin rotation continuous across speed keyframes
- `e9887e83` Keep keyframed Noise speed from rewinding grain
- `a8003f1d` Fix keyframed Glitch Re-roll stopping
- `10040332` Keep Dissolve boil in place when keyframed speed stops
- `c4f51b7f` Keep keyframed Clouds drift phase continuous
- `e0ff704d` Keep animated Iridescence drift phase continuous
- `dafb7efa` Keep Lightning bolt phase when keyframed Flicker stops
- `d0aa007a` Hold Scramble Text pattern when animated Speed stops
- `d0f948f9` Keep Pulse beat continuous through animated Speed
- `eec3a0d6` Fix Swing keyframed Speed phase continuity
- `5673c230` Keep Flicker phase continuous through keyed Speed
- `2529c1d7` Preserve Wiggle path through keyed Speed changes
- `ceb86cd6` Keep Shake phase and smear continuous through keyed Speed
- `fea15508` Keep Frame Stutter hold phase through keyed Rate
- `8efc6234` Keep Laser Beam pulse phase through keyed rate
- `488ef6db` Preserve particle birth times across keyed rate changes
- `8516f675` Preserve Radio Waves births across keyed Rate changes
- `329c5401` Preserve Voronoi motion through keyed Speed changes
- `702a8952` Preserve Flash Random phase through keyed Speed changes
- `0a1fa664` Preserve Scanlines Roll position through keyframes

### T17: Remove Vocals twin follows the source clip's speed changes

*bug-fix*, 1 commit(s). Request: #690 clause 2. js/audio-tools.js reconciles the instrumental twin's timing before the history snapshot (js/history.js).

- `b69c5795` Keep vocal-removed audio in sync with source timing

### T18: Bundled font catalogue: 11 open (OFL) families plus FM Aster Round and FM Circuit Sans

*fonts*, 3 commit(s). Request: unrequested. fonts/open/* and fonts/original/* binaries + source, js/studio-fonts.js, text picker, exporter, settings. f8c2f757 is the merge bringing this branch into the mainline.

- `87979bea` Add original and open font catalogue
- `d7274642` Fix Fraunces regular face and original font rebuild output
- `f8c2f757` Integrate bundled original and open font catalogue

### T19: Original FM display font families: Meridian Serif, Lilt Marker, Vector Mono, Foundry Slab, Cloud Pop, Signal Pixel, Aperture Stencil, Ribbon Script, Palais Deco, Blackthorn, Reed, Stormbrush, plus middle dots

*fonts*, 14 commit(s). Request: unrequested. Twelve new drawn families, each a fonts/original/* binary + source + a studio-fonts.js entry, and two middle-dot follow-ups. Visual work Ezra has not seen (#545 rule: show options first).

- `582be7d7` Add original Meridian Serif display font family
- `c356e30c` Add original Lilt Marker handwritten font family
- `4be234f3` Add original Vector Mono display font family
- `ffb3742e` Add original Foundry Slab display font family
- `c8474826` Add original Cloud Pop display font family
- `7c62fb20` Add original FM Signal Pixel font family
- `f55629ba` Add original FM Aperture Stencil font family
- `21e7a068` Add original FM Ribbon Script font family
- `63b21924` Add original FM Palais Deco font family
- `a4f830c0` Add original FM Blackthorn display font
- `cbd3fd4d` Add native middle dots to original display fonts
- `cb07f39d` Add native Palais Deco middle dot
- `605cc5c9` Add distinctive FM Reed original font family
- `ed9aa288` Add FM Stormbrush original title family

### T20: Shape silhouette redraws (pass, revert, independently reviewed subset)

*mixed*, 9 commit(s). Request: #929 (shapes still bad) / #690; Ezra's shape-quality feedback quoted in shapes-quality-hold.md. d6ca358a was reverted by 58ef9d18; the subset was re-added in later commits (Flame, Bomb, Thumbs-up, the nine-shape collection, Speech bubble tail, Droplet). Visual work he has not picked; #929 is parked waiting on his pick.

- `d6ca358a` Polish shape silhouettes and picker previews
- `58ef9d18` Revert "Polish shape silhouettes and picker previews"
- `4051188e` Restore only independently approved shapes
- `d50c7abe` Refine reviewed Flame silhouette for picker and canvas
- `604cd216` Use independently reviewed Bomb silhouette
- `0c61554e` Use independently reviewed Thumbs-up silhouette
- `a1ba9441` Port independently reviewed shape collection
- `cdf694b3` fix: refine speech bubble tail contour
- `7baf7646` Refine Droplet contour for picker and canvas

### T21: Caption editor stops leaking document listeners on redraw

*bug-fix*, 1 commit(s). Request: #690 clause 2. js/captions.js: one capturing document listener instead of one per cue row.

- `5cf39d11` Avoid retaining caption cue listeners after redraw

### T22: Worker-backed MP4 export (forward port of the #47 milestone)

*feature*, 1 commit(s). Request: #47 (export must not lose the render; off the main thread). One large commit: new js/render-canvas.js, js/export-worker.js changes, export-resume, scene/eases/storage/studio-fonts, 13 tests/worker-*.html pages, three .cjs unit tests and a Liberation Sans fixture font.

- `f2702ab6` Forward-port guarded worker-backed MP4 rendering for #47

### T23: Wipe effects: hard-wipe zero-progress fix, layer fit and radial directions (C36)

*mixed*, 3 commit(s). Request: #904 / #690; backlog C36 (s12.3). ce7768ac is a bug fix; e15da085 adds controls; 1ac40d1f is the compositor cache tag.

- `ce7768ac` Fix hard wipe zero-progress visibility
- `e15da085` Extend Wipes with layer fit and radial directions
- `1ac40d1f` Record integrated C36 check and refresh compositor tag

### T24: Service worker keeps offline cache writes alive

*bug-fix*, 1 commit(s). Request: #112 / #306 / #430 follow-up. sw.js: waitUntil around cache writes after the response is returned.

- `d662aa35` Keep service worker alive for offline cache writes

### T25: Halftone smooth/averaged dots, Poster Print keeps colour, smooth Checker/Grid/Stripes (C32/C33)

*feature*, 3 commit(s). Request: #482/#966 backlog C32, C33 (s13.1, s12.5); audits/912-audit.json. Anti-aliasing and cell averaging; Poster Print filter recipe in js/filters.js.

- `901ee496` Add optional smooth and averaged halftone dots
- `1ca7ffe5` Smooth turned pattern edges in Checker Grid and Stripes
- `16c061a6` Keep colour in Poster Print halftone screen

### T26: Border Frame: smooth rounded corners, styles and draw-on (C33, s12.5)

*feature*, 2 commit(s). Request: #482/#966 backlog C33, s12.5. Rounded-corner anti-aliasing then broken-outline styles and a Draw on progress control.

- `cee51dcb` Smooth rounded Border Frame edges
- `0f98b861` Add Border Frame styles and draw-on progress

### T27: Glow Scan follows its layer and varies sweep timing (C35)

*feature*, 1 commit(s). Request: #482/#966 backlog C35 (s6.7). DUPLICATES the builder's unshipped v17.23 Glow Scan controls (Angle, Sweeps across the layer, Wait, Once). Expect to drop.

- `d951169c` Let Glow Scan follow layer and vary sweep timing

### T28: Lightning path and draw controls (C34)

*feature*, 2 commit(s). Request: #482/#966 backlog C34 (s11.6); #320, #403, #904. Endpoints/direction and draw-on controls; b8ee3bf6 is the cache tag.

- `545389fa` Add C34 Lightning path and draw controls
- `b8ee3bf6` Record integrated C34 check and refresh compositor tag

### T29: Roughen Edges seed, evolve, detail and erosion; Voronoi Cells seed (C37)

*feature*, 5 commit(s). Request: #482/#966 backlog C37 (s11.7, s11.5). 62c98f5e bounds the detail work to visible alpha (perf follow-up, no test). e69dae17 is a cache tag.

- `427d5af4` Add seeded evolving Roughen Edges field
- `e81e0c0e` Add deterministic Seed to Voronoi Cells
- `e69dae17` Record integrated Voronoi Seed check and cache tag
- `dd5d4729` Add Roughen Edges detail and border erosion
- `62c98f5e` Bound Roughen Edges detail to variable alpha

### T30: Lens Flare optics controls and percent position (C38)

*feature*, 1 commit(s). Request: #482/#966 backlog C38 (s6.5). DUPLICATES the builder's unshipped v17.23 Lens Flare controls (Core size, Rays, Rotation, Ghosts, Ring, Anamorphic streak). Expect to drop.

- `0cae1018` Add opt-in Lens Flare optics controls

### T31: Radial Shadow quality/opacity and Long Shadow reach/angled edges (C42/C43)

*feature*, 2 commit(s). Request: #482/#966 backlog C42, C43. Shadow kernels the builder's v17.23 Drop Shadow work sits beside; check for overlap.

- `0876018f` Expose Radial Shadow quality and opacity
- `7a2ef677` Polish long shadow reach and angled edges

### T32: Tilt Shift sharp band and smoother blur (C45)

*feature*, 1 commit(s). Request: #482/#966 backlog C45 (s14.1). New sharp-band and blur-quality controls.

- `1c84e763` Add Tilt Shift sharp band and smoother blur option

### T33: Vignette frame-fitted roundness (C50)

*feature*, 1 commit(s). Request: #482/#966 backlog C50 (s6.1). DUPLICATES the builder's unshipped v17.23 Vignette Roundness. Expect to drop.

- `76e23b54` Add frame fitted Vignette roundness

### T34: Directional and Gaussian Blur edge repeat, one-sided smear, one-axis, mix and blend (C25)

*feature*, 4 commit(s). Request: #482/#966 backlog C25 (s14.3, s15.7). 061581f0 also touches js/gl-color.js (GPU fallback path).

- `1db725a6` Add Directional Blur edge repeat and one-sided smear controls
- `0df427eb` Add Gaussian Blur repeat-edge plate pass
- `061581f0` Add one-axis Gaussian Blur options
- `a0732c3d` Add Gaussian Blur mix and blend controls

### T35: Warp edge/smooth sampling, Card Flip rotation and back, Ripple/Curl falloff (C26/C29/C30)

*feature*, 3 commit(s). Request: #482/#966 backlog C26, C29, C30 (s10.1, s10.2, s14.7). b2ce43ae also touches js/gl-warp.js.

- `b2ce43ae` Add edge and smooth sampling controls to geometric warps
- `b986fcc4` Add Card Flip rotation and back options
- `cfa3859e` Add Ripple and Curl falloff controls

### T36: C31 core: Frame Stutter holds and Time Warp Scan cold seeks rebuilt from history (shapes, stills, video, speed, parents, crop)

*bug-fix*, 21 commit(s). Request: #482/#966 backlog C31. The stateless drawLayerAt-style history path. Touches app.js, frames.js, export-worker.js, exporter.js (resume identity) as well as compositor.js.

- `097aa3ac` fix: sample simple Frame Stutter shapes at hold boundaries
- `b050da19` Fix Frame Stutter video cold-seek holds with decoded boundary frames
- `0ea4db6b` Retry transient Frame Stutter preview decoding
- `7f1e3a5a` Fix Frame Stutter cold seeks for graded shapes
- `b28993ca` Version shape Frame Stutter MP4 resume identity
- `69234c60` Fix Time Warp Scan cold seeks for simple shapes
- `d4ef276e` Detect same-phase Time Warp Scan jumps
- `4fa16b3a` Sample translating null parents at temporal hold times
- `51a2043a` Reconstruct moving still images in Time Warp Scan seeks
- `93b499ce` Rebuild straight video Time Warp Scan on cold seek
- `f19e9e90` Support constant forward video speed in historical scan
- `ffcf1a6b` Cold-seek reversed video in Time Warp Scan
- `38954ff2` Cold-seek video linear speed ramps in Time Warp Scan
- `66e23a4d` Reconstruct cropped still-image scans on cold seek
- `df1572b5` Sample still-image stutters at exact hold boundaries
- `df62ae95` Fix Frame Stutter holds under rotating null parents
- `8080c211` Fix Time Warp Scan cold seeks under rotating shape parents
- `44abd233` Rebuild video Time Warp Scan under simple null parents
- `7e956a1b` Reconstruct parented still Time Warp Scan strips
- `90df58bf` Reconstruct cropped decoded-video scan strips
- `35ff442e` fix: cold-seek parented video frame stutter

### T37: C31 masks: Frame Stutter and Time Warp Scan through hard/feathered vector masks and pen masks

*bug-fix*, 16 commit(s). Request: #482/#966 backlog C31. Mask permutations of T36's history path, interleaved with T36/T38 on the branch.

- `382a4577` Hold hard-masked shapes at Frame Stutter boundaries
- `65b06b35` Hold feathered shapes at Frame Stutter boundaries
- `81d68d6b` Hold upstream keyed pen masks at Frame Stutter boundaries
- `85aef144` Cold-seek Time Warp through hard vector masks
- `f30a19cd` Cold-seek Time Warp Scan through feathered shape masks
- `0fbd6cd2` Fix Time Warp Scan cold seeks through upstream pen mask
- `49714393` Fix Time Warp Scan cold seeks on hard-masked stills
- `d1ce0da9` Fix Time Warp Scan cold seeks on feather-masked stills
- `a5ed2656` Reconstruct masked video Time Warp scans
- `b700726b` Reconstruct keyed pen-masked video scans
- `c5eb2137` Fix Time Warp Scan video with combined vector and pen masks
- `79c3a7f6` Fix Frame Stutter video holds through vector masks
- `cbacbcb8` Fix Frame Stutter historical video pen masks
- `dc77b4fd` Reconstruct combined video masks for Frame Stutter
- `955841a5` Preserve outer pen mask timing on held video
- `10152253` Reconstruct video stutter with outer pen and vector masks

### T38: C31 keyed colour effects upstream of Frame Stutter / Time Warp Scan (Brightness, Contrast, Levels, Gamma, Vibrance, Saturation, Colour Balance, Exposure, Hue Shift)

*bug-fix*, 29 commit(s). Request: #482/#966 backlog C31. One commit per (effect x shape/still/video) permutation. The PM redirected ChatGPT away from more of these on 5 Oct (#1067).

- `0ee40ea0` Reconstruct keyed Brightness in Time Warp Scan seeks
- `d004f528` Hold upstream video brightness in Time Warp Scan
- `37aea798` Rebuild video scan with historical point-local contrast
- `c71d0c8b` Reconstruct graded still scans at crossing times
- `904a8aa5` Fix Frame Stutter holds with upstream Levels
- `5b659a3e` Hold keyed Levels in shape Time Warp scans
- `f9e80133` Fix keyed Levels before Time Warp Scan on decoded video
- `c0df65e1` Fix keyed Levels before Time Warp Scan on still images
- `f2143d2a` fix: sample keyed Gamma at Time Warp shape crossings
- `7e54fddf` fix: sample keyed Gamma at still-image scan crossings
- `7cddd012` fix: sample keyed Gamma in video Time Warp Scan
- `d3be408e` fix: hold keyed Gamma before Frame Stutter
- `913fd481` fix: hold keyed Vibrance before Frame Stutter
- `29babcd9` Hold keyed Colour Balance with Frame Stutter
- `18a1f4ee` fix: hold keyed saturation in shape time-warp scans
- `30412697` fix: hold keyed saturation in still time-warp scans
- `21e587b7` Fix keyed saturation in video time warp scan
- `ebb4019f` Fix keyed Vibrance before Time Warp Scan on shapes
- `bc31aee7` Fix keyed Vibrance before Time Warp Scan on stills
- `77ee2aa3` Fix keyed Vibrance before Time Warp Scan on video
- `8e4780a3` fix: hold keyed Colour Balance in shape Time Warp Scan
- `ab907edc` fix: hold keyed Colour Balance in still Time Warp Scan
- `6d0f235f` fix: hold keyed Colour Balance in video Time Warp Scan
- `54c023ef` Apply keyed Exposure in moving-shape Time Warp Scan history
- `e7fceb82` Apply keyed Exposure in moving-still Time Warp Scan history
- `09d451ae` Apply keyed Exposure in decoded-video Time Warp Scan history
- `e8e0f807` Preserve keyed Hue Shift in shape scan history
- `a53aa716` Preserve keyed Hue Shift in still scan history
- `6ed01d4d` Fix keyed Hue Shift before decoded-video Time Warp Scan

### T39: Reports-only commits (verification records and font-study proofs)

*reports-only*, 31 commit(s). Request: unrequested. Only outside/chatgpt/* changes: browser-check records for T16/T19/T20/T25-T30/T36 and the FM Reed / FM Stormbrush glyph studies behind T19. No app code.

- `f10256af` Record Orbit browser regression result
- `0650b810` Record Orbit stopped-facing browser check
- `b2bd8b3d` Record Fractal Ridges browser check
- `517bfa1a` Document integrated effect fixes
- `a3f899b5` Record integrated checks and independent shape review
- `eb0e4841` Record independent Ribbon Script review and integration
- `ecba735d` Record integrated Voronoi phase check
- `802b8417` Record integrated Flash Random phase check
- `be1388ec` Record integrated Scanlines Roll check
- `4aa5726c` Record integrated Palais Deco font check
- `af0afe4a` Record focused integrated checks and shape holds
- `12c480e6` Record integrated C33 pattern check
- `e16d6959` Record local Border Frame integration
- `d8f4998b` Record integrated C33 and C35 browser checks
- `97327daa` Record integrated Frame Stutter checks and remaining scope
- `a0876429` Record reviewed Border and Roughen integration checks
- `a14b00b2` Record integrated C31 graded-shape verification
- `b79b6451` Record integrated C37 Roughen detail check
- `ad9bf79d` Record integrated Lens Flare checks
- `e9bf3c90` Record reviewed Radial Shadow integration
- `8bc9d047` Record focused Chromium glow checks
- `6e55f6c4` Study original FM Reed title lettering
- `de86e4dc` Draw complete FM Reed uppercase alphabet
- `3991897b` Complete FM Reed ASCII proof for visual review
- `48128b3d` Draw FM Reed Latin characters and symbols
- `31138900` Study FM Stormbrush original capitals
- `1cf9a966` Draw FM Stormbrush lowercase alphabet
- `f5a383ca` Draw FM Stormbrush figures
- `854191bf` Complete FM Stormbrush printable ASCII proof
- `e6baec37` Add FM Stormbrush Latin and symbol proof
- `452f9a1b` Review FM Stormbrush over moving footage

