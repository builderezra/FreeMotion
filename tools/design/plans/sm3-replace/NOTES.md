# Simple Phase 3 · template Replace — Insert your Media's Replace Media through Simple's own Replace (queue 980; his #619 / #343; refers to #545)

Branch `hunt/sm3-replace`, built ON `ssh/hunt/sm3-land` (ac90b589: v17.51 + the whole unshipped Simple Phase 3 chain).
**NOTHING WAS RUN** — no browser, no server, no python, no test: a release ship was running on this machine. The only programs run
were git, grep, sed, awk and `node --check` (a parse check). Every line here is from reading; the suite has not seen any of it, and
every test below is owed its first run.

## ⚠️ Read this first: in the app it is reachable only once D3 is answered

Insert your Media opens from one door: Home → a template's ⋯ → **New project from template** (`js/home.js` `use()` →
`FM.templates.useAsNew` → `FM.templateFill.open()` 420 ms later). That makes a brand-new project whose card has no `editor`, and
`FM.editor.homeFor` (js/editor-mode.js:32) answers **Full** for it. So today the sheet always opens over Full, and this route — which
runs only while Simple is on screen — never runs for him. It runs the moment a template's new project opens in Simple, which is
**D3** (§7.2: "A brand-new project with no card entry yet uses `fm.editor.last` (D3 A)"). D3 is **open** (re-asked 1 Oct).

Why it was built anyway: B28's own rule is decided and does not depend on D3 — whichever editor is under the sheet, the right route
runs (Simple's under Simple, Full's untouched under Full). §15's Phase 3 row says the same: *"open: D3 (re-asked), which only decides
the Create picker item"*, and sm3-next's NOTES table already listed *"Template-fill Replace (B28) | answered"*. Under D3 B this code
is simply never reached (it can stay, or be removed in one commit).

**D3 options (DESIGN §17, verbatim):** *"A. A new project opens in the editor this device last switched to in the ⚙ cog; New project
looks and works as today (recommended) · B. Always start in Full; switch in the cog after"*. **Recommended: A** — and when D3 A is
built, give the TEMPLATE door the same answer as Create (§7.2 says "a brand-new project"), i.e. `use()` / `useAsNew` stamp the new
card's `editor` from `fm.editor.last`, not only `createFromDialog` (editor-mode.js:31's comment names only Create). Both are Full files.

## The design answers it rests on (quoted)

- **§0.4 B28** (Full stays exactly as it is, his 1 Oct rule): *"template fill routes through Simple's Replace from Full too"* →
  **now** *"only while Simple is on screen"*; Simple loses: *"filling a template from Full leaves gaps, as today"*.
