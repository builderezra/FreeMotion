# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **v4.85 — three new items, all unstarted.**

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

Everything from the 2026-08-09/10 run shipped (v4.73 → v4.85, including the re-cut heart). These three
came in on 2026-08-10 while the heart was being judged, and are UNSTARTED. In his order:

### 1. Top-row buttons aren't centred
Screenshot: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/76deff75-IMG_2378.PNG` — look at it
first. Which row he means needs confirming from the image (top bar vs the transport row); measure the
actual boxes rather than eyeballing the CSS. Check BOTH layouts — in Studio the top bar is a vertical
rail, so "the top row" may mean the transport.

### 2. Replace the "FreeMotion" wordmark in the menu with his image
Source: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/dfd50b9c-FullSizeRender.jpeg`.
He wants it to REPLACE the text "FreeMotion" in the menu. Two jobs before it goes in:
(a) get the quality as high as possible — it's a JPEG photo, so it will need upscaling/cleanup, and
(b) REMOVE THE BACKGROUND so it sits on top of the app's dark chrome instead of in a white box.
Note the brand text appears in `.brand` (index.html ~line 76) and the Studio rail already reduces it
to a ▶ glyph — so whatever replaces it has to work at rail size (~60px wide) as well as full width.
No npm/build step: it has to end up as an inlined asset (data URI or a committed PNG with alpha).

### 3. The main menu background is boring — stylise it
*"might be nice to stylise it abit with fitting colour gradients, try to make it not feel like stale
image as it will be very seeable on pc. Just get something that looks nice and if it's bad don't
stress coz I can give you something."* So: a tasteful gradient treatment on the home screen, sized for
a big PC display. He is relaxed about the outcome — offer it, don't gold-plate it. Keep it CSS
(no image asset) so it costs nothing to load and adapts to any window size.


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
