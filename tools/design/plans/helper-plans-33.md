# Plans for the next five after P32 (P33): #855, #856 (clause 3), #860, #862, #870

Against `origin/main` 0896fbf4 (v17.35). **Measured** = I ran it here, **Read** = read the code or the entry, **Guess** = not checked. Nothing here is built; the first three need a plan, the last two are standing notes and say what enforces them.

## #855 "What do you want to do?" tutorial (HELD for launch, by his words)
**State (Read).** The Tutorials tab is a placeholder: `js/home.js:2601-2605` draws "Tutorials are coming". Six clauses, all unticked. He asked for it to wait so tutorials are written once, against a finished UI, and not redone "because it'll be a pain in the butt to move something around and then have to go redo all the tutorials". **That fear is the design problem, and it has a structural answer.**

**Plan (ready to build when he lifts the hold).**
1. **A tutorial is data, and every step names its target by selector.** `{ id, title, words: [...], steps: [ { say, target: '#btn-add-layer', done: 'layer-added' } ] }` in one file (`js/tutorials-data.js`). Pop-ups and a spotlight read it; nothing about the UI is copied into prose.
2. **The guard that answers his fear: one suite test walks every step's `target` at 380 and 1280 and fails when a selector no longer resolves or is hidden.** Move a button and the suite names the tutorial and step that now points at nothing, so a tutorial cannot rot silently. That is the "structural, not remembered" rule applied to his own reason for waiting.
3. **"Understand whatever is typed, or preferably never fail" without a key (clause 6, his preference):** a deterministic matcher over each tutorial's `words` plus the names and one-line descriptions already in `js/fx-registry.js` (`shake: 'Handheld camera shake, with optional zoom and twist.'`, category label `'Shakes / Movement'`, `fx-registry.js:364,133`). Lower-case, split into tokens, drop stop words, score by overlap with a small synonym table ("shake out" to `shake` plus an out-transition). **It never answers "I do not understand": a score below the cut shows the three best guesses plus the suggestion list (clause 4).** That satisfies "preferably never" by construction.
4. **Suggestions (clause 4):** the five highest-use tutorials, fixed in the data file.
5. **Completion (`done`)** reads FM events that already exist (history commit, selection), not screenshots.
- **First slice to build:** the data file with two tutorials ("a shake and shake-out transition", "add text"), the matcher, the spotlight overlay, and the walk-every-selector test. About one release; the overlay is the only new UI.
- **Callers traced (Read):** `home.js` Tutorials tab (the only entry), `BEFORE-PUBLISHING.md:184` ("a *library* for later reference material"), nothing else mentions tutorials in `js/`.
- **Risk (Guess):** a spotlight over a collapsing sheet on a phone needs the target scrolled into view first; the selector test cannot see that, so each tutorial needs one real-phone pass.

## #856 clause 3: "later, pro unlocks our own inbuilt but hidden API keys"
**State (Read).** Clauses 1 and 2 shipped (v16.23, `js/ai-chat.js`, key in `js/ai-key.js`, same `FM.aiKey` as the Director). Clause 3 waits on his A, B or C. **My recommendation is A, and I would push back on his idea as stated: a key inside a browser app cannot be hidden.** `ai-key.js` shows the model: the key goes into an `x-api-key` header from the page, so anything we ship would be readable in the network tab and billed to us. "Hidden" needs a server of ours, and that ends "nothing leaves the device".

**One thing worth building that does not wait on his answer (Read).** With no key the Assistant is a dead end: `js/ai-chat.js:166-174` prints "Connect your Anthropic key first" and stops, while the Director has a no-key floor (`js/ai.js:163`: `FM.aiTemplates.build(chips)`). The matcher in #855 step 3 could be that floor for the Assistant: "make it bigger", "make it gold" and "add a shake" are a closed vocabulary (`js/ai-manifest.js` lists the operations, `js/ai-ops.js` runs them). That is also his stated preference in #855 ("preferably in the app, no key"), and it means one build serves both items.
- **Not built, and the reason:** it is a design choice for him (the free tier gets a weaker Assistant than the keyed one, and he has a worry about hallucination that the matcher avoids).

## #860 durability stress test and "the icons that do not display"
**State (Read).** Seven clauses ticked: PC layout handles, 19 states with 0 faults, a permanent guard (suite test `860`), four rounds with 1 real fault in about 30 hostile sequences. **Open: clause 6, "a screenshot of an icon not displaying".** Two passes could not find it, and he has reported it more than once.

**What I checked (Measured).**
- **Emoji icons (Read, counted):** `emoji:` appears 4 times in `js/addmenu.js` and nowhere else in `js/`; the add menu does not lean on the emoji font.
- **Text-glyph icons on the home screen (Measured, Linux Chromium, `helper-plans-33-scripts/glyph-probe.js`):** 3 glyph buttons (`−`, `✎`, `↑`), and **none** measures as the missing-glyph box (the probe compares a glyph's canvas width with U+FFFF's in the app's font). That says nothing about his Windows laptop, which is where I think the bug is.

**Plan, so he does not have to send a screenshot (Guess on the cause, buildable).**
1. **One tap in Settings → Labs, like "Test connection": "Check my icons".** It walks the open page for short text buttons (the probe above, also run inside an open project), runs the same width test on his device's real fonts, and lists any glyph the device cannot draw, with a Copy button. His next report becomes a pasted list of code points instead of a picture.
2. **If it names a glyph, the fix is mechanical:** replace that glyph by an inline SVG (the app already uses SVG icons everywhere else), plus a suite test that no short button text uses a code point outside a short allow-list.
- **Why not just replace every glyph now:** there are 68 distinct symbol code points in `js/` and `index.html`, but 14,000 of the 19,000 uses are `═` in comments (Measured by a scan). Which ones reach a button is exactly what the probe answers.

## #862 standing: keep the loop running, miss nothing, review pass before anything visual ships
**Net (Read):** a note, 2 of 3 clauses ticked. Enforced: the loop by `LOOP.md` rule 8b and the first-message steps in `CLAUDE.md`; "miss nothing" by the INBOX gate in `tools/next.sh:25-45` and the verbatim rule. **Not enforced by anything: clause 3, "anything visual gets a review pass before he sees it".** That is the AU-style independent review he valued on #853 and #858, and no gate checks it. A cheap structural option: `ship.sh` refuses a POLISH-LOG line for a release that changes `styles.css` or `inspector.js` unless the line carries `REVIEWED: <who>`; it is a one-line gate in the style of the `UNPROVABLE:` escape. Not built; it is his call whether he wants a gate on that.

## #870 standing: the ChatGPT/Codex takeover brief
**Net (Read):** a receipt, nothing to build. The entry already records the outcome (Codex shipped nothing; the queue sat where v16.17 left it). Every clause is a rule elsewhere. **One stale fact to be aware of:** the tree now holds ChatGPT's verified pile (`#1068`, batches B1 to B8), so "Codex shipped nothing" is true of 12 Sep only.

## Summary
| # | closes when | build size |
|---|---|---|
| 855 | he lifts the hold; first slice is the data file, matcher, spotlight, walk-every-selector test | about 1 release |
| 856 c3 | he answers A (recommended), B or C; the no-key floor is buildable now | small |
| 860 | "Check my icons" lands and he runs it once on the laptop | small |
| 862 | ticking clause 3 or declaring it a method; optional gate | tiny |
| 870 | nothing | none |
