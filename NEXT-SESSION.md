# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **He numbers his requests and expects them done in that
order; new asks go to the BOTTOM of the list.**

State at handoff: **v5.57**, tree clean, 0 unpushed, **63/63 regression tests green**.

---

## How to push (set up this session — no dialogs needed)

`origin` is https and has no usable credential. An SSH key was generated on this Mac and its public
half added to Ezra's GitHub, and a second remote `ssh` points at the same repo:

```bash
git push ssh main && git fetch origin main
```

Push after every version bump — he asked for that explicitly. Leave `origin` alone so GitHub Desktop
keeps working exactly as before.

---

## House rules that keep being re-learned the hard way

- **Measure, then claim.** Every "looks broken" report in this session turned out to have a number
  behind it. Several of my confident diagnoses were wrong until pixels or rects were read.
- **A test that cannot fail is worse than no test.** Mutation-check every new assertion by breaking
  the fix and watching it go red. Three times this session an assertion passed with the fix removed.
- **Write the probe BEFORE the fix.** Twice I wrote a fix, then a probe, and the probe passed against
  the unfixed code too — meaning it never demonstrated the fault.
- **Cache-bust the DOCUMENT, not just the asset** (`index.html?cb=…`) or you verify a stale bundle.
- **`theme-glass.css` loads AFTER `styles.css`** and repaints things. It has silently overridden two
  fixes this session (the export button, the search focus ring). Always check it.
- Bump `index.html`'s version label + the `?v=` cache-busters, and add a POLISH-LOG.md entry per release.

---

## OPEN — in Ezra's order

### 14. Studio inspector band overflows by 59px — **CAUSE FOUND, fix sketched**
At 1440x900 in `layout-studio` with a layer selected: band `clientHeight` 269, `scrollHeight` 328.
The sweep guessed the category grid; that is **wrong** — 5 columns changed the number not at all.
Measuring the band's children directly:

```
295px  div (wrapper)  <- contains .addmenu.addmenu--panel at 277px
 33px  div.panel-title
```

So the **Add menu** overflows, not the grid. v5.46 gave the *sheet* variant a stated height and left
the *panel* variant uncapped — fine in a tall side column, wrong in Studio's short wide band.
Likely fix: cap `body.layout-studio .addmenu--panel .addmenu-body` and let it scroll.
**Verify by measuring** `scrollHeight <= clientHeight`, and confirm classic layout (221px spare)
gains no scrollbar.

### 15. BUG-HUNT backlog — ~59 items left in BUG-HUNT.md

### 30. Effect thumbnails: one example image per SECTION + tiles that don't demo anything
Ezra: the attached photo should be **Colour & Light only**; every other section gets its own. And
"the first 5 images in colour and light look identical".

- Thumbnails are **live-rendered** (js/fx-thumbs.js), NOT image assets. There is already a per-effect
  `SUBJECT_OF` map plus a `SUBJECT_BY_CATEGORY` fallback — so "a different image per section" means
  pointing that fallback at different subjects, not sourcing photos.
- Registry has **two param shapes**: `params: [{key,…,def}]` and a flat `param:'amount', def:`.
  A scan that only knows the first sees 118 of 193.
- **Ruled out:** "colour effects default to neutral so their tiles are no-ops" — none do.
- **THREE HARNESS TRAPS, do not repeat:** (1) `mount()` is async (~250ms) — reading immediately gave
  193 identical blank canvases and a confident "every effect looks the same". (2) Mounting tiles then
  REMOVING them from the DOM breaks every later mount — only the first ever inks, which looks exactly
  like a damning product bug and is not one (the real browser renders fine). (3) Clicking a category
  card by class-substring found a node, clicked it, and silently did not navigate.
- **Better approach:** skip the DOM. Build the sample scene directly in the suite (as tests.js already
  does for render checks), apply one effect at a time synchronously, diff.

### 31. Motion Blur (Object) — sliders DONE (v5.54), effect-row half BLOCKED
Shutter/Samples are now `mtVBox` value boxes. The remaining half is architectural:
`layer.motionBlur` is **not** in `layer.effects[]`, and `drawMotionBlur` (compositor.js:6317) **wraps
the whole layer draw** — re-rendering at sub-frame times and returning early. A stack effect filters
an already-rendered plate; this runs *around* the render. Making it a real fx-row needs a "wrapping
effect" class in the pipeline **plus a save migration** for every project carrying `layer.motionBlur`.
Call sites: compositor 1314, 1369, 1412, 6113, 6317; fx-browser.js 176-183; inspector `motionBlurBlock`.
Also audit for other hand-rendered pseudo-effects — fx-browser calls this "the same trick as **Mask**".

### 32. AM's "Other" effects
Verified against the registry: present = `channelremap` (ONE; AM has HSV **and** RGB), `copybg`.
**Absent = Fill Behind, Magnify Background, Echo Keyframes, Time Quantization.**

