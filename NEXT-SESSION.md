# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for.

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
- **v4.82 — Tiles repeats the whole clip off-canvas** (0% -> 100% lit; the call was gated on the canvas bbox).
- **v4.83 — drawing mode no longer wrecks the Studio layout** (stage was collapsing 1140px -> 233px).
- **v4.84 — undo/redo grey out** when there is nothing behind or ahead.
- **v4.85 — love heart re-cut** and judged by an outside agent (0.04% mirror mismatch, 0.944 IoU vs the emoji heart).
- **BUG-HUNT.md** — 74 findings, 69 confirmed, from a 22-agent hunt. Nothing in it is fixed yet.

---

## The queue

**v5.04.** Every live ask from 2026-08-10 is shipped, and Select mode now works on all three home
tabs. What is left is standing work only.

### 1. Standing: empty the ⋯ menu, one item at a time
"most of the options in the three dot menu are pointless. Don't remove the three dot menu yet, but
we're gonna slowly work through finding the actual home for all the things in that menu so we can
get rid of it eventually." Rehomed so far: **Save frame (PNG)** → Export ▸ Format ▸ "This frame (PNG)" (v4.99), and
**playback speed · loop · mark export start/end · clear marks · timeline zoom** → the view-options
popup (v5.03). All of those are still ALSO in the ⋯ menu — Ezra asked to empty it gradually, not to
cut it over, so nothing has been deleted from it yet. Deleting the migrated entries is the next step
whenever he says the new homes feel right.

### 2. Standing design constraints (do not guess at these)
- **Do NOT change the home background.** He said so explicitly. It already drifts on a 48s cycle.
- **The orbs are SMALL now and that is his call, not a bug.** v4.91 had gone 62→74px to keep the
  render's faceting legible; he came back with "make it smaller coz the design looks funny when it's
  so big", so v4.92 is 58px for both the home create button and the editor FAB. The faceting question
  is closed — the liquid-glass edge light carries the glass at that size instead. Don't quietly grow
  them back.
- **The + and the OPEN letters must stay SEE-THROUGH.** "make sure the plus in the middle is actually
  cropped out and you can see under." Two separate things have flooded that cut-out and both are easy
  to reintroduce: (a) a wide `drop-shadow` pass — the filter follows alpha and cannot tell an outer
  edge from a hole, so anything past ~2px of blur closes a 6px plus; the ambient glow is a
  `box-shadow` for exactly this reason. (b) the travelling sheen — it is a child painted OVER the
  background image, so without `mask: url(fab-plus.png)` it sweeps straight through the hole. Check
  both by parking the sheen mid-sweep (`background-position: 46% 0`) over a bright backdrop.

### 3. Standing: BUG-HUNT.md
69 confirmed findings, essentially untouched. That is the backlog when he has no specific ask.

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
