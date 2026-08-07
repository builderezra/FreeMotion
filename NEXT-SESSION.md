# Next session — the open queue

Rewritten 2026-08-07 at the end of the v4.52 session. **Everything above v4.09 is committed locally
and NOT pushed** — Ezra pushes via GitHub Desktop. Forty-three releases are waiting (v4.10 → v4.52).

Work the list top-to-bottom; it is in the order Ezra asked for the items.

---

## 1. Effect thumbnails that actually show the effect  ← he asked for this last, and it is the live one

Ezra, verbatim: *"We had a miscommunication a while back where I wanted you to create a picture for
every effect that resembled the effect and I gave an example of a ball with the effects applied but
you just did that for literally everything, I want you to tackle it again, and see if an effect isn't
really being described by the picture, give it a better picture."*

`js/fx-thumbs.js` renders every browser tile by applying the effect to ONE generic mini scene — the
ball. For a good number of effects that shows nothing useful:

- **warps** (wave, ripple, twirl, bulge, fisheye, polar, bend, curl, turbulent displace) need a GRID
  or text to visibly deform; a ball just becomes a slightly different ball
- **temporal** effects (motionflow, drift, orbit, spin, swing, pulse, wiggle, shake, echo) need motion
  across frames — a still tile can't show them at all
- **matte / key** (chromakey, lumakey, wipes, choker, fringe) need a subject on a contrasting
  background, otherwise the tile is just the subject
- **text** effects (counter, timecode, textspacing, texttransform, textprogress, textrandomizer) need
  actual text
- **3D** solids need a textured face, or every one of them looks like the same grey shape
- **repeat / tiling** needs content with a recognisable edge so the repeat reads

The job: audit all 175 tiles, decide per effect whether the current subject demonstrates it, and give
the ones that don't a subject that does. Keep the ball where it genuinely reads (colour grades, blurs,
glows, vignette — those are exactly what a ball is good for). This is a judgement pass, not a
mechanical one: the test is "could someone tell what this effect does from the tile alone".

## 2. EFFECTS-PLAN.md round 10 — the standing autonomous order

Nine rounds shipped (v3.87 → v4.13). Round 10 starts from the proposal table in that file. The
byte-identity rule and the three-gate harness are documented at the top of it, including the two traps
that have caught me: `params:{}` renders at the LEGACY default (use `FM.fxRegistry.makeInstance`), and
`makeInstance` stamps schema `def`s so a new instance can differ from an old one — decide that
deliberately each time.

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
v3.79 → v4.52. Every shipped feature gets an entry; re-publish the SAME url (pass it as `url`) rather
than minting a new one.