- **Magnify Background** was built and **reverted** — a striped-backdrop test showed identical stripe
  counts at zoom 1, 2 and 4. Two hypotheses **ruled out**: (a) it never reaches `drawCopyBg` — it does,
  `_bgSnap` exists at 320x240; (b) `makeInstance` misses the default — `paramsOf()` normalises `def:`
  to `default:` at registration. **Next: instrument the actual `_z` and transform.** The plate carries
  `__fmRS/__fmOX/__fmOY`, so scaling about the raw `M.e/M.f` may be the wrong origin.
- **Fill Behind** — deliberately not built: pixel-effect plates are **project-sized**, so a naive fill
  paints the whole frame, and AM's exact semantics are not known from one thumbnail. **Ask Ezra what
  it should do** rather than guessing.

### 33. Drag on the canvas to position a gradient / image fill
While the Gradient or Media tab of Colour & Fill is open, dragging the canvas should move that fill
(media: pan within the cover-fit clip; gradient: move its centre, ideally draggable stops).
Must **claim the canvas the way FM.cropTool / FM.pointEdit do** — not by special-casing canvas-edit —
and must not collide with the v5.40 `.sb-wrap` text handles or the corner scale handles.

### 34. Parameter-row selection (he called it "a big ask")
AM colours the **name** of the selected parameter (dark pill, green text) and you tap the name to
select the row; that row's keyframes are the ones you're editing. It is the explicit counterpart to
v5.42, where diamonds go live only for the focused property — today focus is implied by which PANEL
is open (`FM.kfFocusProps`). Selection can go finer than the row (Offset's x was green, not y).

### Older, still open
- **Transform blur can't smear effect- or camera-driven motion.**
- **Continue the EFFECTS-PLAN build rounds.**

---

## Two questions waiting on Ezra

1. **"Dragging the top of two effects down closes the menu"** — v5.56 ships a guard (a click within
   400ms of a drop is not a tap) but **it is unverified**: my probe passed against the unfixed code,
   so it never reproduced his fault. Ask whether it still happens.
2. **Freehand** was fixed and verified with **synthetic pointer events only**. Touch takes a different
   path through that gesture handler. Ask whether it feels right under a real finger.

---

## Shipped this session (context, not to redo) — v5.37 → v5.57

- **v5.37** OPEN badge letters inked (found by flooding inward from the border, so the pill's soft
  outer edge survives). Also de-flaked the splash guard, which had been quietly red in headless.
- **v5.38** Wordmark: emitters cut to a third, sheen re-aimed as a rake, one tight glint on the F.
  Halo spill +0.0148 → +0.0003; gap-to-peak contrast 33:1 → 49:1.
- **v5.39** Copy/paste a single effect (localStorage, so it crosses projects; names what it holds).
- **v5.40** Text wrapping — there was **none** before; four places split on `\n`. One `FM.textLines()`,
  two bar handles on the selection box set the column, double-click clears it.
- **v5.41** Mobile text editor: selection box detached from the text; keyboard lift was a guess that
  could crush the preview to 0x0; toolbar only guarded `mousedown` so iOS closed the keyboard on tap.
- **v5.42** Keyframes are inert outlines until their property's editor is open (null focus used to
  mean *everything* live). Live one under the playhead grows and takes a white ring.
- **v5.43** Tap Z → the move pad becomes a depth slider. Down pushes the layer away.
- **v5.44** Shape points snap to the other points (local units, survives rotation). Also fixed a
  pre-existing bug: re-grabbing a point within 350ms counted as a double-tap and **deleted** it.
- **v5.45** Wrap handles sit beside the text, not on it — "Edit text menu is broken" was the picture,
  not the mechanism.
- **v5.46** Add sheet: tab row 358px in a 354px row → exactly full; sheet jumped 147px between tabs → 0.
  (The three earlier attempts failed because they asked content to fill a parent sized by that content.)
- **v5.47** Easing: three graph families with their own presets and per-preset drag points; new
  `js/eases.js`; `kf.ez` resolved ahead of the old chain with full backwards compatibility.
- **v5.48** Five sweep findings (home tab alignment 352px → 0; desktop Template tab was entirely
  off-panel; badge debris; square focus ring inside the rounded pill; magnifier ink 25% small).
- **v5.49** `viewport-fit=cover` — the black band at the top. Plus both backdrop layers now drift
  (one had been frozen on its first keyframe because the intro rule replaced its animation).
- **v5.50** Tutorials tab (empty placeholder, as asked).
- **v5.51** ⋯ toggles say what they do; Snapping can finally show its ✓ (its state was module-private).
- **v5.52** An OPEN effect row can be dragged to reorder.
- **v5.53** Freehand: **one stroke used to end the session** and threw a full-screen inspector over the
  canvas; there was no Done button. Now multi-stroke with Undo/Done/Cancel. And the look: RDP alone
  *preserves* tremor (it keeps the most-deviating points) — low-pass first, then simplify. Excess
  turning **65.19 rad → 0.41 rad**.
- **v5.54** Motion Blur (Object) uses the app's value boxes.
- **v5.56** Guard against a post-drop click toggling the effect editor (**unverified** — see above).
- **v5.57** Export button is Ezra's glass artwork. Keyed by flooding black **inward from the border**,
  because the arrow is dark green inside pale crystal and a luminance key would have erased it.
