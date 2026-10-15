# #980 Simple editor, Phase 3 — the switch morph (D11 B)

Branch `hunt/sm3-morph`, off `hunt/v50-tree` (4af4e420, the v17.50 tree). **Nothing was run** — a release ship was running in
`~/FreeMotion` the whole time, so no node, python or browser: the code, the six tests and the picture probe are written and read,
not executed. The first suite run of the six `simple P3 · the switch morph …` tests and the first probe run are still owed.

## What the design asks (read by grep and ranges)

- **DESIGN.md §6.3, lines 2113–2159** — the contract. The switch's state changes at once under the cog; the animation is held until
  `cvClose` and plays as the cog closes. FLIP keyed by layer id, almost purely vertical (both editors share `pxPerSec` and the
  centre line, so every box keeps x and width). 0–120 ms row heads, dots, Add row fade; 0–320 ms each box flies
  (`cubic-bezier(.2,.8,.2,1)`) keeping its colour; 180–320 ms section labels and `+` fade in, the Simple tools rise. Back to Full
  plays it in reverse and ends on today's Full exactly (FU7). Reduced motion: no morph. Big projects (a)–(d). The phone solo case.
  "The stage height moves with it."
- **D11, line 4130, and §17, lines 4106–4109** — *"D11 B"*, then *"Just do the one clip on the far left, morph i think it was"*.
- **What "the one clip on the far left" means** — it is the far-left of the **three animation clips the V10 sheet drew side by
  side** (morph, fold, slide): `vis/v10.js:348` words option B *"the morph, the one on the far left"*, and `:572` draws them in
  that order. It is not "one clip morphs": in the morph every box flies (§6.3, and `vis/v1.js:337-377`, which plays it).
- **§0.4.3 I20, line 207** — the swap itself (crossfade / morph, stage height) happens only during a swap; Full after it is today's
  Full (FU7, line 241).
- **§15 Phase 3 row, line 4032** — "the switch animation (the morph only, D11 B, played as the cog closes, §6.3)".
- Timings not in the text were taken from V1, the prototype he picked from (`vis/v1.js:337-377`): old look out 150 ms ease-in,
  new look in 180 ms from 140 ms, each box's look crossfades 200 ms from 50 ms, a scrolled-away box fades 120 ms at that end.

## What was built

| File | What |
|---|---|
| `js/editor-morph.js` (new, `?v=1`) | `FM.editorMorph`: `capture(from, to)` measures every box the editor on screen draws (First) and clones the visible ones; `play()` measures the new editor (Last) and flies them; `stop()` lands it; `forget()` also drops a held capture. Seams: `_state()` (the suite), `_hold()` (the probe). |
| `js/editor-mode.js` (`?v=6` → 7) | `apply()` calls `capture` just before the class flips, for a watched switch (from the cog, or a hop); any other apply calls `forget()`. `afterCogClose()` plays the morph, else the crossfade. A hop (`request(…, { hop: true })`) now morphs too (`apply(to, { morph: true })`), played at the end of `apply`. The crossfade is the fallback only. |
| `styles.css` (`?v=768` → 769) | One block after the `ed-xfade` rules: `#ed-morph`, `.edm-fly`, `.edm-clone`, `#sm-timeline.edm-out` (+ its `#sm-bar` on a phone). |
| `index.html` | the new script tag right after `editor-mode.js`, two busters. |
| `tests/tests.js` | six tests, appended before the final `})();`. |
| `tools/design/plans/sm3-morph/render-probe.js` | the picture (#545), below. |

How it plays, in order (`build()`):
1. **The panel's top glides.** On a phone Simple's stage is taller than Full's 40svh (380×800: 420 vs 320 px), so `#timeline-panel`
   gets a `translateY(old top − new top) → none` on the boxes' curve. That is how "the stage height moves with it" is done:
   the stage is laid out at its new height at once (no grid relayout per frame), and the panel sliding over it uncovers it
   (Full → Simple). Back to Full the stage is already shorter, so a band of background closes as the panel rises — see open
   question 1. On PC the panel does not move, so there is no panel effect.
2. **The editors crossfade around the flight.** Full → Simple: Full's own `#timeline` (laid out under Simple, untouched since the
   switch) is shown by the animation alone (`visibility: visible`, opacity 1 → 0, 150 ms); Simple's `#sm-timeline` fades in
   140–320 ms; `#sm-tools` rises 120–320 ms. Simple → Full: Simple's own timeline (display: none in Full) wears `edm-out`, shown
   inert, and fades out 0–150 ms (a scroller that comes back at 0 is put back by a transform on `#sm-inner`, never a scroll write,
   which would scrub); Full's `#timeline` fades in 140–320 ms.