- **§3.6 Replace row:** *"No picker inside the runner, ever … Simple runs `const nrec = await FM.pickReplacement(id); if (nrec)
  FM.spine.edit('Replace', R => plan(nrec…))` … The slot is kept; a shorter source becomes the Tail-trim plan (slide-back, cues,
  ripple) in the same step. Template fill (`js/template-fill.js:261-270`) routes each slot through this command only while Simple is
  on screen (1 Oct, §0.4 B28), one step per slot, so a Simple template filled with shorter phone clips has no gaps and every title
  stays on its clip; in Full it keeps today's `FM.replaceMedia` exactly"*.
- **§7.3:** *"'Insert your media' from a template (`js/template-fill.js:292`) opens in this device's editor (§7.2) and fills slots
  through Simple's Replace only while Simple is on screen (§0.4 B28; in Full, today's fill)"*.
- **§14.2:** *"`js/template-fill.js:261-270` | Replace through Simple's Replace only while Simple is on screen (§0.4 B28) | 3"*.
- **§15 Phase 3 row:** *"… template-fill Replace while Simple is on screen …"*; *"open: D3 (re-asked), which only decides the
  Create picker item"*.
- **§17, his answers 1 Oct** (verbatim): *"D1 A, D2 ?, D3 A, D4 A, D5 A, D6 A, D7 A, … D14 A, … D17 B, … D21 A"*. The ones used:
  **D4 A** *"Yes; music, voice-overs and long things stay put …"* (the title on a slot follows it); **D6 A** *"The title slides back so it
  stays on its clip"* (planReplace's slide-back); **D7 A** *"The edit stops and says how many are locked, with one tap to 'Do it
  anyway': one step, and the lock stays on afterwards"*; **D14 A** (first half) *"Looks, text, captions and sound work together …"* —
  a shorter clip ripples, so it is arranging and waits while a friend who can edit is in (the gate, unchanged); **D17 B** *"The video
  runs on in black"* (a template's song is never fitted); **D21 A** *"Yes, under Clips › Extras …"* (an inserted template's clips are
  already main clips with the tray's Replace — built in sm3-extras). **D3 is open** (above). D14b, D18, D22, D23, D24 are open and do
  not touch this.
- **§9.1:** a block — *"No trim, no split, no look edits inside"* (used for a slot inside a masking frame, departure 2).
- **§3.12:** Simple speaks in `#sm-say` / `#sm-live`; *"FM.toast is banned for Simple's lines"*.
- **#619's remaining line** (REQUESTS.md, builder 16 Oct): *"What is left is his look at the fill-in sheet (the 2 Sep line), and swapping
  the media from the Simple editor (DESIGN §8.5 template Replace — Simple Phase 3, not built yet)."* His words on #619: *"And templates
  when you press on them just create themselves as a project, not what I wanted and I specified many times to fix this / I know it’s a
  big thing to do idc"*.

## What was built

- **The route** (`js/template-fill.js`, a Full file, the smallest opt-in): Replace Media calls `FM.spine.cmd.fillReplace(id)` **only
  while `FM.editor.isSimple()`**; otherwise exactly today's `FM.replaceMedia(id)`. The same `landed.then(again, again)` redraw.
  Plus `FM.templateFill.refresh()` (redraw the row and preview on the same slot) — only Simple's line calls it.
- **The command** (`js/spine-edit.js`, block `PHASE 3 · TEMPLATE REPLACE` at the very end):
  - `FM.spine.cmd.fillReplace(id)` — `FM.pickReplacement` at the tap (nothing awaited before it, so the tap's gesture reaches the picker
    on an iPhone), the project-switch guard, then ONE `S.edit` step labelled **Replace clip** (`ed: 's'`).
  - `FM.spine.planFillReplace(R, id, nrec)` — the tray's own `planReplace` (slot kept; a shorter clip a tail trim that closes up, the
    title slides back, cues/riders/tail, a sound twin given the same file, every refusal), with one guard first: a picture or video
    **inside a block** (no unit of its own, not main — e.g. a photo in a masking frame) refuses a SHORTER file with
    `replaceInGroup` (+ Open in Full); a file that keeps the length goes through planReplace as a non-arranging swap.
  - `FM.spine.fillLength(L, nrec)` — the length replaceMediaWith's clamp leaves (planReplace's own sum).
  - `refuse()`'s Open in Full list gains `replaceInGroup` (one token, js/spine-edit.js:1263).
