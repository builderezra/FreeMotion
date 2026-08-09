# ⚠️ BEFORE PUBLISHING — make it look like OURS, not Alight Motion

**Status: NOT DONE.** This is a blocker for any public release (app stores, a public URL you
promote, a demo video, a tutorial series). Delete this file only when the work below is actually
finished — not when it's planned.

## Why this exists

FreeMotion's UI was deliberately built by copying Alight Motion, screenshot by screenshot, because
that was the fastest way to get a good interface and to learn what "good" looks like in a motion
editor. That was the right call for building. It is the wrong thing to ship.

Copying **what an app does** is normal — features, capabilities and workflows are how every editor
in the category resembles every other one. Copying **how an app looks** is the part that gets you
in trouble and, just as importantly, leaves you with no identity of your own. A user should be able
to see one screenshot of FreeMotion and know it isn't Alight Motion.

(If any of this ends up mattering commercially, get a real opinion from someone qualified — this
file is a build note, not legal advice.)

## What is currently modelled on Alight Motion

Each of these was built from an AM screenshot and needs an original treatment:

- **Home screen** — the list-row cards (86px thumb left, name + meta chips, ⋯ on the right), the
  pill tab row, the centred green + FAB, the duration badge on the thumbnail. This is AM's layout.
- **Settings panel** — the slide-in drawer, its grouped rounded cards, and the row set itself
  (Project sorting / Demo mode / Show touches / Show system fonts / Default layer duration) came
  straight from AM's settings screenshot.
- **Add menu** — the tab row across the top opening a sub-grid, plus the vertical quick-add rail on
  the right (Text / Freehand / Vector). That interaction model and its arrangement are AM's.
- **Editor chrome** — the top bar composition (back ‹, project name, ⚙, green export button), the
  transport row, and the timeline clip look.
- **Terminology** — "Elements", "Object / Element", "Templates" as tab names follow AM's wording.
- **Camera Options** (v4.25) — the three-screen structure (Camera View / Focus Blur / Fog), the icon
  rail that switches between them, and the control names all come from AM screenshots. The optics
  underneath are our own (a real pinhole lens driving the existing Z model); the screen layout is not.
- **Clip-action row, playhead-outside state** (v4.17) — built from AM screenshots: the middle buttons
  swapping from trim/split to move-to-playhead / extend-to-playhead when the playhead leaves the clip,
  the two icon glyphs (box → bar, open box → bar), and the multi-select bar carrying the same pair
  alongside the align set. The behaviour is worth keeping; the icon language is AM's and needs redrawing.

- **Top-bar parenting button** (v4.44) — the button beside the bin. It came from an AM screenshot and
  had been mis-read as "duplicate"; v4.44 corrected it to set parenting, which is what the screenshot
  was actually showing. The glyph and its placement are AM's.

Our own already: the logo and splash animation (Ezra's), the effect set and its internals, the
slip ghost, the Apple-squircle corner rounding, the media library, and everything under the hood.

_**Swept v4.26 → v4.70 on 2026-08-08** against POLISH-LOG. Only v4.44 above records an AM origin;
everything else in that range was effects, render fixes or Ezra's own direction. Caveat: this sweep
can only find what was written down at the time, so if a panel was built from a screenshot without
saying so it is still missing here. The two worth Ezra's own eye are the **effect-browser hold sheet**
(v4.50, the press-and-hold description/tag card) and the **preset sheet** (v4.59) — neither log entry
claims an AM origin, and I can't tell from the code whether one was used._

## Progress

- **v4.71 — the desktop Studio layout is ours.** Settings → Layout → Studio moves the editing panel down
  beside the timeline and stands the top bar up as a rail on the far left. That is a genuinely different
  composition from AM's top-bar + right-column + full-width-timeline arrangement, and it was Ezra's own
  design, not a screenshot. It goes a long way on item 2 below and starts item 6. **It does not close
  them:** Studio is opt-in and desktop-only, so the default look on first run — and the entire phone
  layout, which is the primary target — is still the AM arrangement. The list below stands.

## What "done" looks like

Not a re-skin — a different composition. Concretely:

1. **Re-lay-out the home screen.** Different card shape and information hierarchy — not thumb-left
   rows with a chip line. (A grid of large posters, a column of wide preview strips, something
   with our own idea in it.)
2. **Re-lay-out the Add menu.** Keep one-tap access to everything; change the arrangement so it
   isn't tabs-across-the-top plus a right-hand rail.
3. **Own icon set.** Ours are generic strokes now; give them a consistent, deliberate style.
4. **Own colour + type.** The teal accent on near-black is close to AM's. Pick a palette and a type
   treatment on purpose, and apply them everywhere.
5. **Own words.** Rename the borrowed labels to what WE call them.
6. **Own motion.** Panel transitions, the FAB, sheet behaviour — small signature moments.
7. **Sweep for their marks.** No AM icons or sample assets in anything we publish, and nothing in a
   screenshot or tutorial that shows their app. On strings: as of v3.73 there are **24 mentions of
   "Alight Motion" in the source, all of them code comments** citing it as the design reference —
   nothing user-visible, so nothing leaks to a user today. But they're visible to anyone reading a
   public repo, so if this goes open-source, reword them to describe the behaviour instead of
   naming the app. Check with:

   ```bash
   grep -rin "alight" js/ index.html styles.css manifest.json
   ```

## 8. Six shapes are traced from stock images — REDRAW BEFORE PUBLISHING

In v3.96 the `check`, `thumbsup`, `pointhand`, `envelope`, `key` and `car` shapes were produced by
**boundary-tracing Ezra's reference images**, which came from stock sites (two of the six still had
Dreamstime / Shutterstock watermarks in them). The traced geometry is a derivative of those specific
drawings, not an independent design.

The *ideas* — a tick, a key, a thumbs-up — are not protectable, and the shapes are simple and
generic. The risk is narrow but real: a trace reproduces one artist's particular version of the
form, and these ship inside the product.

**What "done" looks like:** redraw those six from scratch (or from a licence we hold), keeping the
proportions that read well but not the exact contour. Everything else in the shape library is
original geometry and is fine. The tracing pipeline itself is in the v3.96 commit message if it's
useful again on assets we own.

## Do this before

- Any public link Ezra promotes, any store listing, any tutorial or demo video.
- Not before then — it costs real time and the app should be worth publishing first.