3. **The boxes.** One flight per layer id in `#ed-morph` (fixed, z 11, no pointer events): `fly` (seen both times), `out` (§6.3 c:
   its new place is scrolled away — to that edge, fading), `gone` (no place at all — Full's phone solo view — fades where it is,
   0–200 ms), `in` (§6.3 b: its old row was scrolled away — from that edge, fading in). Each wrapper animates left/top/width/
   height and a `clip-path: inset()` (so a box half under Full's sticky heads or ruler is clipped the same at both ends), and holds
   the old look and the new look crossfading. The real boxes stay where they are, hidden by an opacity-0 effect while their
   copies fly. Nearest the line first, at most 120 (§6.3 d); the rest arrive with their editor's fade. Every effect carries no
   fill past its end and each wrapper's own style is its END state, so a morph finished by anyone already shows the landed layout.

## What of Full it touches (§0.4), exactly

Only during the 320 ms, and only through Web Animations effects, every one cancelled by `stop()`:
- `#timeline-panel` — `transform` (only when its top moved: the phone).
- `#timeline` — `opacity` (fading in, Simple → Full) or `visibility` + `opacity` for 150 ms (its old look fading out under
  Simple, Full → Simple).
- each Full `.clip[data-id]` that has a flight — `opacity: 0`.

No attribute, class, inline style or child of any Full element is written; `#ed-morph` is a body child of its own, removed at the
end; `#sm-timeline.edm-out` is Simple's own element (its `class` and `aria-hidden` are put back exactly). Test 2 holds Full's
layout record (every row, clip box, class, inline style, the scroll, the panel and the stage) after a round trip to before it,
with a control. The `#ed-morph` clones carry no `id` / `data-id` / role / label / tab stop, so `.clip[data-id=…]` queries never
match them. Its listeners (resize, pagehide, visibilitychange, pointerdown and keydown in capture, `FM.timeline.onRebuilt`) are
added once, on the first morph, and each is a no-op with no morph on screen. The FU lock's keydown sweep reads it as a keydown
listener with no key literals.

## Never stuck, never in the way (the interruption cases)

The layer takes no pointer events, so a tap mid-morph lands on the real boxes. It **lands at once** (every effect cancelled, the
layer removed, `edm-out` gone) on: a second switch (`capture()` calls `stop()` before measuring, so the second flies from the real
layout, never a box in flight); a resize or turn; the app going to the background (`visibilitychange` hidden, `pagehide`); any
tap or key; any timeline rebuild (a rebuild replaces the boxes the morph hid); a guard timer at 720 ms (a hidden tab pauses
animations); and every quiet apply (a project opening). Reduced motion, a playing project or a hidden page skip it (the caller
plays the crossfade, whose CSS is off under reduced motion, so: nothing). A capture older than 1.5 s when the cog closes (the cog
stayed open over unapplied Canvas picks, D23 A) plays the crossfade.

## The six tests (`simple P3 · the switch morph …`, `{ item: '980' }`, each at 380 and 1280)

Each fails on the base (4af4e420) on its "no morph played" line — the base plays the 150 ms crossfade and makes no `#ed-morph`
— and never by a TypeError: nothing of the new file is called unguarded (`FM.editorMorph && …`).
1. **Full → Simple through the real cog** — each seen box's flight starts on its Full box (measured before the cog opened), is on
   its way halfway (only for moves over 30 px: the curve is ~95 % there at half time), ends on its Simple box; on the phone the
   panel starts at its old top; it runs to its own end and leaves nothing; and what is left equals Simple's own fresh layout.
2. **Simple → Full through the real cog, and Full unchanged** — flights start on the Simple boxes and end on the Full rows;
   Simple's timeline is shown (edm-out, opacity 1) as it starts; Full's layout record after the round trip equals before;
   CONTROL: the record differs when clip C moves 0.1 s.
3. **A second switch mid-flight** — the first morph is caught, read at its end, put back to 100 ms and let run; the door is used
   again: the first is gone the moment the switch is made, exactly one layer after the cog's close, the second's flights start on
   Simple's real boxes and end on Full's, and Full ends as it began.
4. **Never sticks** — a resize, the app going to the background (`document.hidden` stubbed for one `visibilitychange`, then shown
   again), a tap (pointerdown + up), a key (Shift down + up) and `FM.timeline.rebuild()`, each mid-flight on its own morph
   (directions alternate): one frame later no layer, no `edm-` effect, no class, every seen box shown.
5. **Reduced motion** (asked of the driver, as `980 cog T15`) — both ways, nothing flies and no `ed-xfade` runs. CONTROL: the same
   switches without reduced motion morph (on the base this control is the failing line).
6. **Open in Full (the hop)** — the picked clip flies from Simple to its Full row; at 380, where Full shows the picked row alone,
   every other seen box is a `gone` flight that stays put and fades.

## The picture (#545 — never ship a visual he has not seen)

`tools/design/plans/sm3-morph/render-probe.js`, for `tools/shot.py --js-file` (the run line is in its header; one run per width):
a throwaway "Beach day" (three clips, a title, a song), switched both ways through the cog's door, the morph held and seeked to
0 / 80 / 160 / 240 / 320 ms, and every box, panel, fade and flight read off the page at each instant and painted (real geometry,
colours, names, the preview canvas; button glyphs are boxes). POSTs `morph-380-to-simple.jpg`, `morph-380-to-full.jpg`,
`morph-1280-to-simple.jpg`, `morph-1280-to-full.jpg` to `'http://127.0.0.1:' + window.__recv + '/<name>.jpg'`. With
`&fmhold=400` it then replays both switches holding each instant 400 ms, so `shot.py --frames …` takes **real-pixel** PNGs too.
**Not run.** The receiver it names (recv.py from fxnew-looks) is not on this tree.

## Open questions for Ezra (each with the build's default)

1. **Back to Full on a phone the stage is already its shorter self when the cog closes**, so as the panel rises a band of the
   app's background between the stage and the panel closes over 320 ms (Full → Simple is the clean direction: the panel slides
   down and uncovers the taller stage). Default: as built. The alternative is a real stage-height transition (relayout every
   frame on his phone). The picture shows it.
