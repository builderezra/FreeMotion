# Release 2.8: the open CapCut gaps (S14)

Code: `hunt/simple-gaps` (on top of `hunt/simple-stack-landing-2`, which is the landing branch plus S13's fixes). Pictures for Ezra: `gaps-options/sheet-fill.jpg`, `sheet-stickers.jpg`, `sheet-music.jpg`. Labels: **Verified** = a test or measurement I ran; **Read** = read in the code or DESIGN; **Guess** = not checked.

R8 left seven gaps open. The PM's rule: build what DESIGN already decided, plan what it did not. I sorted every gap by quoting DESIGN, and found it had decided more than R5 and R8 knew.

| R8 gap | What DESIGN says | So |
|---|---|---|
| 1 Auto captions | `DESIGN.md:2685`: "**Captions** | Type captions · Find speech · Style", from `FM.addCaptionLayer`, `FM.captionsEditor.mount`, `detectRow`; `:2701`: the caption track's tray; `:724`: "the Captions tool also sizes a new track to `R.trackEnd − R.main[0].start`, never to `P.duration`" | **Built.** |
| 3 One filter for the whole video | `:2688`: "**Look for all** | The Look panel with **Use on every clip** … it always acts on every clip" | **Built.** |
| 5 Text looks and animations | `:2700`: Text tray "Edit words · Style (with saved styles) · Animate (In / Out, the existing `textAnim` presets) · Effects · Duplicate · Stay put · 🗑" | **Built in part**: Style and Animate. Effects and Duplicate are not on a title's tray yet (below). |
| 9 Stickers, shapes | `:2683` and **D21 A, decided** (`:4141`): "Yes, under **Clips › Extras**, and what you drop in stays editable piece by piece": saved elements, shapes and templates, "reusing addmenu's Elements, Shape and Template tab contents … each pick running §12.2's insert command". `:2876`: a **sticker library** is "Later, one by one with his go-ahead" | Shapes, elements and templates: **decided, NOT built** (why below). A sticker *library*: new, a picture for him. |
| 10 Templates | D21 A (above) and `:2873` "Templates (fill your clips in): Core (existing)" | **Decided, NOT built** (below). |
| 6 Fill the frame (Backfill) | **Nothing.** `grep` for Backfill in DESIGN finds no line. | **New**: a picture for him. |
| 8 A music library | `:2876`: music library is "Later, one by one with his go-ahead" | **New**: a picture for him. |

## What was built (Verified)

| Piece | Where | What it does |
|---|---|---|
| **Captions** project tool | `js/simple-tools.js` (project row), `js/spine-edit.js` `S.planAddCaptions`, `S.cmd.addCaptions` | Adds a caption track sized to the clips (not the project), on top, and opens the editor on its first line, as Text does. One undo step. |
| The caption track's tray | `js/simple-tools.js` `trayFor` | **Edit lines, Find speech, Style, Stays with the sound, More, Delete** (DESIGN `:2701`). |
| **Find speech** | `S.planFindSpeech`, `S.cmd.findSpeech` | Runs Full's own detector (`FM.captions.detect`) over the project's sound; a clip whose file already says it has no audio is not decoded, one that turns out to have none is skipped (the P18 #1059 fix, written here so Full's code is untouched). One undo step; says "2 captions found · tap one to type". |
| **Look for all** project tool | `S.planLookAll`, `lookRow` | Opens a row: Done, None, every filter by name. One tap puts the same filter on every picture clip; another swaps it (never two); None takes **only that one** off and leaves a filter he put on himself. The project remembers which in `project.sm.look` (a plain string every build keeps, so no schema change). One undo step. Adopts first on an un-adopted project (look-class, DESIGN `:821`). |
| **Style** and **Animate** on a title | `S.planTextAnim`, `animRow` | Animate: Done and the twelve presets of Full's own Animate menu; one tap sets the preset (the same default object Full makes); look-class (a friend can be in). Style opens the More panel for now (below). |
| The tray draws again when a layer's kind changes | `js/simple-tools.js` (the tray's signature) | **A bug found on the way**: the new caption track's tray showed an overlay's tools (Into row, Crop…) until something else changed, because the tray was redrawn only when the clip's own fields changed. It now also redraws when the read model calls the layer something else. |

Tests (all `{ item: '980' }`, `simple P2.7 · S14a` to `S14d`, at 1280 and 380 and, for S14a, 320): S14a the Captions tool and tray; S14b Find speech (silent first clip skipped, undo); S14c Look for all (every clip, swap, None, his own filter kept, three undos restore the document byte for byte); S14d Style and Animate. Every one **red first** as written (the first runs failed on the tray bug and on a fixture that put the silent clip second) and **11 mutations CAUGHT** (`gaps-options/s14_mut.sh`; one survivor, "the silent clip is decoded", was a test that never reached the silent clip because the talking one came first; I reordered the fixture and it is CAUGHT).
Two existing P2.2 tray tests assumed a title has four tools on one row; a title now has six (two rows of three on a PC, DESIGN's own rule for more than five). I changed their expectation and kept their one-row case by selecting two titles (Stay put and Delete).
Slice, `?only=simple P`: **164 of 167 at 1280 and at 380**; the 3 finger tests NOT RUN headless and **passing with real touch**.

## What is NOT built, and why (the honest part)

**Clips › Extras (shapes, saved elements, templates; D21 A, decided).** The decision is clear; the build is a release of its own. Read:
- Full's insert routes do not know Simple: `FM.elements.insert(eid)` (`js/storage.js:3701`) puts the pack's layers at index 0, moves them to the playhead and commits and autosaves itself; `FM.templates.insertInto` (`:3346`) does the same and also adds a pack's camera. DESIGN `§12.2` (`:3722-3745`) wants the insert to strip `sm.main`, drop the camera, place each unit by the side-aware bands, wrap two or more same-start visual layers in an `sm.unit` moves-together group, and, for a **template**, splice the pack's main units at the nearest cut **with ripple and the cue map**, writing `sm.main` back on them. That is the Insert plan (§3.6) plus a pack reader.
- Full has no function that makes a group from code (`groupSelection` is internal to `js/app.js`, at `:3990-4090`, with toasts and its own commit), so the `sm.unit` wrapper needs a Simple-owned one.
- The picker: `FM.addMenu.render(container, opts)` has no `tabs` filter (it only has a `_tabs()` seam, `js/addmenu.js:971`); DESIGN's "through the §14.2 `tabs` option" means a small change to Full's menu code, which must come with a Full-unchanged proof.
- **My estimate (Guess):** shapes alone are a day (one layer, no group); saved elements two to three; templates the rest of a week, because of the splice. I did not start them half-way: a half-built insert that skips the bands or the unit wrapper is exactly what DESIGN `§0.4` forbids.
So it waits **for the PM to schedule release 2.8b**: shapes, then elements, then templates, each red-first.

**Text tray: Effects and Duplicate** (DESIGN `:2700`): Duplicate of a title is `S.cmd.duplicate` for a main clip only today; Effects needs the effects browser's "simple target mode" (`:2689`), which is the **Effects** project tool, not built. Both wait with Effects.

**Style with saved styles**: Style opens the More panel (Full's inspector for the title) because `FM.textEdit` has no entry that opens its Aa sheet directly; DESIGN's "Style panel with saved styles" is that sheet. A new `FM.textEdit.openStyle(id)` is a small change in Full's file (also needing a Full-unchanged proof). Until then the tool is honest about opening More.

**Look for all shows names, not thumbnails.** Full's Filters tab draws a small picture per filter (`FM.filters`'s `mountFilter`); the row is text only, so it is quick but anonymous ("Teal & Orange" tells less than a picture). A picture row is the obvious next step; I did not measure its cost on a phone (**Guess**: twelve small canvases per open).

## For Ezra: three new gaps, three pictures each (the app itself, 380 px; A and B and C differ only in what the button does)

### Fill the frame (`gaps-options/sheet-fill.jpg`)
A 16:9 clip in a 9:16 video leaves black bars (the first picture, "Today"). Full already has an effect for exactly this, **Backfill**: a blurred, dimmed copy of the clip behind it (`js/compositor.js:1393`). The pictures are real renders with that effect on; only the control differs (mocked).
- **A, recommended: a Fill tool on the clip's tray**, next to Crop; lit while on. Per clip, so a mixed project can have some and not others; one tap, one undo; builds on the same effect Full has, so a Simple project opened in Full shows it as an ordinary Backfill effect.
- **B: one project switch under ⚙ Canvas** ("Empty edges: Black or Blurred picture"). One decision for the whole video; less to find, but no per-clip choice and nothing on the clip to say it is on.
- **C: always on, no control.** Nothing to learn, but it changes every project's look for everyone, including projects that want black.

### Stickers (`gaps-options/sheet-stickers.jpg`)
DESIGN already puts **shapes, saved elements and templates** under Clips › Extras (D21 A, not built, above). What is not decided is a **sticker library** (emoji, arrows, speech bubbles): DESIGN `:2876` says "Later, with his go-ahead". The question is where it would live.
- **A, recommended: the Overlay tool offers it**: Overlay today asks the phone for a photo or video only; it would offer "Photo or video / Stickers and shapes / Emoji". One door for "something on top of the picture".
- **B: only under Clips › Extras**, next to shapes, elements and templates (D21). One place for everything you drop in, but it is two taps deep.
- **C: a Stickers tool** on the project row: the fastest to find, and a seventh tool in a row that is already six at 380 px.
(Content is the real cost for any of them: a sticker set to ship, with a licence; I have not chosen one.)

### Music library (`gaps-options/sheet-music.jpg`)
Sound offers music from his own files, sound effects and a voice recording. CapCut's biggest draw is a library of free tracks. This is a **content and licence decision**, not code.
- **A: a library in Sound**: tracks bundled with the app. Fastest for him; needs a pack of tracks and a licence that allows bundling, and adds megabytes to every device. (I would not pick it before there is a pack.)
- **B, recommended: "Find free music online ↗"**: opens a trusted free-music site in the browser; he downloads a track and adds it with "Music from your files". Nothing shipped, no licence to hold, a clear path that works today. The cost: one trip out of the app.
- **C: "Recent songs"**: what he has already added, no new content (the media library already keeps recent media, `FM.mediaLib`). Not a library, but it makes the second video quicker.

## Order to build the rest
1. **Fill tool** (A): small, one tool and one planner; the effect exists. 2. **Overlay offers stickers**, only after a sticker set is chosen. 3. **Extras** as release 2.8b: shapes, elements, templates. 4. **Look thumbnails**, **Style panel**, Effects on titles. 5. The music link (B) is one menu row.

## Limits
Nothing here was walked on a phone; the tests are the suite at 1280 and 380 plus the three finger tests. The pictures are the real app with a mock control where the control does not exist yet, drawn at 380 px; the A, B and C labels are mine.
