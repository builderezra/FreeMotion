# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **v4.81, everything below is unbuilt.**

Standing: Ezra is working on the **PC Studio layout** now — *"from now on going to be talking mainly
about pcs studio layout, so just dont change the other versions layout."* Classic desktop and the
phone layout are off-limits unless he asks. (Bug FIXES on phone are of course still wanted — the
audio import fix below was one.)

---

## Done this session (for context, not to redo)

- **v4.71 / v4.72 — desktop Studio layout.** Settings → Layout → Classic / Studio. Left rail (stops at
  the canvas, not the full height), editing panel docked beside the timeline, band runs edge to edge.
  Pure grid re-placement of four regions that are all direct children of `#app`; ONE `#inspector-panel`
  node, never duplicated. Regression test `studio-layout`.
- **v4.73 — audio import on phone.** Was silently dropping the file: `handleFiles` classified by
  `file.type` only, and phones hand back an EMPTY type for .m4a/.flac/.opus. Now falls back to the
  extension (`FM.mediaKind`). Also narrowed the picker's `accept` for the audio entry, because iOS
  greys audio out in Files when the accept list also carries `image/*`/`video/*`.
- **v4.74 — car shape tyres.**
- **v4.75 — Edit Points no longer closes on a missed tap** (miss is swallowed; touch target 14px -> 26px).
- **v4.76 — tick smoothed** (no point moved; only the end points marked smooth).
- **v4.77 — Motion Blur (Object) surfaced in the Effects list** (drives the existing layer.motionBlur).
- **v4.78 / v4.79 — per-slider keyframes DONE.** Every Move & Transform slider has its own ◆ keying only
  its own property; X and Y independent; Scale rows follow the link state (linked→scale, unlinked→scaleX/scaleY).
  Anchor deliberately excluded (a {kf} anchor NaNs the layer).
- **v4.79b — every diamond is now deletable.** animatedProps and deleteKeyframesAt cover the same
  containers; 12 of 28 keyframed props used to be undeletable. Test `delete-parity`.
- **v4.80 — object motion blur fully moved into Effects** (card with Shutter/Samples/×; M&T checkbox deleted).
- **v4.81 — Elements browser** with search (js/elements-browser.js); saved elements no longer loose in the tab.
- **BUG-HUNT.md** — 74 findings, 69 confirmed, from a 22-agent hunt. Nothing in it is fixed yet.

---

## The queue

### 1. Tiles — "Whole clip" is on by default and does NOT work  (REPRODUCED + DIAGNOSED 2026-08-10)
*"if I move the clip off screen the tiles only duplicate what's on the actual screen/canvas."*
Screenshot: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/3835f848-IMG_2372.PNG`

**Measured** (320x240 project, 70x70 shape, Tiles at its DEFAULT params — mode Extend, count 3,
mirror On, source "Whole clip"), % of frame lit:
  clip at x=160 (centred)      -> 100%   tiles fill the frame, correct
  clip at x=-10  (half off)    -> 100%   still correct
  clip at x=-60  (fully off)   ->   0%   NOTHING renders  <-- the bug

**Why the earlier fix didn't take.** The `source` param already exists and already defaults to
1 = "Whole clip" (js/compositor.js:430), described as "renders the layer past the frame first and
repeats all of it". It is ON and it still fails, because the bbox Tiles spaces its copies by is
computed from the CANVAS-SIZED plate and ignores `source` entirely:

    js/compositor.js:3193
    else if (fx.type === 'tiles') { bbox = alphaBBoxExact(actx.getImageData(0, 0, W, H).data, W, H); }

`actx` is W x H = the canvas. A layer drawn off-canvas is clipped away before Tiles ever sees it, so
alpha is empty, bbox is null, and there is nothing to repeat. That is why this has now been "fixed"
twice without working — both fixes were downstream of the clip.

**The fix** has to make the source plate bigger than the canvas when source = "Whole clip", so the
layer survives being off-frame. Note `tiles:` (js/compositor.js:4472) already takes an `expand`
argument — `function (A, B, W, H, bb, p, t, tl, layer, ps, expand)` — so the plumbing for an expanded
plate may already exist; find who passes it and what CFX_NO_BBOX (js/compositor.js:3127) does here,
since the comment there says tiles was deliberately REMOVED from that list to anchor on "the clip's
real alpha bounds" — which is the thing that is failing.

**Verify with the numbers above, not by reading**: the fully-off case must go from 0% to ~100%, and
the centred case must stay 100% (don't fix off-screen by breaking the normal case).

### 2. Freehand drawing is buggy and moves the canvas
*"still really buggy and puts the canvas in a weird spot."* `js/draw-tool.js` plus the
`body.drawing` CSS (which collapses `#app` to a single row). Needs reproducing and watching, not
reading — and now also needs checking against the Studio layout, where the stage geometry differs.

---

## How to work here

- **The projects on this machine are all throwaway tests** — Ezra, 2026-08-10: *"I honestly don't care
  if you wreck any of my projects at the moment, none of them are anything more than tests."* So tests
  and harnesses may add, mutate and delete layers freely; still restore state in a `finally` out of
  basic hygiene, but don't skip a worthwhile test to protect a project.
- Verify by RUNNING, not reading — the harness lesson has paid off repeatedly. Mutation-check every
  new test assertion: three in a row this session looked fine and could not actually fail.
- `index.html`'s version label is the source of truth. Bump it, bump the `?v=` on every file touched,
  add a POLISH-LOG line, commit locally. Ezra pushes via GitHub Desktop.
- Mobile check at ~380px on anything visual, unprompted.