2. **The hop (Open in Full) morphs too** (§6.3's "with a selection on the phone" case is exactly a hop). Default: yes.
3. **Reduced motion: nothing** (§6.3 says "a 120 ms crossfade"; the Phase 1 crossfade's own CSS is off under reduced motion and
   `980 cog T15` asserts the swap is instant). Default: nothing, as T15.

## Not built (said plainly)

- §6.3 "the docked inspector sheet hinges up only after the 320 ms morph has settled" (Simple → Full with one item on the phone):
  the sheet rises on its own transition, alongside the morph.
- §6.3 "row heads … shrink to the left edge": they fade (as V1 drew), they do not shrink.
- §6.3 (c) "flies to that section's header line" for a folded section: Simple has no folding on this tree, so it is the edge.
- No new refusal: `busyReason()` does not treat a morph on screen as busy — a second switch lands it instead (test 3).

## Unsure / risks (all from reading, none measured)

- The tests assume the cog's open does not move Full's boxes (the flight's start is compared with the box measured before the
  cog opened) and that the cog closes itself (fm.cvPair is cleared so it opens on Canvas).
- On PC, if a switch changes the timeline panel's WIDTH, timeline.js's ResizeObserver rebuilds ~60 ms later, and a rebuild lands
  the morph: harmless for the cog (the switch is made 260 ms before the cog closes) but it would cut a hop's morph short there.
- `clip-path: inset()` with negative values (to show a selected box's ring and grip caps) and its interpolation: supported in
  Chrome and Safari as far as I know; not measured on his iPhone.
- `tools/_fu_gate.py`'s `SIMPLE_FILES` does not name `js/editor-morph.js`; its hooks fire on it anyway (`ed-simple`, the
  "Simple mode" marker, `sm-` ids). Adding it there is an instrument change, so a release of its own.

## Merge notes (vs the Look branch, built at the same time)

Shared files this branch changes, each in its own block:
- `index.html` — one new line right after `js/editor-mode.js?v=7` (the `editor-morph.js?v=1` tag), `editor-mode.js` 6 → 7, and
  `styles.css?v=768` → 769. If Look also bumps `styles.css`, take one number above BOTH branches.
- `styles.css` — one block inserted right after the three `ed-xfade` lines (`#timeline-panel.ed-xfade …`, about line 11794),
  not at the end of the file, so an end-of-file append from Look does not collide.
- `tests/tests.js` — one block appended before the final `})();`, starting `/* ═══ SIMPLE MODE PHASE 3 — THE SWITCH MORPH` and
  ending `// ── end simple P3 · the switch morph ──`. Look will append at the same place: rebuild by blocks (both blocks, in
  either order), never a union merge. Its helpers are all `sm3…` / `SM3_MS`, unique in the file.
- `js/editor-mode.js` — `apply()`, `afterCogClose()`, the hop line in `request()`, the crossfade's comment. Look is not expected
  to touch it.
- New files only this branch has: `js/editor-morph.js`, `tools/design/plans/sm3-morph/`.
