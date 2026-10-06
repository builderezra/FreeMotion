# Plans for the next 5 oldest open items (P3)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed, nothing run in a browser.
**Verified** = I read the line. **Guess** = needs a device or a person.

## Which five

Continuing after P2 (#482, #508, #619, #663, #676). Next real items in `tools/next.sh` order, skipping #677 (covered by `export-no-sound.md`), #706 (the same report as #676, planned in P2), the standing instructions (#690, #694, #702, #703, #708, #713, #777, #778 and others), `(hunt …)` items such as #845, and #855 (held for before launch):

| # | Item | REQUESTS.md line | State |
|---|---|---|---|
| A | #692 every pixel effect walks the whole frame | 27448 | 7 rounds shipped, waits on "still laggy?" |
| B | #768 scrubbing with a layer selected is jumpy (phone) | 29056 | instrument built, waits on his paste |
| C | #775 go through the PC menus and fix what behaves weirdly | 29136 | clause 1 done, clause 2 partly fixed by #979 |
| D | #856 an AI you can TALK TO | 30435 | clauses 1 and 2 shipped, clause 3 is his decision |
| E | #860 durability testing, icons that do not display | 30721 | three passes found one fault, waits on a screenshot |

---

## A. #692 Every pixel effect walks the whole frame

**His clause (via the entry title).** The lag has a measured cause: every pixel effect walks the whole frame no matter how small the layer is.

**State (read in the entry; machinery verified).** Seven rounds shipped. 13+ kernels are bounded (`BOUNDED_FX`, `js/compositor.js:4131`), six more take a cropped readback (`CROP_BOUNDED_FX`, `:4322`, `cropBoundedWanted` `:4364`), found by `fxBoundsScan` (`:4199`). What is left "by design": 47 kernels whose picture genuinely covers the frame (a grid, a noise field), and seven plate-relative ones. The entry's own struck-out item 2 describes the one structural fix not done: size the nested plate to the layer's bounds instead of the whole target canvas (`nestedPlate`, `js/compositor.js:3960`), which would fix every kernel at once but "touches the most critical path in the app".

**Plan.**
1. **Do not build the plate-size change blind.** Measure first what the 47 are worth: a script (the suite already has the harness, see the round-3 measurement in the entry) that renders each of the 105 `PIXEL_FX` kernels at defaults on a 180×150 layer in a 1080×1920 plate and lists the cost over 8 ms. Anything cheap stays as is.
2. **Rank by use, not by cost.** Take the top 10 effects people actually apply (the project files in his own library, or the effect-browser pick counts if they are stored) and bound or crop only those that cost over a frame.
3. **Then, only if more than a few remain slow,** do the structural change behind a switch: `nestedPlate` sized from `fxBoundsScan` with a margin per kernel, off by default, on in a test build, and compared byte for byte against today's path for every kernel (the same 60-fixture proof the entry used, with its control that the comparison can see a difference).

**Risks.** Kernels that write colour under zero alpha (Inner Blur, the entry's own finding) change what the next effect reads if bounded; geometry relative to the frame (Letterbox, Border) breaks if the plate shrinks. Both are why rounds 3 and 7 reverted or excluded them.

**Test.** The existing byte-identity fixtures plus a timing assertion at a fixed throttle using `__fmWantCpu` (`tests/_cdp.py:251`). Must fail against HEAD for any newly bounded kernel.

**Needs pictures first:** no.

---

## B. #768 Scrubbing with a layer selected is jumpy (phone)

**His clause (verbatim).** "Scrubbing when you have a layer selected mobile is jumpy and not smooth."

**State (verified).** Three probes on the Mac found it smooth (median 16.7 ms, worst 18.5 ms, 0 of 40 over 33 ms). The device instrument is built: scrubs record frames with what was selected and which panel was open (`js/timeline.js:4158` writes `fm.lastScrubReport`; Settings shows "Your last scrub", `js/settings.js:973`). Test `tests/tests.js:76417`. #934 fixed two real-finger faults (swipe from a keyframe diamond, and a flick stopping on lift).

**What I found in the per-frame path (from the H6 hunt, `phone-perf.md`).** A layer being selected adds work to every scrub frame that nothing else costs: `canvasEdit.update()` runs on every render with a forced layout (`js/canvas-edit.js:862-945`, `placeRotKnob` reads three `getBoundingClientRect`s after writing the box styles), `syncTransform` and `syncPlayhead` run on every `updateReadout` (`js/app.js:720-768`), and `refreshEasing` can redraw the curve canvas. With nothing selected, `canvasEdit.update()` returns early at `if (!g)` (`js/canvas-edit.js:869`), so this whole cost is **selection-only**, which matches his symptom exactly. **Guess:** it is the forced layout, because layout is what a phone is slowest at; the Mac probe was too fast to show it.

**Plan.**
1. Apply the H6 items 3 and 4 (skip `placeRotKnob` when the box geometry has not changed; during a scrub, update only the timecode text and defer the inspector sync to the end of the gesture).
2. Re-measure on the Mac under 6x CPU throttle with a layer selected (`__fmWantCpu`), before and after. That is the missing evidence: the three probes were unthrottled.
3. Keep the instrument; ask him once whether it still feels jumpy.

**Risks.** The inspector must still show live values while scrubbing animated properties (the reason `syncTransform` is in the path); throttle it to 100 ms rather than removing it.

**Test.** Spy `Element.prototype.getBoundingClientRect` during a 30-step scrub with a layer selected: count today is at least 3 per frame, target 0 for an unchanged box. Must fail on HEAD.

**Needs pictures first:** no.

---

## C. #775 Go through the PC menus and fix what behaves weirdly

**His clauses (the entry's own list).** 1 go through the menus and see when they behave weirdly [done 4 Sep]; 2 the PC timeline / add-menu separation "still does have a lot of issues — dropping"; 3 the effects browser "bugs out"; 4 switching from effects to filters "on PC and on mobile"; 5 re-test everything.

**State (verified).** The one real finding (the transport row's buttons slid under the version label, Back and Help below 1050 px) was drawn as options A, B, C and then **fixed a different way**: #979 made every control take its own click from 701 px, with a test (`tests/tests.js:110287`). The entry's 30 Sep note says to re-measure at 900 px and strike the block if nothing overlaps. **There is no test tagged 775 at all** (searched `item: '775'`). The clause-1 sweep (130 random actions, 19 menus) lives only as a description in the entry.

**Plan.**
1. **Close the narrow-row half now:** re-measure at 860, 900, 950, 1000 px with a real click at every button's centre (the test at `:110287` does this from 701 px; confirm it covers 701 to 1226), then strike the pick-A/B/C ask. Small.
2. **Turn the clause-1 sweep into a permanent test with a fixed seed.** 130 interleaved actions across the menus (add panel, layer actions, options, canvas dialog, Notes, view options, effects browser, inspector categories), checking after each: no console error, no orphan menu, the inspector not blank, no body class leaked, no timeline row lost. The entry lists these invariants exactly, so it is a transcription, not a design. Run it at 1280 and 380.
3. **Clauses 2, 3, 4 (separation, effects browser, effects to filters):** the 4 Sep run found nothing in (a) to (d). Rather than hunt again by hand, add a second seeded sweep that only interleaves the effects browser and the Visual / Filters / Audio tabs 200 times at both widths, asserting the tab you land on is the tab you tapped and the browser's category matches.
4. Ask him for **one specific misbehaviour**, because two rounds found none: "which menu, what did you tap, what did you see". The same pattern as #860.

**Risks.** Random sweeps can be flaky; a fixed seed and a step log on failure keep them diagnosable. Synthetic pointer limits (the entry's own warnings about `setPointerCapture`) mean some drags cannot be driven; leave those out and say so.

**Test.** Is the deliverable. Each sweep must fail if a known past bug is put back (use one of the repo's reverted fixes as the control, as `mutate.sh` would).

**Needs pictures first:** no (the A/B/C row picture was already sent and the issue was solved without it).

---

## D. #856 An AI you can TALK TO

**His clauses.** (1) the AI becomes something you talk to and it edits for you, (2) your own API key for now, (3) later "when you pay for the pro version it'll unlock an API key for you to use … inbuilt but hidden".

**State (verified).** Clauses 1 and 2 shipped in v16.23: `js/ai-chat.js` (404 lines), a key store `js/ai-key.js`, a spend guard `js/ai-budget.js` (38 lines). The entry says clause 3 **cannot be built as described**: a key shipped inside a no-backend app is readable in the source and in the network call. Three options, A (local-only, bring your own key; recommended), B (our server proxies), C (hold until after launch); the entry is waiting on one letter.

**What is buildable now regardless (not yet done).**
1. **"Talk" literally.** There is no speech input: no `SpeechRecognition` anywhere in `js/` (searched). Add a microphone button to the chat that fills the box using the browser's speech recognition where it exists, hidden where it does not. **Guess:** works in Chrome and Safari today, not Firefox; needs a real phone check. Cost: one button, about 60 lines. It makes "talk to it" true.
2. **Key safety.** `js/ai-key.js:17` reads the remembered key from `localStorage` in plain text at load (the comment at the top says in-memory by default, but the read happens whenever it was remembered). That is the same plaintext-storage finding as `collab-security.md` F7. Smallest fix: keep "remember" but say it plainly next to the tick box, and offer a "Forget key" button in the same place. No encryption helps here (the key must be readable by the page).
3. **Cost guard visibility.** `js/ai-budget.js` exists; surface the running cost in the chat header so a first-time user sees it.

**Risks.** Speech recognition on iOS asks for microphone permission and may send audio to the browser vendor; say so in the button's first-use text (privacy statement consistent with the app's "nothing leaves the device" line, which is not true for the AI chat and should not be claimed there).

**Test.** Stub `SpeechRecognition`; assert a result fills the box and sends nothing until Send is tapped. Assert "Forget key" removes `fm.anthropic.key`.

**Needs pictures first:** yes for the mic button's place and look (a small row beside the text box). Clause 3 needs his A, B or C.

---

## E. #860 Durability testing, and icons that do not display

**His clause (verbatim).** "durability test the oven … see where you can break things … the icons don't display properly."

**State (verified).** Three passes: handles at four sizes, 37 icons, 19 states, about 30 hostile sequences. One real fault found (#905, fixed). A permanent guard exists: test `860` (`tests/tests.js:74493`, "no icon on screen is missing its ink, in any state the suite can drive"). The open ask is one screenshot of an icon that fails to display.

**Plan (so the screenshot is not needed).** The suite can only see icons in states it can drive. His device is the one place a missing icon happens. So move the guard onto his device:
1. A small run-time check (same ink test as `860`) that runs once, 3 seconds after each screen change (Home, project open, Add menu open) and writes, for any icon with no ink, its element id, class and the app version into `fm.lastIconReport`, shown in Settings next to "Your last scrub" with Copy. Cost: one pass over the icons, off the render path.
2. If `fm.lastIconReport` is ever non-empty, it names the icon and the state. That turns "icons don't display properly" into a line he can paste, with no screenshot.
3. Meanwhile ask him once, in his own words, which screen.

**Guess:** his missing icons may not be missing ink at all; a font fallback (a text glyph such as the ◆ or ⧉ buttons, which are characters, not SVG: `js/graph-editor.js:515`, `js/graph-editor.js:524` use `textContent`) could render as a box on a device without that glyph. Check the characters in use on his iPhone first: ◆ ⧉ ⇥ ↻ ‹ ✦ are the likely suspects. The suite's check cannot see a missing glyph because a text node is not an icon.

**Risks.** The run-time check must never throw into the page; wrap and swallow.

**Test.** Blank an icon in a test page, run the check, assert the report names it (the control that the 860 test already uses).

**Needs pictures first:** no.

---

## Order I would build them in

1. E steps 1-2 (it also catches the font-glyph guess). 2. B (shares the H6 fix). 3. C step 1 and 2 (turn the sweep into a test). 4. D step 1 (the mic) after a picture. 5. A last, and only the measurement step until it says more is needed.

## Verified vs guess

Verified: every `file:line`, the state of each entry, the absence of `SpeechRecognition` and of a 775 test. Guess: that the forced layout is what makes #768 jumpy on his phone, that glyph fallback explains the missing icons, browser support for speech input, and anything about his device.
