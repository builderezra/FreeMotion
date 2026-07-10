# Next session — parity re-audit, then build

Written 2026-07-10 by the planning session (Opus 4.8), for the follow-up session to execute.
Ezra confirmed this plan. Work top-to-bottom.

---

## Why this exists: PARITY.md cannot be trusted as a roadmap

PARITY.md was generated **2026-06-23**, before v2.71 → v2.84 shipped. A 25-feature spot-check of
rows it marks `❌ missing` found **24 of them already implemented**:

| PARITY says ❌ missing | Reality |
|---|---|
| Bounce easing, Elastic easing | shipped v2.67 |
| Layer grouping, Masking groups | shipped v2.33 / v2.38 (`drawGroupUnit`, `maskId`) |
| Copy Background | shipped v2.55 (`FM.hasCopyBg`) |
| Freehand drawing layer | shipped v2.39 (`js/draw-tool.js`) |
| Pen tool / Edit Points | shipped v2.47 (`js/point-edit.js`) |
| Convert to Outline | shipped v2.54 |
| Time remapping / speed ramp | shipped v2.52 (`layerSourceAdvance`) |
| Volume keyframe automation | shipped (`FM.layerVolume`) |
| Audio import / audio layer | shipped v2.32 |
| Extract audio | shipped v2.54 |
| Eyedropper | shipped (`js/eyedropper.js`) |
| Custom font import | shipped (`storage.js` FontFace + IDB) |
| Timeline pinch zoom | shipped (`pinch` in `timeline.js`) |
| Angular gradient | shipped v2.45 |
| Elements / precomps | shipped v2.54 ("Save to My Elements") |
| Clipping mask | shipped v2.54 |
| Motion blur (content/optical-flow) | shipped v2.49 |
| `touch-action:none` | shipped |
| recentColors persistence | shipped |
| Captions, motion tracker, crop tool | all shipped |

Only `navigator.share` was genuinely absent. **BACKLOG.md is equally stale: 9 of its 12
"quick wins" are already done.**

> Caveat on method: the above were greps. They prove the code exists, not that every sub-feature is
> complete. The conclusion isn't "exactly 24 rows are wrong" — it's that the matrix is wrong often
> enough that **nothing downstream of it can be trusted.** Hence Step 1.

---

## Step 1 — Re-audit (do this first; everything else depends on it)

Rewrite `PARITY.md` and `BACKLOG.md` with true statuses, verified against the actual source.

**Scope optimization — only re-check the `❌` and `🟡` rows (~251 of 342).** Staleness runs one
way: a feature marked `✅` in June did not un-ship. Skipping the 90 `✅` rows cuts the job ~25%.

**Method** (this is agent-heavy — Ezra has approved the cost):
- Fan out across the 12 domain sections in parallel, one agent per domain.
- Each agent reads the real code (`js/*.js`, `index.html`, `styles.css`) and assigns a status per
  feature with a file:line citation. **No status without evidence.**
- Adversarially verify: a second pass tries to *refute* each `❌ missing` claim (that's the
  direction the errors run). A claim of "missing" survives only if the refuter can't find it.
- Rewrite both docs. Update the "Where we stand" header counts and drop the stale line claiming the
  app "is unusable on touch/mobile" — fourteen versions of mobile work have disproved it.

**Deliverable: a truthful, ranked list of what is genuinely still missing.** That list is the
roadmap, and it replaces having to hunt Alight Motion for ideas.

---

## Step 2 — Three verified-real quick wins (no audit needed; confirmed 2026-07-10)

**1. Solo doesn't gate preview audio — preview and export disagree.**
`solo` appears **zero times** in `js/app.js` and `js/audio-play.js`. Preview audio gates only on
`layer.visible === false` (`app.js:432`, `:441`, `:467-468`; `audio-play.js:49`).
But `exporter.js:98-101` *already* gates on solo (`soloActive && !layer.solo`).
So: solo a layer → you still hear every layer in preview → export the file → only the soloed audio
is there. Fix the preview side to mirror the exporter's gate.

**2. No share sheet after export.** `exporter.js:11` `download()` builds a Blob URL and clicks an
`<a download>`. On iOS that's an awkward flow. Add a `navigator.share({files:[...]})` path with the
anchor-click as fallback. Mobile-first mandate; small change.

**3. Speed slider isn't clamped** against remaining source length → last-frame freeze.
Speed UI lives at `inspector.js:1478-1487`. Clamp the slider span against
`(srcDur − trimStart)`. Note speed is keyframeable (`FM.toggleProp(layer,'speed',…)`), so clamp the
evaluated value, not just the slider.

---

## Step 3 — Build the top real gaps the audit surfaces

Highest value first. Prior expectation (do **not** treat as settled — the audit decides): the
**effects catalog breadth** is the one criticism in PARITY.md that probably has *not* gone stale.
Directional blur, zoom/spin blur, sharpen, noise/grain, gradient map, wave warp, swirl, find-edges
are each a self-contained compositor function + `fx-registry.js` entry, and they're visible wins.

---

## House rules (from CLAUDE.md — non-negotiable)

- **Vanilla HTML/CSS/JS. No framework, no build step, no bundler, no TypeScript, no npm.**
  Multi-file, plain `<script src>`. Match what the app already does.
- **Mobile is the priority.** Verify every UI change at **~380px** in the built-in preview
  (load → resize → screenshot → read console) *before* calling it done. Don't wait to be asked.
  Skip the screenshot only for clearly non-visual logic changes.
- **Verify, then claim.** If you say it works, you ran it. If you skipped a step, say so.
- Ship each change as a **version bump** (`index.html:20`, single source of truth) plus a one-line
  `POLISH-LOG.md` entry. Current: **v2.84**.
- Run `/security-review` before shipping anything touching API keys, personal data, or HTML writes.
- Commit locally; **do not push to `main` without Ezra's explicit say-so** (it deploys live to
  builderezra.github.io/FreeMotion/).
- Dev-only: `.claude/launch.json` (gitignored) runs `python3 -m http.server 8181` for the preview.

---

## Still outstanding: mobile perf

`PERF-PLAN.md` Phase 1 shipped as v2.84 (coalesced scrubbing, debounced resize, scratch-canvas
guards). **Phase 2 (Fix A) is untouched and is the single biggest improvement to how the app feels
on a phone**: the preview canvas renders every frame at full comp res (1080×1920 ≈ 2.07M px) even
though a phone displays it at ~400px wide. Downscale the preview canvas to CSS box × devicePixelRatio
(cap the long edge ~1280px), keeping `P.width/P.height` for the exporter only. The one thing to check
is hit-test / selection coordinate mapping (`compositor.js` `layerSize`).

Ezra chose to do the parity re-audit first. Fix A remains queued.
