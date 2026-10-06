# Plans for the next 5 oldest open items (P4)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed, nothing run in a browser. Written under the PM's quality rule: each claim below was traced in the code, and where I could not trace one I say "guess". Shorter on purpose.
**Verified** = I read the line.

## Which five

After #860 (the last item in P3), skipping the standing instructions (#862 to #882, #912, #956), #921 and #967 (live collaboration, each with its own design), #923 and #980 (Simple mode), and every `(hunt …)` item: **#920, #929, #948, #954, #964**. (#982, #985, #987 follow.)

**Read this first: all five are built or drawn and are waiting on Ezra, not on code.** So the honest plan for each is: what is left, exactly what to do the moment he answers, and what to leave alone. Nothing here is a new feature.

---

## A. #920 The faded bar at the top (iPhone)

**His clauses (v17.07 list).** The fade at the top is gone for good; it stops being intermittent; in light mode the top is white all the way up, never black; going in and out of projects does not change it. **His standing rule: do NOT ask him for screenshots.**

**State (verified).** Fix A is built: an invisible top-edge tab `#fm-sb-tab`, created at `js/statusbar.js:79-84`, re-inserted on every screen switch so iOS re-samples it (the researched cause: WebKit takes the top colour from the first full-screen fixed layer and re-samples only when a fixed element is added or removed). Tests: `tests/tests.js:74565`, `:74602`, `:87593`, `:103182`. It cannot be seen here: there is no iOS runtime, and the entry says so.

**Plan.**
1. **Build nothing.** The only open step is his look at the phone (light Home, dark Home, inside a project, going in and out).
2. **If it is still wrong, the next steps, in order:** (a) check the service worker did not serve an older shell (`sw.js` writes a "served-stale-shell" note the page reads on boot); (b) re-read the order of the tab insert versus the screen-class change in `js/statusbar.js`, since the entry's own research says iOS keeps the first sampled layer; (c) only then a new hypothesis.
3. **Optional, additive:** a line in Settings (beside "Your last scrub") saying whether the tab exists, its colour, how many times it was re-inserted and whether the app is installed. It says what the **page offered**, not what iOS drew, so it can rule out our side but cannot confirm his screen. **Guess:** low value; do only if (1) fails.

**Risk.** Anything that adds a fixed element can itself trigger a re-sample (the whole mechanism): a test should assert the count of fixed elements at the top edge stays one.
**Needs pictures:** no.

---

## B. #929 The heart is wrong; the people were redone

**His clauses.** (1) People "still bad": done, the airport-sign pair, v17.02 (tests `tests/tests.js:100688`, `:100700`). (2) The heart's icon in the picker does not look like the heart you get. (3) The heart's outline "bulges out near the bottom" with odd lines.

**State (verified).** The picker icon is a hard-coded path generated from the shipped geometry (`js/addmenu.js:353`, with the comment "Regenerate this the same way if S.heart moves again") and the 2D heart is `S.heart` in the shape table (`S.heart` at `js/compositor.js:15530`, eight points with manual tangents, explained in the comment above it from `:15504`). Pictures of options were sent 25 and 26 Sep; **the heart is the only line still open**: his pick of A (today's heart with the bulge fixed, recommended), B (Google's) or C (textbook), and whether the tile is outline (recommended) or filled.

**Plan, per pick.**
- **A:** move the two lower-flank anchors (the "knee" the entry names) in `S.heart`, then regenerate the tile path with the same procedure the `addmenu.js` comment describes (`FM.traceShapePath` into a recording proxy over a 19×19 box in the 24 viewBox), so tile and shape come from one source.
- **B or C:** replace the eight-point table and regenerate the tile the same way.
- **Do not hand-draw the tile** (that is how it stopped matching: the comment records an earlier tile that "had stopped being true").
- Note `heart3d` (`js/compositor.js:1075`, `heartPts` `:12153`) is a separate 3D solid; it only needs checking if the 2D outline changes.

