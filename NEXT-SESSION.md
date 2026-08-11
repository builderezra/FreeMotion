# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **He numbers his requests and expects them done in that
order; new asks go to the BOTTOM of the list.**

State at handoff: **v5.61**, **65/65 regression tests green**.

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
Present: `channelremap` (ONE; AM has HSV **and** RGB), `copybg`. **Absent: Fill Behind, Magnify
Background, Echo Keyframes, Time Quantization.**
- **Magnify Background** was built and **reverted** — stripe counts identical at zoom 1, 2 and 4. Two
  hypotheses ruled out: it *does* reach `drawCopyBg` (`_bgSnap` exists at 320×240), and `makeInstance`
  *does* get the default (`paramsOf()` normalises `def:`). **Next: instrument the actual `_z` and
  transform** — the plate carries `__fmRS/__fmOX/__fmOY`, so scaling about raw `M.e/M.f` may be the
  wrong origin.
- **Fill Behind** — deliberately not built: pixel-effect plates are **project-sized**, so a naive fill
  paints the whole frame. **Ask Ezra what it should do** rather than guessing from one thumbnail.

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