- **Simple's line on the sheet** (`js/simple-tools.js`, block `PHASE 3 · TEMPLATE REPLACE — SIMPLE'S LINE ON INSERT YOUR MEDIA`;
  `js/spine.js` gains the hook `FM.spine.sayOver`, called first by `FM.spine.say`). The sheet (`#tpl-fill`, fixed, inset 0) covers
  `#sm-say`, so without this a refused swap (*"That clip is locked"*, *"Not enough footage"*, *"Sam can edit"*, *"That clip fades into
  the next one"*) would change nothing and say nothing — #619's exact failure. While the sheet is up over Simple: a row line shows
  **on the sheet, between the slots and the control**, with its buttons (armed after 400 ms), its words also written to `#sm-live`;
  a live-only line goes to `#sm-live` as before and puts the sheet's line away. The line goes on a press elsewhere on the sheet, after
  4 s (10 s with a button; held while hovered or focused), when the sheet closes (a MutationObserver on its class), on leaving Simple,
  or `_reset`; **the element is removed each time**, so Full's sheet DOM is left as it was. A button that lands a step (Do it anyway)
  redraws the row (`FM.templateFill.refresh`) once the runner is idle — the tap's own promise settled before it. createElement /
  textContent only; nothing runs in Full (`tfUp()` needs `isSimple()` and the sheet open).
- **Words** (`js/spine-words.js`): `lines.replaceInGroup` — *"That clip is shorter than its place in the group"*.
- **CSS** (`styles.css`, one block at the very end): `.sm-fill-say`, `.sm-fill-say-t`, `.sm-fill-say-b` (accent like `#sm-say`'s,
  ≥ 44 × 40), `:empty` hidden, the sheet's centred column at ≥ 701 px.
- **Busters** (`index.html`, +1 over sm3-land): styles.css 773→**774**, js/spine-words.js 18→**19**, js/spine.js 8→**9**,
  js/spine-edit.js 17→**18**, js/simple-tools.js 16→**17**, js/template-fill.js 4→**5**. If main moves past these before landing:
  take the higher line, then one above it.

## Full files touched — every line, for the lock run

**`js/template-fill.js` only** (storage.js, home.js, app.js, editor-mode.js untouched):
- **L22** — a header comment line: *"(queue 980: while the Simple editor is on screen the swap is Simple's own Replace instead — see
  Replace Media below.)"*.
- **L271–274** — in Replace Media's click handler, after `again`: a 2-line comment, `const viaSimple = !!(FM.editor && FM.editor.isSimple
  && FM.editor.isSimple() && FM.spine && FM.spine.cmd && FM.spine.cmd.fillReplace);` and `const landed = viaSimple ?
  FM.spine.cmd.fillReplace(id) : FM.replaceMedia(id);` (was `const landed = FM.replaceMedia(id);`).
- **L310–312** — `FM.templateFill.refresh()` (a 2-line comment + the method). Nothing in Full calls it.

`js/spine-edit.js` and `styles.css`/`index.html` are shared files in `tools/_fu_gate.py`'s eyes (its `SIMPLE_FILES` lists spine.js,
spine-words.js, simple-timeline.js, editor-mode.js, simple-tools.js — not spine-edit.js), so the gate will ask for the lock anyway.

**What the lock (FU1–FU7) must show:**
- In Full, Insert your Media's Replace Media is `FM.replaceMedia` once — the same picker, swap, scale fit, one plain undo step, the
  save, the media-library tile, `true`/`false` as before — and never `FM.spine.edit` / `fillReplace` (test 3 checks the counts).
- Full's sheet never holds a `.sm-fill-say`, including after a Simple session put one up and the sheet was closed or the editor
  switched (test 3's control checks Done; the editor switch path is `tfClear` on `FM.editor.onChange` — not tested, owed).
- Your words / Your colour, the slot row, the scrub, Done: byte-identical behaviour (not touched).
- `FM.spine.say` with no sheet up over Simple calls the sink exactly as before (every Simple line test: `simple P2`, `simple P3`,
  `SU1`, `980 cog`).
- The existing sheet tests: `?only=690` (Replace Media redraws once landed, the chips), `?only=619`, `?only=queue%20343`.
- A project filled in Simple, seen in Full: an ordinary project (Simple adopted it on the first shorter swap: `sm.main` on its clips,
  `project.sm.adopted` — the plain fields every Simple arranging step writes).

## Departures from the design (each a call made while building; his to overrule)

1. **Simple's lines show ON the sheet** (`.sm-fill-say`, between the slots and Replace Media). The design has only `#sm-say` /
   `#sm-live`; the sheet covers `#sm-say`, so the design as written would have refused in silence.
