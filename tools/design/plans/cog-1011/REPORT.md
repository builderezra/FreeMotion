# R-COG1: the ⚙ cog redesign, rendered through the real app (no app files touched)

Pictures (JPEG): `cog-1-phone.jpg` (page 1: TODAY | All closed | Canvas open | Friends open | Editor open, 380 × 800 at 2×) and `cog-2-pc-and-closeups.jpg` (page 2: PC 1280 × 800 closed / Canvas / Friends / Editor open, the 320 × 568 Canvas-open shot, and the collapsed switch at 1× and 4×, in the default and glass themes, in both modes). Neither page is taller than 3× its width, so `phonepages.py` was not needed.

## How it was made (and one deviation)
- Base: `main` at v17.37 (`d55cabc8`), served with `tools/serve.sh`, no `?fmrelay=1`. The cog is opened with `FM.openCanvasDialog({})` on the seeded project, Full editor, the way `smCog` does.
- **Nothing in `index.html`, `js/` or `styles.css` was edited or committed, and no probe page was committed.** The patch (one `<style>` plus DOM changes, spec items a to f) is a script injected into the real page by a Chrome DevTools driver, one fresh Chrome per picture. It is saved here as `cog-render-patch.js.txt` so the builder can read the CSS; it is a render aid, not app code.
- Deviation from "a probe page with iframes": I drove the real page directly (no `tests/probe-cog-sheet.html`), because a real viewport and a real device pixel ratio matter for the 320 and 375 widths and the `max-width: 700px` query. Same app, same result; the sheet is stitched from the separate pictures.
- Phone shots are emulated as a finger (touch, `hover: none`), as `tools/shot.py` does. The 4× close-ups are the real page screenshot at clip scale 4 around `#cv-ed-bar .ed-sw`.
- (d) glyphs: the kit's `quick` (Simple) and `full` (Full) from `tools/design/plans/simple-mode/vis/kit.js`, 20 px, stroke 1.8, `currentColor`; `.ed-l` 40 px, knob `translateX(40px)`, the `⇄` removed, in the small switch only (the big one inside the Editor block still says "Simple ⇄ Full").

## Console errors, per frame
**None.** Every driven page (phone 380 × 800 ×5 states, 320 × 568 ×4, 380 × 667 ×4, 375 × 553 ×4, PC 1280 × 800 ×5 and 1280 × 720 ×4, and the 8 close-ups) was run with `error`, `unhandledrejection` and `console.error` hooks installed before the app loaded: the list was empty every time.

## The open-block height cap (the open block's `max-height`, px)
The cap now loses one more bar (66 + 10) to App settings, so every open block is 76 px shorter than today's.

| viewport | TODAY (cap, block height) | NEW (cap, block height) |
|---|---|---|
| 380 × 667 | 407, 360 | **331**, 331 |
| 320 × 568 | 308, 308 | **232**, 232 |
| 375 × 553 | 293, 293 | **217**, 217 |

At 232 and 217 the Canvas card scrolls inside its box; I made the Cancel / Apply row **sticky at the bottom of the card** so Apply stays on screen (see `cog-2-pc-and-closeups.jpg`, 320 × 568). Without it, Apply would be below the fold at 217. Friends and Editor open scroll inside their own box, as today.

## The all-closed column at 1280 × 720 (PC)
**284 px tall** (App settings 56 + Editor 66 + Friends 66 + Canvas 66 + 3 gaps of 10), top at y = 200, bottom at 484 just above the cog; the cap there is 468, so it fits with room. Order from the cog upward: Canvas (nearest), Friends, Editor, App settings. At 1280 × 800 it is the same 284 px (top 272).
- How I got there: my first try kept the 176 px TILES for the closed state (Canvas 167 + Friends 167 + Editor 162 + App 56 + gaps ≈ 640 px). That does not fit under the cog even at 800 (cap 540): the tiles overlapped. So **in the closed state on PC the bars are 320 px wide ROWS** (the phone's bar, 64 px, App 54), not tiles. In the open states on PC the small ones stay 176 px tiles and App is the slim 176 × 56 row at the foot of the column, as in the spec. This is a choice the PM did not specify; say if you want tiles.

## Things worth Ezra seeing, or a builder deciding
1. **The Editor bar on a phone has no title** (that is how the app already draws it: `#cv-ed-bar .cv-mini-t { display: none }` below 700 px). With "What should you use?" gone and the switch down to two icons, the bar is now an icon, two small glyphs and ⤢. It reads, but nothing says "Editor" until it is open. A title could be shown again on the phone; I did not, because that was not asked.
2. **Canvas open drops its "Canvas settings" title.** The block's own bar now says "Canvas" with the size summary, so the title would say it twice.
3. **Friends / Canvas / Editor titles look a little dimmer than "App settings" in the PC closed picture.** The computed colours are the same (`rgb(233,244,247)`) and nothing animates; I did not find the cause and did not chase it. It may be an artefact of how the three existing bars paint over the blurred scene.
4. **PC, Editor open at 1280 × 720:** the Editor block is 488 px tall and its top is 4 px above the screen (y = −4). I measured only the new design; I did not check whether today's does the same.
5. The short-screen "Editor as a pill by the cog" mode (`cv-ed-short`) is switched off in the closed picture. It is untouched in the open pictures.
6. The App settings end button is a `span`, not a nested `<button>` (a button inside a button is invalid); the whole bar is the one `<button id="cv-app-bar">`.
7. Not built, only drawn: the tap-the-open-block-to-close behaviour, "all closed every time the cog opens", and what the dialog does with the `fm.cvPair` memory. These are renders of states, not a working prototype.

DONE: R-COG1. Pictures and report in `tools/design/plans/cog-1011/` on `hunt/cog-render`; no app files touched; no console errors in any frame; open-block caps 331 / 232 / 217 (today 407 / 308 / 293); all-closed PC column 284 px at 1280 × 720.
