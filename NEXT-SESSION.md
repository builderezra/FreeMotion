# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **He numbers his requests and expects them done in that
order; new asks go to the BOTTOM of the list.**

State at handoff: **v5.73**, **87/87 regression tests green**, tree clean, 0 unpushed.

---

## How to push (no dialogs needed)

`origin` is https and has no usable credential. An SSH key on this Mac is registered with Ezra's GitHub
and a second remote `ssh` points at the same repo:

```bash
git push ssh main
```

Push after every version bump — he asked for that explicitly. Leave `origin` alone so GitHub Desktop
keeps working exactly as before.

---

## House rules that keep being re-learned the hard way

- **Measure, then claim.** Every "looks broken" report has had a number behind it, and several confident
  diagnoses were wrong until pixels or rects were read.
- **Write the probe BEFORE the fix**, and confirm it FAILS against the unfixed code. Twice a fix was
  written first and its probe then passed against the original too, proving nothing.
- **Mutation-check every assertion.** Break the fix, watch it go red. Three times an assertion passed
  with the fix removed.
- **A test that passes by HIDING what it measures is a failed test.** v5.61 caught this: an agent
  asserted `scrollHeight <= clientHeight` and satisfied it by shrinking buttons to 24px and pushing
  controls into scrollers with hidden scrollbars. Layout fixes must also assert every control is fully
  inside its visible box.
- **Serve your own tree.** With parallel agents, ports get squatted. `curl` for a string only your tree
  contains before trusting any number.
- **`theme-glass.css` loads AFTER `styles.css`** and repaints things. It has silently overridden two fixes.
- **Cache-bust the DOCUMENT, not just the asset** (`index.html?cb=…`) or you verify a stale bundle.
- Bump `index.html`'s version label + the `?v=` cache-busters, and add a POLISH-LOG.md entry per release.
- **`git apply` is atomic** — one failing file rolls back the whole patch, even for files it just
  reported as applied cleanly.

---

## THREE DECISIONS WAITING ON EZRA — do not guess these