2. **A slot inside a block** (a photo in a masking frame): a file that keeps the slot's length swaps in one step (as Full does); a
   shorter one is refused with *"That clip is shorter than its place in the group"* + **Open in Full** (§9.1: no time edits inside a
   block). The §3.6 Replace row does not mention blocks — the tray never reaches a block's member, the sheet does.
3. **Open in Full from the sheet's line hops UNDER the sheet**: the sheet stays up, the editor under it is Full, and he presses Replace
   Media again (and picks the file again) to get Full's swap. A one-tap "do it in Full" would need the picked file carried across.
4. **Your words / Your colour still write the layer directly and commit as Full does** — B28 names only Replace; they move nothing.
5. **The step is labelled Replace clip**, the tray's own label (the design says only "one step per slot").
6. **`FM.templateFill.refresh()`** is new in a Full file (needed so Do it anyway does not leave the slot showing the old length — the
   queue 690 HUNT-e failure again).
7. `S.fillLength` repeats planReplace's length sum rather than refactoring planReplace (a Phase 2 function) to share it.

## ❓ NEEDS EZRA'S EYES (#545: nothing visual new ships unseen; none of this has been drawn on a sheet)

1. **D3** (above) — without A, he cannot reach any of this from Home. Recommended: A, with the template door included.
2. **The line on Insert your Media** at 380 and 1280×800: a quiet card between the slots and Replace Media, e.g. *"That clip is locked
   [Do it anyway]"*, *"Not enough footage"*, *"That clip is shorter than its place in the group [Open in Full]"*. Options: (a) as built —
   recommended; (b) the line in the sheet's top bar beside Done; (c) a toast raised above the sheet (Simple bans toasts, §3.12).
3. **What a shorter clip does in Simple**: the clips after move up (no gap), where Full leaves a gap. He has not seen either side.
4. **Words**: *"That clip is shorter than its place in the group"*.
5. **Open in Full from the sheet** (departure 3): options (a) as built; (b) the button also does the swap in Full with the file he
   already picked; (c) no Open in Full on the sheet, the words only.

## Tests (tests/tests.js, before the final `})();`, `{ item: '980' }`, block `simple P3 · Replace`)

