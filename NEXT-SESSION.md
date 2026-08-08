# Next session — the open queue

Rewritten 2026-08-07. **Everything above v4.09 is committed locally and NOT pushed** — Ezra pushes
via GitHub Desktop. Fifty-five releases are waiting (v4.10 → v4.64).

Work the list top-to-bottom; it is in the order Ezra asked for the items.

---

## ~~1. Effect thumbnails that actually show the effect~~ — SHIPPED v4.53

Every tile now names the subject that demonstrates it (photo / card / grid / ball / text / keyshot)
instead of applying all 175 effects to one flat teal ball. The audit also found ~40 tiles that were
rendering nothing because their defaults are sized for a real comp — Tile Shift and Tile Rotate were
exact no-ops on a 96px thumbnail. See `SUBJECT_OF` and `OVERRIDES` in `js/fx-thumbs.js`.

## 1. EFFECTS-PLAN.md round 11 — the standing autonomous order

**Round 10 is COMPLETE. All thirteen effects on that file's BUILD NEXT table are shipped** (v4.54 →
v4.61): Levels, Halation, Frame Stutter, Shockwave, Speed Lines, HSL Bands, Time Warp Scan, Chroma
Key Pro, Light Wrap, Dispersion, VHS Tape, Compression Crunch, Temporal Denoise. The app is at 188
effects.

**Round 11 is under way.** Shipped off the WORTH DOING LATER list: **Lens Distortion + Pixel Sort
(v4.62)**, **Luma Matte (v4.63)**, **Compound Blur + Match Grade (v4.64)** — five of the ten. The app
is at 193 effects.

Still open on that list, and all five now need NEW UI rather than just a render branch:

- **Curves** — needs a curve-editor param type in the registry. The biggest of the five and the most
  used tool in any editor. Levels covers ~80% of it with sliders that already fit the schema.
- **Corner Pin** — the homography solve is 20 lines; the ON-CANVAS DRAG HANDLES are the entire job
  (`js/point-edit.js` is the pattern). Sliders alone would be unusable. Start the mesh at 8x8.
- **LUT (.cube)** — a new file-type param, IndexedDB persistence, and a parser eating untrusted text
  (`storage.js sanitizeImportedLayers` rules apply). A missing LUT id in an imported `.fmproj` must
  degrade to identity, never throw.
- **Defocus / Bokeh** — genuinely expensive (see flag F: 40-70ms full res). Quarter-res or export-only.
- **Stabilize** — as an offline Analyse pass over `js/tracker.js`'s frame cache, baking a correction
  curve. NOT as a live effect; see flag C.

`dspSlot(W,H)` + `_dspLvl` (v4.63) is the scratch pool for anything that reads ANOTHER layer — Luma
Matte, Compound Blur and Match Grade all sit on it. Corner Pin will not need it; a LUT will not either.
- the **full proposal table** of per-effect PARAM upgrades (~105 of them), which is what rounds 1-9
  worked through. Those carry the byte-identity rule; new effects do not.

Two things learned in round 10 that belong here:

- For a NEW effect there is no legacy value to match, so the identity check that matters is
  **"0 differing bytes vs HEAD across a spread of EXISTING effect stacks"** — it catches an
  accidental change to shared machinery, which is the only way a new effect can break an old project.
- A **CANVAS_FX at a no-op setting is not byte-identical to having no effect at all**: the plate
  round-trip (rasterise once, then blit) moves antialiased edge pixels by ±1. Light Wrap at intensity
  0 differs on 169 of them, Rounded Corners at radius 0 on 192. Judge a canvas effect's no-op by
  "confined to the antialiased edge, delta ≤ 1", not by zero.
- `FM.needsBgSnap` / `BG_SNAP_FX` (v4.58) is the gate for any effect that reads the layers
  UNDERNEATH. Add one key and it works.

---

## Not blocked, but lower value than the two above

- **Effect descriptions.** 68 of 175 are hand-written (`DESCRIPTIONS` in `js/fx-registry.js`); the rest
  fall back to a generated line stating family + controls. Upgrading more is a steady win — add to
  that map, nothing else needs touching.
- **Motion Blur (Footage) on a group.** Currently refused (`supportsLayer`) and stripped at render,
  because a group reaches the effect stack already flattened with its transform baked in. Real support
  means flattening the members with the group's transform excluded and re-applying it after the blur.

---

## Verification harnesses worth reusing (they have caught real bugs)

- **Export identity across all 175 effects.** `git show HEAD:js/compositor.js > _oldcomp.js`, then
  `sed 's|js/compositor.js?v=NNN|_oldcomp.js|' index.html > _old.html`, load `_old.html` in a hidden
  iframe and render the same scene through BOTH `FM.renderScene`s into UNSTAMPED canvases (that is the
  export path). Zero differing bytes = safe. **Always warm up with a throwaway render first** — the
  first call in a fresh window is cold and reports false differences — and ONE warm-up render is not
  always enough. The displace path allocates three canvases on first use and reported a false
  168-byte difference after a single warm-up, and cube3d a false 162-byte one after four. Use SIX
  warm-ups per side, and RE-RUN any non-zero result before believing it — both of those went to 0.
- **Reduced-scale geometry.** Render at scale 1, downscale, compare against a render at 0.5. Catches
  anything that assumed the preview canvas is 1:1 with the project.
- **Glide/momentum tests.** rAF is frozen when the Browser pane is hidden, AND a synchronous rAF stub
  makes `dt` 0 so time-based physics collapse to nothing. Stub rAF with a VIRTUAL CLOCK that advances
  16ms per frame.
- **`FM._layerCTM(layer, t, scene)`** returns a layer's exact placement matrix — the cheapest way to
  prove parenting, transforms or blur geometry without eyeballing a render.

## House rules (from CLAUDE.md — non-negotiable)

Vanilla HTML/CSS/JS, no build step. Mobile-first, verify at ~380px in the browser preview without
being asked. Verify then claim. Bump `index.html`'s version label + the `?v=` cache-busters on every
touched file + a POLISH-LOG.md entry per release. Commit locally; **never push**. Raise
BEFORE-PUBLISHING.md whenever publishing comes up. Add any new AM-modelled screen to that file's list
as you build it.

## The test checklist

Lives at <https://claude.ai/code/artifact/8b77fe99-8b9f-4df8-83ce-001bfa87a9fc> and currently covers
v3.79 → v4.64. Every shipped feature gets an entry; re-publish the SAME url (pass it as `url`) rather
than minting a new one.
