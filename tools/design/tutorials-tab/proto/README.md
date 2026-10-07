# D7: a working prototype of the Tutorials tab (layout A) with the Markdown renderer

Prototype only, nothing in the app changed. Serve this folder over HTTP (`tools/serve.sh PORT tools/design/tutorials-tab/proto`; `fetch` does not work from `file://`) and open:
- `index.html`: layout A. A card grid like Projects and Templates (2 columns at 380, 4 at 1280), a search box that filters by title and group, a reader per tutorial (`#/01` to `#/20`) with Previous and Next, and "Start here" on tutorial 1. A failed fetch shows the "Couldn't load tutorials. Check your connection." card.
- `test.html`: the checks below; the page title and first line say GREEN or RED.
- `md.js`: the renderer, 60 lines including its header comment. `textContent` and `createElement` only.
- `tutorials/`: the 20 files copied unchanged from `origin/tutorials-drafts` (they are not on `main`), plus `index.json` (file, title, group; the groups are the D2 proposal).
- `shots/`: `list`, `reader-01`, `reader-11`, `search` at 380 and 1280.

## What the renderer does
Handles exactly what the 20 files use (counted, not assumed: 20 headings, 168 numbered steps, 249 bold phrases, the lead-ins Tip (20), If it doesn't work (20), On a computer (20), Note (2), 23 plain paragraphs): `# title`, `1.` steps, `**bold**`, the four lead-ins as coloured callouts, paragraphs. Everything else is shown as plain text. Before rendering it removes `<!-- ... -->` (80 citations, files 01 to 06 only; an unclosed one is cut to the end of its line, not the end of the file) and everything from `### Verification` down (files 07 to 20, 281 table rows).

## Test results (`test.html`, Chromium 1194 headless, over HTTP)
**GREEN: all 20 tutorials render clean.** For each file: the page text contains no HTML comment, no `**`, no `#` heading marker, no table row or `Verification`/`Confirmed`, no `js/x.js:123`-style citation, no leading `1.`; the number of `<li>` equals the number of numbered lines in the cleaned file; the number of `<strong>` equals the number of `**x**` pairs; the title equals `index.json`'s; there is an intro and at least two callouts; every element is on the allow-list (`h2 p ol li strong div span`) and has no attribute but `class`. Plus hostile and broken input (`<img onerror>`, `<script>`, `<iframe>`, `<a href=javascript:>`, an unclosed `**`, a comment closed and unclosed): nothing becomes an element, `alert` is never called, the text is shown literally. Plus `md.js` has none of `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`.

**Mutation proof (each applied to `md.js` alone, the file restored and byte-compared after):**
| mutation | result |
|---|---|
| comment stripping removed | RED, 13 failures |
| Verification cut removed | RED, 56 failures |
| unclosed-comment strip removed | RED, 1 failure |
| `insertAdjacentHTML` in place of a text node | RED, 4 failures (the first run **hung**: the hostile `alert(1)` opened a real dialog and blocked the headless page; the test now stubs `alert` and fails by name) |
| bold regex broken | RED, 38 failures |
| restored | GREEN |

## Two bugs the screenshots found in my own prototype (fixed, listed so the app version avoids them)
1. A step is a flex row in my first CSS, so every `<strong>` and text run became its own column and a step read "Tap the / **Create** / ." in a column. Number the steps with an absolutely positioned `::before` and keep the `li` block-level.
2. The lead-in label lost its colon ("Tip Wave (keeps moving)"). The renderer drops the `:` it matches on, so the CSS adds it back (`.lab::after`).
Also: cards in a row came out different heights until `.tc` was a flex column with a fixed-height picture.

## What this does NOT show
- It is not wired into `js/home.js` and does not use the app's `emptyState` or `templateCard` helpers; the app version must (D2 lists the lines).
- The service-worker `?v=` rule from D2 is not exercised (this page fetches bare URLs).
- The test cannot list the `tutorials/` folder over HTTP, so "every file is in `index.json`" is checked only in one direction (each listed file exists and renders). The app's real test should assert it from the file system.
- Nothing about the look is picked: Ezra has not chosen A, and the card colours here are my reuse of D2's.
- A real phone was not used; 380 is a resized desktop viewport.
