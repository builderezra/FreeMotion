# Where things stand — written before a chat compaction

**Live: v6.86. Working tree clean, HEAD == ssh/main (79950a3). Nothing half-finished.**

REQUESTS.md is the real list and is fully up to date — this file is only the short version.

---

## The one thing worth knowing: the black bar saga

It took **six attempts** and the answer was one line. Recording it because the failure pattern
matters more than the fix.

The bar was `index.html`'s inline `<style>html,body{background:#000}</style>`. The document
CANVAS is painted from `<html>` and covers the whole **web view**, which under `viewport-fit=cover`
on iOS is larger than the layout viewport the page is laid out in. The app's ground is `#060c0f`,
so every sliver the page didn't cover rendered as a **black bar** — right edge, bottom edge,
splash, home and editor alike.

Five wrong attempts first: an `overflow-x` rule (v6.78), a `theme-color` change (v6.79), a
suggested reinstall, and two reverts. Every one assumed "an element is too small". A four-agent
audit proved no such element exists — no width rule, `env(safe-area-inset-right)` used zero
times, no horizontal overflow, no narrowing commit since v6.73 — and Ezra's own probe screenshot
read **440 across every width metric**.

**The lesson, in his words' terms:** his very first screenshot showed a strip *darker* than the
app. That said "something behind everything is a different colour", and I read it as "an element
is missing". Six rounds could have been one.

Also: the `overflow-x: hidden` I added in v6.78 was itself a regression — on `body` it forces
`overflow-y` to `auto`, making body a scroll container. Reverted in v6.81.

---

## Shipped this session

| ver | what |
|---|---|
| v6.74 | frame-rate lists 15/25/30/50/60/120 everywhere; effect registries null-prototype (closed a real crash) |
| v6.75 | film grain: `ease-in-out` → `linear`. The stop was in the CURVE, not the speed — measured 12.5% of every cycle motionless vs 0.0% |
| v6.76 | pin to top on projects/templates/elements, no cap, stable partition |
| v6.77 | overpull slam works on a real phone (2 causes); pinned-card flare |
| v6.78–v6.81 | the four wrong black-bar attempts + revert. Net effect zero, kept for the history |
| v6.82 | slam no longer reveals the editor behind home (140px ring of home's own bg) |
| v6.85 | **the black bar, actually fixed** |
| v6.86 | text default sizes off the SHORT side; Edit Text gets its own icon |

Suite has been **231/231** on every one of these.

---

## Next, in the order I was working

1. **#117** red lock icon on a locked layer's preview swatch — the swatch is a `<canvas class="th-thumb">`
   built at `js/timeline.js:661`, `FM.renderThumb(layer, thumb)`. I had only *read* this, no edits.
2. **#136** a selected Captions layer locks the timeline and layer dragging
3. **#141 / #121 / #102** the export cluster — custom ratios + fps, the real bug that a project
   already on a custom setting can't be exported at it, the settings→export one-way mirror, and
   export robustness. **Do these as ONE piece of work on the export path, not three passes.**
4. **#142** default shape colour in home settings
5. **#139** project notepad + export reminders (must reach the PC layout too)

## The big one still open

**#125 / #130 — timeline and playback lag.** His loudest complaint. First real profile is done and
is written up in REQUESTS.md, including **two dead ends so they are not re-run**:
- the scroll path does NOT do per-frame innerHTML (timeline render ran 0 times across 90 frames)
- reducing canvas resolution is already measured as low-yield: 13x fewer pixels bought only 32%
  less time on a plain video clip, because video decode costs the same whatever canvas it lands in

**So the next pass belongs on the VIDEO path** — per-scroll seek/decode reuse — not the raster path.

---

## Housekeeping

`.claude/worktrees/` holds **110 leftover repo copies, 1.1 GB**, from my workflow runs. They each
report a few changed files so I did not delete them unilaterally. Worth clearing when he says so.