1. **Squish (#48).** Four build rounds, EIGHT independent rejections, every one legitimate. The EFFECT is
   good and has been for three rounds (bounce 162x162 -> 202x127 -> 261x85, continuity worst ratio 1.09,
   off-canvas byte-identical at 126 positions). What keeps failing is a PERFORMANCE GATE that predicts
   whether a layer is near a wall: every rejection since attempt 3 is the same shape — the gate's
   prediction disagrees with what the layer actually PAINTS (shadow, then repeater/group proxy), and
   where they disagree the effect switches on or off in one pixel of travel. A gate that must predict
   what a layer paints will keep being wrong for the next painter; enumerating them is not convergent.
   OPTIONS: (a) delete the gate, always compute the true alpha box — correct by construction, costs a
   plate render per Squish layer per frame; (b) **RECOMMENDED** — a gate that cannot be wrong, e.g. run
   whenever the transform box is within one frame-diagonal of a wall: cheap, needs no per-painter
   knowledge, over-runs harmlessly; (c) ship with the dead band documented.
   Diffs `squish-v3-full.diff` + `squish-v4-delta.diff` are round-trip verified — whichever he picks is
   apply-and-adjust, not a rebuild.

2. **Effect-browser reach (#46b).** The safe-area half shipped in v5.66. Where the close and search
   buttons actually GO on a tall phone is a taste call: swipe-down-to-close, search to a bottom bar, or
   both. Measure and present; do not choose.

3. **Captions word transcription (#43 layer 3).** Cues, editing and speech DETECTION all shipped in
   v5.65. Actual words need Whisper via transformers.js — fully offline, but a large one-time model
   download and slow on a phone. Present the size and the device tradeoff; never switch it on by default.

## ONE ITEM BUILT, NOT LANDED  (the Add-menu trio LANDED in v5.73)

- **Project-open slide (#55)** — rejected twice. First attempt re-laid-out the whole home screen at
  DOUBLE WIDTH for the entire 280ms push on every phone; the second was rejected too and its reason has
  not been read yet. Read the verifier's report before re-briefing.

## HOUSE RULES EARNED TODAY

- **A silent test runner is an ABORT, not slowness.** Twice today: a stray merge-conflict marker, and an
  uncaught throw inside a test. Once it was 32 leftover headless Chrome processes starving the machine —
  which survived a `git reset --hard` and looked exactly like a code regression. Check the process count
  before blaming the diff.
- **Verify with an instrument that can SEE the change you made.** The export button was verified with a
  brightness number and still looked wrong; the add-menu "phone byte-identical" claim compared boxes
  only and could not detect that spans had become buttons.
- **A size assertion scoped to a selector list exempts everything not in it.** The easing editor shrank
  the one control its own >=36px assertion did not name.
- **When two modules each own part of a mode, the bug is in the state neither names** — that is how a
  delete button landed on the Export pixels mid-gesture.
- **Drive index.html TOP-LEVEL with device metrics, never in an iframe.** Two changes were rejected for
  defects their authors' iframe harnesses structurally could not see.
- There is a **live service worker on localhost:8777** that can serve stale JS. Unregister it before
  trusting a browser measurement.

---

## OPEN — in Ezra's order

Numbers are his. Items with a workflow attached are being built as of this handoff; check whether the
work landed before redoing it.

### 15. BUG-HUNT backlog — ~59 items left in BUG-HUNT.md

### 30. Effect thumbnails: one subject per SECTION + tiles that don't demo anything
Thumbnails are **live-rendered** (js/fx-thumbs.js), not assets — there is a `SUBJECT_OF` map and a
`SUBJECT_BY_CATEGORY` fallback, so "a different image per section" means repointing that fallback.
Registry has **two param shapes** (`params:[{key,…,def}]` and flat `param:'amount', def:`); a scan that
knows only the first sees 118 of 193. **Ruled out:** colour effects defaulting to neutral — none do.
**Three harness traps, each of which produced a confident wrong conclusion:** `mount()` is async
(~250ms); mounting then removing tiles breaks every later mount so only the first inks; clicking a
category card by class-substring silently doesn't navigate. **Better: skip the DOM** — build the sample
scene the way tests.js already does and apply effects synchronously.

### 31. Motion Blur (Object) bypasses the standard effect UI — half done
Sliders became `mtVBox` value boxes in v5.54. The rest is architectural: `layer.motionBlur` is **not**
in `layer.effects[]`, and `drawMotionBlur` (compositor.js:6317) **wraps the whole layer draw**. A stack
effect filters an already-rendered plate; this runs *around* the render. Needs a "wrapping effect" class
in the pipeline **plus a save migration** for projects carrying `layer.motionBlur`. Call sites:
compositor 1314, 1369, 1412, 6113, 6317; fx-browser.js 176-183; inspector `motionBlurBlock`. Also audit
for other hand-rendered pseudo-effects — fx-browser calls this "the same trick as **Mask**".

### 32. AM's "Other" effects
Present: `channelremap` (ONE; AM has HSV **and** RGB), `copybg`, `magnifybg`, `fillbehind`.
**Absent: Echo Keyframes, Time Quantization.**
- **Magnify Background — SHIPPED 2026-08-12.** The reverted first attempt was wired as a **post-effect**:
  a type in `POSTFX` routes `drawLayer` into `applyPostFx`, which had no kernel for it, so the layer drew
  **zero pixels** and the identical stripe counts at zoom 1/2/4 were the bare backdrop. (The old "next
  step" — suspecting the `__fmRS/__fmOX/__fmOY` origin — was a dead end: `M.e/M.f` is the right origin,
  because `getTransform()` has already folded both in.) It now ships as a **Copy Background sibling**:
  `FM.hasCopyBg` + `BG_SNAP_FX` accept it, `magnifyPlate`/`copyBgZoom` do the work in `drawCopyBg`, and
  it is **never** in POSTFX. `tests/tests.js` holds the tripwire. Two open questions are **Ezra's call**:
  - at zoom < 1 the source rect runs off the snapshot. It is currently **clamped** (the edge pixel is
    repeated), because the copy composites with `source-in` and a transparent margin is a hole punched
    through the layer. **Clamp, or allow minifying with transparent margins?**
  - AM's magnifier has an **offset / centre control**; this one magnifies about the layer's own anchor
    only. Worth adding, or is anchor-only enough?
- **Fill Behind — SHIPPED 2026-08-12.** Ezra specified it: *"it adds the blur and fills the space that
  the layer isn't filling on the canvas."* That dissolves the old objection (plates are project-sized so
  a naive fill paints the whole frame) — **painting the whole frame is the point**. Built as a third
  Copy-Background sibling: `FM.fillBehindFx` + `drawFillBehind`, dispatched from `drawLayer` **above**
  the `pp.length → applyPostFx; return` gate and never in POSTFX/WARP_FX. The fill is the layer's own
  alpha bounds scaled to COVER the canvas, blurred, drawn with `destination-over` so it can only appear
  where the layer is not. Params Blur / Zoom / Dim. Three things were found by measuring, not reading:
  the radius needs `× plateScale` (or the preview stops matching the export); the copy has to overshoot
  the frame by ~3× the radius **and** have `alphaBBoxFast`'s 4–8px of slack stripped off, or the comp
  edge fades (measured 137/255 and 231/255 alpha); and cover-scaling a bounding BOX does not cover the
  frame for a non-rectangle — a clip rotated 24° and a 6×6 layer both left bare corners, fixed with a
  mean-colour floor under the copy. Two things are **Ezra's call**:
  - **Ordering.** The fill is derived from the layer *after* its other effects, and is not re-processed
    by them. So a Vignette on the same layer darkens the clip, not the filled frame. Moving the dispatch
    below the post-effect gate would flip that; measured, the two positions differ by well under 1 unit
    of mean row detail, so no test holds it — only the comment at the dispatch site does.
  - **Cost.** ~10–14 ms/frame per layer at 1080×1920 (about Magnify Background, cheaper than a plain
    Blur), of which the blur itself is only ~0.5 ms — the rest is the full-resolution plate round trip.
    A gated fast path (opacity 1 + normal blend → composite the fill straight to the target and let the
    ordinary draw put the sharp layer on top, sourcing the fill from a 1/4-scale render) would take it
    to roughly a third. Not built: it is a second compositing path, and this one is provably correct.

### 33. Drag on the canvas to position a gradient / image fill — *workflow in flight*
Must **claim the canvas the way FM.cropTool / FM.pointEdit do**, not by special-casing canvas-edit, and
must not collide with the v5.40 `.sb-wrap` text handles or the corner scale handles.

### 34. Parameter-row selection ("a big ask") — *workflow in flight*
AM colours the selected parameter's **name** (dark pill, green text); tapping the name selects the row,
and that row's keyframes are the ones you're editing. Explicit counterpart to v5.42, where diamonds go
live only for the focused property — today focus is implied by which PANEL is open (`FM.kfFocusProps`).
Selection is finer than a row: Offset's X was green and its Y was not.

### 35. Remove the project ⋯ menu — **decision made, unblocked**
Relocate the survivors into the project **settings cog**, following the precedent already set on the
home screen. Sort them first: Loop playback / Onion skin / Snapping are true settings and move; Split
and Trim are actions that likely duplicate the transport-row controls added in v4.x, as do the export
marks — check each against what already exists and delete the duplicates rather than moving them.
Snapping's state must be read through `FM.timeline.isSnapping()`, not a second copy.

### 37. Presets rework — AM's "Preset preview" screen — *design workflow in flight*
**Supersedes the old thumbnail spec — do not build preset thumbnails.** A full-screen sheet: back /
"Preset preview" / Apply (greyed until a preset is selected); a large preview PLAYER of the user's own
layer with the preset applied; a scrub bar (time chip, 00:00:00 and end labels, orange track after the
handle); then a plain LIST of preset rows, each a pill with a name and a ⋯.
**The real job is that there are TWO preset systems.** `FM.EFFECT_PRESETS` (js/fx-presets.js) is one
effect with pre-authored, often keyframed params, with a shipped pool and a user pool in localStorage
`fm.fx.userpresets`. `FM.fxPresets` (js/inspector.js) is the older effect-STACK system and is what the
Presets card opens; fx-presets.js's own header says "this is a separate system". Ezra: "presets also are
just effects" — he's right, and unifying them is the work. The hard part is rendering the preview
without mutating the scene, and guaranteeing Cancel leaves the layer byte-identical.

### 39. Bezier easing editor fit — **first attempt REJECTED, rework in flight**
The overflow win was real and large (224px→0 phone, 278→0 Studio, and 8 other sizes) but it was bought
by shrinking preset buttons 36px→24px and hiding controls in scrollers with hidden scrollbars — at
Studio 1280×720 the **Steps** family button was 100% invisible, and that same diff had made the Steps
rail the only home for Hold. Fix: `flex: none` on `.es-preset`/`.es-fam` to hold 36/44px plus a scroll
affordance, or horizontal rails on short bands. **The test must assert visibility, not just no-scroll.**

### 41. Text editing glitched on a real device — **not reproduced yet**
IMG_2432: a huge black void between the toolbar and the canvas, canvas jammed at the bottom under the
keyboard, dock translucent and overlapping, iOS accessory bar overlapping.
**Ruled out:** the phone grid collapsing to one row — measured at 390×844, `#app` has two tracks
(52px + 792px) and the canvas gets 71.7% of the screen with no void. An earlier probe missed everything
because it ran at 1280px, where the `max-width:700px` block never applies.
**Untested combination, most likely candidate:** a non-zero safe-area inset together with a non-zero
`visualViewport.offsetTop`. `onViewport` computes `gap = innerHeight - vv.height - vv.offsetTop`, and
the lift *shrinks* as offsetTop grows (measured padB 435 → 315 → 175 for offsetTop 0/120/260). Being
investigated with item 46.

### 42. New original design for the Elements section
Must be **original** — a chance to move a screen OFF the BEFORE-PUBLISHING list, not onto it. Design
around the real content: read the home Elements tab, the Add menu's 'object' tab, and
js/elements-browser.js first. Saved elements can be transparent, so tiles need a checkerboard or they
read as nothing on a dark card. Ask which surface he means, or make both read as one place.

### 43. Captions is a fake feature — make it real
Confirm by RUNNING it first. Three layers, each shippable alone: (1) a real timed-cue data model
rendered through the compositor's text path so it burns into the export; (2) **speech detection** via
OfflineAudioContext + energy/ZCR voice-activity detection to lay down accurate cue TIMINGS — no network,
works everywhere, and the timing is the tedious part; (3) actual words via Whisper/transformers.js from
a CDN, opt-in only, with the download size stated — **present that tradeoff to Ezra, don't decide it.**
Web Speech API is NOT usable: it listens to a microphone, not a decoded buffer.

### 45. One layer-panel layout for every layer + Audio Effects into the effects browser
IMG_2434 is the target: Speed and Volume are numbered CARDS, and the top icon strip is only trim-in /
split / trim-out. IMG_2433 (video) wrongly puts Speed and Volume in the icon strip — make it match.
Then delete the "Audio Effects" card and put an audio/visual toggle at the TOP of the Add Effect browser
that switches everything below it, greyed and unselectable when the layer has no audio. "Has audio" must
mean a decodable audio track, not merely type video. Check whether audio effects are hand-rolled rather
than registry entries — if so that conversion is the real work, plus a save migration.

### 46. Effect browser's top buttons are out of reach — *workflow in flight*
The ✕ and search sit on the same row as the iOS status bar. Near-certainly a fixed header not consuming
`env(safe-area-inset-top)` after viewport-fit=cover shipped in v5.49 — the same miss `#topbar-m` had.
Being swept across every fixed header, not spot-fixed. Reach itself is a **taste call for Ezra**.

### 47. Export: don't lose the render on a crash
"Proxy/low-res editing with full-res render" is **already done** (js/app.js adaptive preview tier) —
audit, don't rebuild. The real gaps: the whole mp4 accumulates in `Mp4Muxer.ArrayBufferTarget()` before
delivery (same failure class as the v5.59 import bug — cost scales with output length), and there is no
checkpointing at all. **"Background rendering" is not buildable** in a no-backend browser app: a Worker
dies with its page and a Service Worker can't drive a canvas — say so rather than promise it. Order:
streaming muxer target → checkpoint/resume in IndexedDB at keyframe boundaries → Worker + OffscreenCanvas
if the compositor turns out not to touch the DOM.

### 48. New effect: Squish — *workflow in flight*
Automatic squash-and-stretch against the frame. Warp plates are **project-sized**, so the plate edges
already ARE the canvas edges. The design risk: uniform compression reads as *the layer shrank*, not
*squashed* — a real squish deforms locally near the contact and bulges perpendicular. Three models are
being prototyped and judged on rendered contact sheets.

### 49. DESTRUCTIVE: clicking a malformed preset wipes the layer's effect stack — *workflow in flight*
js/inspector.js ~2887 assigns `layer.effects = fx.map(...)`; a row whose `.effects` is missing or empty
still RENDERS (as "(0 effects)") and the click assigns an empty array. Live data loss. Two more silent
paths in js/fx-presets.js: a failed save returns `false` with no toast and no throw (:74, :141), and a
param over MAX_KF (240) makes the WHOLE preset get discarded without a word.

### 50. PC: the Add panel doesn't fill its space, and still scrolls
Dead band beneath the tiles AND clipped content at once — the tile container's height ignores the
panel's. Tiles should scale with the panel. Beware the circular-height trap (asking children to fill a
parent sized by its children collapses it) and the hiding trap.

### 51. The Add section should reopen whatever was last open
Remember the tab (and inner page). Recommend global + persisted, matching how the Studio toggle and
export settings already persist.

### 52. PC: the settings cog opens the wrong settings menu in a project — **blocks item 35**
Item 35 moves Loop / Onion / Snapping INTO that cog, so this must be fixed first or they land in the
wrong menu. Studio layout (v5.58) is the prime suspect.

### 53. PC is missing Group and Mask
Diff the FULL phone-vs-PC layer-action lists rather than patching the two he noticed. Mask is a
hand-rendered pseudo-effect ("the same trick as" Motion Blur (Object)), so a surface built from the
registry will not see it.

### 54. Still have to open something before you can drag it — *workflow in flight*
v5.52's rule is literally "an OPEN effect row can be dragged". Also covers the never-verified v5.56
guard (TAP_MS is **700**, js/fx-browser.js:91 — not 400 as older notes said).

### 55. Opening a project should slide: card exits left, editor enters from the right
260-320ms, ease-OUT, overlapping not sequential, outgoing travels ~a third as far and dims. Respect
prefers-reduced-motion. Transform/opacity only, and mind the v5.49 intro-animation collision.

### 56. Car shape is stretched — *workflow in flight*
Acceptance test is his: the wheels must be circles. Prime suspect is the DECLARED `aspect` in
js/addmenu.js, not the traced geometry. Do not hand-edit the points. It stays on the BEFORE-PUBLISHING
redraw list regardless.

### 57. Timeline: a group's bar bleeds across the track-head column — *workflow in flight*
IMG_2445. The head stacks correctly (sticky, z-index 6) so the row's own BACKGROUND is the likely
culprit, not an escaped clip. Second fault in the same shot: a long name runs under the ≡ with no
ellipsis. Third thing to check, not assume: a clip rendering in two shades either side of the playhead
may be intentional.

### Older, still open
- **Transform blur can't smear effect- or camera-driven motion.**
- **Continue the EFFECTS-PLAN build rounds.**

---

## One question genuinely waiting on Ezra

**Freehand under a real finger.** v5.53 fixed it and the fix was verified with **synthetic pointer events
only**; touch takes a different path through that gesture handler. Ask whether it feels right.

(The other long-standing question — whether dragging the top of two effects still closes the menu — was
converted into work rather than left as a question, since the v5.56 guard was never verified.)

---

## Shipped this session (context, not to redo) — v5.37 → v5.61

- **v5.37** OPEN badge letters inked (flood inward from the border, so the pill's soft outer edge survives).
- **v5.38** Wordmark: emitters cut to a third, sheen re-aimed as a rake, one tight glint on the F.
  Halo spill +0.0148 → +0.0003; gap-to-peak contrast 33:1 → 49:1.
- **v5.39** Copy/paste a single effect (localStorage, so it crosses projects).
- **v5.40** Text wrapping — there was **none** before. One `FM.textLines()`, two bar handles set the column.
- **v5.41** Mobile text editor: selection box detached from the text; keyboard lift could crush the
  preview to 0×0; the toolbar only guarded `mousedown` so iOS closed the keyboard on tap.
- **v5.42** Keyframes are inert outlines until their property's editor is open.
- **v5.43** Tap Z → the move pad becomes a depth slider.
- **v5.44** Shape points snap to other points. Also fixed a pre-existing bug: re-grabbing a point within
  350ms counted as a double-tap and **deleted** it.
- **v5.45** Wrap handles sit beside the text, not on it.
- **v5.46** Add sheet: tab row 358px in a 354px row → exactly full; sheet jumped 147px between tabs → 0.
- **v5.47** Easing: three graph families with their own presets and per-preset drag points; `js/eases.js`.
- **v5.48** Five sweep findings (home tab alignment 352px → 0; desktop Template tab entirely off-panel).
- **v5.49** `viewport-fit=cover` — the black band at the top. Both backdrop layers now drift.
- **v5.50** Tutorials tab (empty placeholder, as asked).
- **v5.51** ⋯ toggles say what they do; Snapping can finally show its ✓.
- **v5.52** An OPEN effect row can be dragged to reorder.
- **v5.53** Freehand: one stroke used to end the session. Now multi-stroke with Undo/Done/Cancel. RDP
  alone *preserves* tremor (it keeps the most-deviating points) — low-pass first, then simplify. Excess
  turning **65.19 rad → 0.41 rad**.
- **v5.54** Motion Blur (Object) uses the app's value boxes.
- **v5.56** Guard against a post-drop click toggling the effect editor (**was never verified** — now
  being reproduced properly).
- **v5.57** Export button is Ezra's glass artwork, keyed by flooding black **inward from the border**.
- **v5.58** Studio inspector band overflow 59px → 0.
- **v5.59** **Long videos on mobile.** Adding a clip called `FM.getWaveform`, which decoded the ENTIRE
  audio track at device rate and cached it for the session. PCM cost is set by DURATION: 10 min =
  219.7 MB, 20 min = 439.5 MB, 60 min = 1.3 GB, against a ~1-2 GB tab ceiling — plus the file held twice
  by a pointless `.slice()`. Now decodes at 8 kHz (**measured 6.0× smaller**), isn't cached, and files
  over 300 MB skip the waveform.
- **v5.60** A media write the browser REFUSED was reported as success — `idbPut` resolved identically on
  `oncomplete` and `onerror` (and ignored `onabort`), and `writeMedia` returned a hardcoded `true`. Now
  it reports the truth with real usage/quota numbers, and asks once for persistent storage.
- **v5.61** Export-button shine (brightest 2% 0.815 → 0.908 phone); rotate-dial readout centring (it was
  `position:absolute` inside a `position:static` parent, so it centred on the **panel** — and on the
  **viewport** in Studio, painting the degrees over the canvas); Speed disabled on layers with no source;
  and tapping the X/Y/Z **number** now selects that axis.
- **v5.62** The **Custom elements** button opened an invisible panel — #el-browser was missing from the
  `#fx-browser` selector list, so it opened at a measured 0x247 with position:static. The geometry comes
  from the ID; the `fxb-root` class it borrows has no rules anywhere.
- **v5.63** PC export button: it was rendering the original inline SVG arrow AND the crystal artwork on
  top of it, plus a mint ring — and theme-glass.css held its own copy of that ring, the **third** fix
  that file has silently eaten. Also PC home tabs now span the project width (they were capped at 736px
  against the list's 700px, and had no `flex` outside the phone media query).
- **v5.64** The finished MP4 no longer lives on the JS heap. 20s export 358.6 MB -> 30.4 MB; 40s
  717.0 MB -> 60.9 MB. At 1280x960/200s/70Mb/s the OLD code dies with `RangeError: Array buffer
  allocation failed` after 197.5s delivering nothing; the new one writes a working 1.655 GB file at
  +10.5 MB peak. **Cost: no fastStart, so the output is not progressive-play.**
- **v5.65** Captions is real. The data and render existed; the EDITOR and TIMELINE did not, so typing set
  a field nothing read (measured: canvas ink 10805 -> 10805 after typing). Now real cues, a Cue n/N
  navigator, chips on the clip, burned into the export (verified by MP4 round-trip), plus
  `FM.detectSpeech` — voice-activity detection laying cues where someone talks, decoded through the
  low-rate path v5.59 added. Word-level transcription deliberately NOT built: large model download,
  Ezra's call.
