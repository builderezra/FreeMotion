# Next session — the open queue

Rewritten 2026-08-07. **Everything above v4.09 is committed locally and NOT pushed** — Ezra pushes
via GitHub Desktop. Fifty releases are waiting (v4.10 → v4.59).

Work the list top-to-bottom; it is in the order Ezra asked for the items.

---

## ~~1. Effect thumbnails that actually show the effect~~ — SHIPPED v4.53

Every tile now names the subject that demonstrates it (photo / card / grid / ball / text / keyshot)
instead of applying all 175 effects to one flat teal ball. The audit also found ~40 tiles that were
rendering nothing because their defaults are sized for a real comp — Tile Shift and Tile Rotate were
exact no-ops on a 96px thumbnail. See `SUBJECT_OF` and `OVERRIDES` in `js/fx-thumbs.js`.

## 1. EFFECTS-PLAN.md round 10 — the standing autonomous order

**Round 10 is under way and is the first round that adds NEW effects rather than params.** Shipped so
far, off that file's BUILD NEXT table: **Levels + Halation (v4.54)**, **Frame Stutter + Shockwave
(v4.55)**, **Speed Lines + HSL Bands (v4.56)**, **Time Warp Scan + Chroma Key Pro (v4.57)**,
**Light Wrap (v4.58)** — nine of the thirteen.

Still open on that table: **Dispersion (10)**, **Temporal Denoise (11)**, **VHS Tape (12)**,
**Compression Crunch (13)**. All four are PIXEL_FX with real per-frame cost; read that file's
"Perf claims I think are wrong" table before starting any of them.

`FM.needsBgSnap` (v4.58) is now the gate for any effect that reads the layers UNDERNEATH — add a key
to `BG_SNAP_FX` and it works. That is what Liquid Glass would need if it is ever redone properly.

The byte-identity rule and the three-gate harness are documented at the top of EFFECTS-PLAN.md,
including the two traps that have caught me: `params:{}` renders at the LEGACY default (use
`FM.fxRegistry.makeInstance`), and `makeInstance` stamps schema `def`s so a new instance can differ
from an old one — decide that deliberately each time. For a NEW effect there is no legacy to match,
so the check that matters is "0 differing bytes vs HEAD across a spread of existing effect stacks",
which catches an accidental change to shared machinery.

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
  first call in a fresh window is cold and reports false differences.
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
v3.79 → v4.59. Every shipped feature gets an entry; re-publish the SAME url (pass it as `url`) rather
than minting a new one.