Helpers are all `smRp…` (none existed). The decode is stubbed BY NAME (`short*` = 4 s, else 30 s; a File's expando does not survive
the picker's DataTransfer) and the media library's add/remove are stubbed, both put back in a finally. The picker is the suite's
`smPicker`. On the base (sm3-land, ac90b589) the sheet's Replace Media is always Full's `FM.replaceMedia`; each test fails there by its
own sentence, never a missing function:

1. `simple P3 · Replace at 380 on Insert your Media over Simple a shorter clip for the middle slot keeps the slot and closes up behind it
   in ONE step labelled Replace clip …` (atPhoneWidth 380). **CONTROL**: the project reads as A, B, C with the title on B. Base: Full's
   replace shortens B to 4 s in place → *"380: Replace Media on Insert your Media over Simple left a 2.00 s gap — Clip 2 now ends at 7
   and Clip 3 still starts at 9: the swap went through Full’s replace, which shortens the slot in place and never closes up"*. Also
   checks C exactly 7, the title at 4, one step `Replace clip`/`ed: 's'`/`arr`, the chip 4.0s, the slot still picked, no line, and one
   Undo: old file back, every time back, the document byte for byte.
2. `simple P3 · Replace at 1280×800 on Insert your Media over Simple a refusal is said ON the sheet …` (smTrayBAt 1280×800). **CONTROL**
   (passes on the base): with the sheet closed, the tray's Replace with Clip 3 locked says *That clip is locked* in `#sm-say` and puts
   nothing on the sheet. Base: Full's replace ignores the lock → *"1280×800: with Clip 3 locked, a shorter clip for Clip 2 on Insert
   your Media over Simple said nothing on the sheet and went straight in (Clip 2 is now 4 s, Clip 3 still at 9): Full’s replace, which
   never asks about the lock (D7)"*. Also checks: Do it anyway is the one button; nothing written; not in `#sm-say` too; the line lies
   between the slots and Replace Media, inside the column, on screen; Do it anyway armed after 450 ms, ≥ 44 × 32, not covered; then
   one step, C at 7 and still locked, the chip redrawn to 4.0s, the line gone.
3. `simple P3 · Replace leaves Full’s Insert your Media exactly as it was …` (default width) — **the Full-unchanged control**.
   **CONTROL** first, over Simple with Clip 3 locked: the line is on the sheet, and Done takes it out of the sheet. Base: *"CONTROL:
   over Simple, with Clip 3 locked, a shorter clip for Clip 2 said nothing on Insert your Media and went straight in (Full’s replace),
   so the Full half below could not tell Simple’s route from Full’s"*. Then in Full (spied): `FM.replaceMedia` 1×, `FM.spine.edit` 0×,
   `fillReplace` 0×; B 3+4 in place, C where it was, one step that is not Simple's, nothing adopted, no `sm` on B, no line element.
4. `simple P3 · Replace at 380 a slot inside a masking frame …` (atPhoneWidth 380). **CONTROL**: B reads as part of a block (no unit;
   the frame's unit is `block`). Base: Full's replace shortens the framed clip → *"380: a shorter clip for the clip inside the masking
   frame said nothing on Insert your Media over Simple and went straight in: the framed clip is now 4 s in its 6 s frame (Full’s
   replace shortens it in place)"*. Then: Open in Full is the button, nothing written; a 30 s file goes in as one non-arranging
   `Replace clip` step that moves nothing, and the refusal line goes.

Owed, not written: the editor switch clearing the line (`FM.editor.onChange`), the 10 s timer, a press elsewhere on the sheet clearing
it (`pointerdown` — the suite's `.click()` sends none), the live gate's *Sam can edit* line on the sheet (needs a session fixture).

## First run (serve the tree with `tools/serve.sh`)

```bash
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Replace'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3%20%C2%B7%20Replace'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P2.3'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=690'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=619'
python3 tests/_cdp.py --port 8777 --url 'http://localhost:8777/tests/run.html?only=simple%20P3'
python3 tests/_cdp.py --port 8777 --width 380 --url 'http://localhost:8777/tests/run.html?only=simple%20P2'
```
Then the full suite at both widths and the lock run above. If test 2 is red first look at: the line's place (`rail.after`, then the
control re-appended at the end by `showControlFor`), the 400 ms arm, and `FM.templateFill.refresh` after Do it anyway. If test 4's
CONTROL is red, `maskGroup` did not survive `applyScene` or `isBlockGroup` changed.

## What was skipped, and why

- **D3 and the template door opening in Simple** — open decision, and Full files (home.js / storage.js).
- **Your words / Your colour through Simple's runner** — B28 names only Replace (departure 4).
- **A picked file is not let go after a refusal** — the same as the tray's `pickReplace`; a Do it anyway / retry closure still needs it.
  It lives until reload.
- **Full's own toasts are under the sheet** (pre-existing, Full): `#toast` is z 60, `#tpl-fill` z 165, so pickReplacement's *"Could not
  load that file"* / *"Media was not replaced …"* are invisible over Insert your Media in BOTH editors. A Full fix, its own item.
- **A single-spine main block's Replace through its member** (§9.2 gives such blocks Trim / Speed / Split through M) — a shorter file
  is refused instead.
- The sm3-review findings on the Extras template insert (#3 placed as one block, #6 media records left after a failed step) are
  untouched: this part does not go through `planAddTemplate`.

## Checks done here (the only ones possible)

- `node --check`: OK for js/spine.js, js/spine-edit.js, js/spine-words.js, js/simple-tools.js, js/template-fill.js, tests/tests.js.
- No CR bytes and no conflict markers in any changed file.
- No duplicate 2-space top-level `const` / `let` / `function` name in any changed app file or in tests.js; every new helper (`tf…` in
  simple-tools.js, `smRp…` in tests.js) is new. No double quote in a new test title. The one new `//` comment ends a finished statement.