**Test.** A test that renders the tile path and the shape at the same size and asserts the overlap above 0.99 (the comment's own method reports 0.9975), and that the outline has no concave bulge below the waist (sample the contour). Must fail on HEAD for the bulge.

**Risk.** Saved projects keep the old heart's points only if they were edited (shape table is for new shapes); **guess**: I did not check how an already-placed, un-edited heart is stored. Check before changing the table.
**Needs pictures:** already sent; wait for the pick.

---

## C. #948 Templates and Elements: a proper + menu, and not reskinned projects

**His clauses.** (1) The + on the Templates and Elements tabs opens "a proper, thought-out menu", not the tiny one. (2) Elements and templates should "be their own things, not just reskinned projects": list what is still project-shaped. (3) Show options first.

**State (verified).** Three menus (A one card with shape chips and a row of his projects, recommended; B two big picture tiles; C a bottom sheet) and the clause-2 list were sent 26 Sep (`tools/design/948-options.html`, `tools/design/948/`). Today: on Templates the + opens a plain project picker, "Save which project as a template?" (`js/home.js:2345-2353`); on Elements it opens a small context menu with "Build a new one…" and "From an existing project…" (`:2360-2380`). "Build a new one…" creates a hidden project (`elementDraft: true`, transparent 1080×1080) and tells him "Build it, then Home → this project's ⋯ → Save as element…" (`:2366-2371`): it is an element only after a second, separate step.

**Plan.** Waiting on his A, B or C and on which of the three fixes in the entry's list he wants (each becomes its own entry). Once he picks: build the menu in `newFromTab` (`js/home.js:2345`), keep every existing path reachable from it, and add a test per entry on the menu's labels and on each action reaching the same function it reaches today. The "element is a draft until Save as element" fix (the entry's fix 2) is the one that changes behaviour: it should save on leaving, as editing an existing element already does (the entry says so; I did not re-read that path).

**Risks.** The + is also the New project button on the Projects tab (`index.html` `#hm-new`, `js/home.js:2554`), so a new menu must not change that tab. Changing what "Home" does when leaving a draft touches `commitDraft` (`js/home.js:3379-3387`): lose-work risk, needs its own test.
**Needs pictures:** sent; wait.

---

## D. #954 Rename every effect away from Alight Motion, and reorder the categories

**His clause (1 Sep).** "i want every effect to be named different to what it is in alight motion and also have different ordering to avoid getting taken down…"

**State (verified).** `tools/design/954-effect-names.md` lists all 206 effects in three groups: **40** distinctly Alight Motion names with a proposed new name each, **70** generic craft names (Gaussian Blur, Brightness, Contrast…; recommend keeping), **96** not found in either list. (40 + 70 + 96 = 206.) Its sources are PARITY.md and a third-party list, so "ours" means "not in either list", not proven original. The category order is not in any source. Sent 26 Sep; waiting on his three answers (the 40, the 70, the order).

**Plan, once he answers.**
1. **Labels only.** Every effect keeps its type id; saved projects reference ids (the file's own warning, `BEFORE-PUBLISHING.md`). The change is the `label:` string in each `FM.EFFECTS` row (`js/compositor.js`, rows from `:50`).
2. **Size it honestly:** the 40 current labels appear about **190 times in `tests/tests.js` and 118 in `js/`** (string matches, which include comments, so an upper bound; the worst are Glow Scan 30 test mentions, Edge Glow 17, Gradient Overlay 15, Lightning 12). Plus the 20 tutorials, which cite exact labels (for example tutorials 03 and 07). Do it as one release with a script that rewrites test strings and a test that asserts no old label remains in user-visible strings.
3. **Do the order last and separately.** It is a change to how the effect browser is arranged, not a label.
4. **Do not rename the 70 generic names** unless he says so: his own file argues those are the craft's words.

**Risks.** A search box that matches by name (the effect browser) loses the old name; add the old names as search aliases so people who know them still find them (**guess**: the browser has a place for this; I did not look). Legal advice is not something this file can give; BEFORE-PUBLISHING.md says to get a qualified opinion if it matters commercially.
**Needs pictures:** the sheet was sent.

---

## E. #964 The empty-project tap area

**His clauses.** The blue outline misses the top edge and gets stuck; a far better, colourful tap animation across the whole area; the outline pulses round the edge and goes away.

**State (verified).** All built. After his answer "make them all happen, just random" (#974) the app ships **three colour animations and two outline starts and picks one at random on every press**: `FM.variant('emptytap.start', ['bottom','nearest'])` (`js/timeline.js:3063`) and `FM.variant('emptytap.colour', ['A','B','C'])` (`:3130`), with `pressAurora` (`:3141`), `pressRings` (`:3174`) and the Key ripple. The menu opens straight away (#981). Tests: `tests/tests.js:108096` to `:108418`. The only thing left is which he likes.

**Plan.** Build nothing until he says. When he does: delete the two losing colour functions and their `FM.variant` call, delete the losing outline start, delete the tests that name them (`:108360`, `:108418` and the siblings for the others), and keep the `FM.variant` log for the next time he wants to compare.
**Do now (small, safe):** make it easy for him to answer: the entry says the log exists (`FM.variant.log()`), so a one-line Settings readout "last tap used: Aurora, bottom" would let him name the one he liked without describing it (`FM.variant.log` is `js/variant.js:65`; the readout is not built).

**Risk.** Deleting the wrong variants. The log is the guard: name the winner from the log, not from memory.
**Needs pictures:** no (he has seen all three in the app).

---

## What this means for the builder

Nothing in A, C, D or E should be built before Ezra answers (his rule, #545). B needs only his heart pick; the regeneration step is the safe, mechanical part. The single thing that would change the most is getting his answers: a short sheet asking **#929 heart pick and tile style, #948 menu A/B/C and fixes, #954 the three answers, #964 which tap colour, #920 "is the top still wrong?"** covers all five.

## Verified vs guess

Verified: all `file:line` references above, the 40/70/96 counts, the test names, the string-match counts (computed with a script). Guess: how an un-edited saved heart is stored (B), whether the effect browser has an alias slot (D), whether a Settings readout for the tap variant is worth building (E), and anything about how iOS draws the status bar (A).
