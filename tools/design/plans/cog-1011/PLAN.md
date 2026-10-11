# The ⚙ cog redesign: plan (PM, 11 Oct 2026)

His words, verbatim, ~11:00 AWST, with his v17.37 screenshot of the cog open inside "Project 8":

> In this menu move the app settings button to be its own button like how friends and simple edit are.
> Change the simple edit what should I use? Button to just be the same expand button as the others.
> And where it says simple and full to switch when you haven't expanded yet should just have icons so it feels less cluttered.
> When canvas settings is expanded get rid of the button to access app settings.
> Also when you first open the settings cog to see all of those menus they should all be closed so it isn't overwhelming, and you should be able to tap on the current open one to close it

Research: workflow wf_f58d5a5a-4f7 (code reader, history reader, planner), read-only, against v17.37 (d55cabc8). Line numbers are v17.37 lines. The full research is in research.json beside this file.

## Decided by the PM (obvious yeses under his 11 Oct rule; do not re-ask)

- "When you first open" means EVERY open of the cog, because his reason is "so it isn't overwhelming". Other doors keep their block: person+ / people chip / LIVE / Home Share live open Friends, and the oversize warning opens Canvas.
- Simple/Full icons are option **A**, the D16 A pair he already picked (kit.js 'quick' and 'full'). No new icon pick for him.
- The App settings bar ends in an "opens elsewhere" arrow, not ⤢, because it never grows. It sits LAST (furthest from the cog).
- The PC all-closed arrangement is **P1**: one column off the cog, Canvas nearest.
- Unapplied Canvas picks survive collapse and re-expand (a small dot on the Canvas bar). Closing the whole cog still discards them, as today.
- #cv-mini-app is removed, because the new bar covers it in every state.
- He sees ONE picture of the result before it ships (#545), not a choice sheet.

## Per clause

### 1. "In this menu move the app settings button to be its own button like how friends and simple edit are."

**Build.** Add a fourth block, #cv-app. Its small form is a bar shaped like the Friends and Editor bars: 64px tall on the phone, a 2px border, the same radius. The bar is ONE <button id="cv-app-bar" class="cv-mini cv-app-bar">. It holds:
- the app's own gear SVG, copied from #btn-settings at index.html:325;
- the word 'App settings', so the visible text still starts 'App settings' and test 967 B2 6 keeps passing;
- a 38px round end button in the .cv-mini-exp slot, drawn as an 'opens elsewhere' arrow (a chevron, or arrow-out-of-box) and not ⤢, because this block never grows. The sheet shows both glyphs (see the render brief). Recommended: the arrow.

Tapping it does exactly what #cv-appset does today (js/app.js:7159-7165): cvClose(), then FM.settings.open(). There is no return trip to the cog, as today. Closing Settings could reopen the cog via openAt(…,{onClose}), but that is unknown and not asked for, so leave it out.

Placement on the phone is order 2: the LAST bar, below the Canvas card. Order becomes Editor (-2), Friends (-1), Canvas (0), App settings (2). It is the one bar that leaves the cog, so it sits furthest from it. With a block open it stays a bar under that block.

Also:
- Remove #cv-mini-app (index.html:1037, js/app.js:7166-7171, styles.css:3676-3681). It existed only to keep Settings reachable while Friends was open (v17.08, J3-9), and the new bar does that in every state. This is an obvious yes under his 11 Oct rule.
- Add #cv-app (and the missing #cv-editor) to theme-glass.css next to .export-card/#cv-friends (lines 80-81, 511-512).

Room on the phone: a fourth bar takes 76px from the open block's cap, which becomes 100svh-336. That leaves about 331px at 380×667, 232px at 320×568 and 217px at 375×553. The open Canvas card scrolls inside that with its sticky Cancel/Apply. On screens under 600svh tall the App settings bar alone may drop to 48px. Whether that is needed is unknown until measured; measure first.

**Files.** index.html (new #cv-app markup after #cv-friends, #cv-mini-app removed, ?v= bumps for app.js/styles.css), js/app.js (handler moved from #cv-appset/#cv-mini-app to #cv-app-bar; cvPairApply/cvPlace aware of a 4th item; caps), styles.css (3640-3724 phone bar + order + caps 8697-8714; PC 8563-8619/8715-8774 for the new tile/row), theme-glass.css (80-81, 511-512), POLISH-LOG.md, REQUESTS.md summary stamp.

**Tests.** New tests:
- The bar is visible in all four states (all closed, Canvas open, Friends open, Editor open) at 380×800, 320×568, 375×553 and 1280.
- Tapping it closes the cog and opens the Settings drawer.
- It is a hit-test winner at its centre.
- It never grows.

Rewrite the queue-35-final test 'phone 390x844: the ⋯ removal…' (tests/tests.js:22320/22376-22399), which demands #cv-appset, so it targets #cv-app-bar.

967 B2 6 (105069-105126) should pass unchanged. Confirm it does.

T12 (121801-121887): Apply must still be reachable with Canvas open at 320×568 and 375×553 with 4 bars. Re-measure.

Each new test needs a CAUGHT mutation, for prove.sh.

### 2. "Change the simple edit what should I use? Button to just be the same expand button as the others."

**Build.** In the Editor bar (js/app.js:8418-8426), replace the worded button.ed-what with the shared ⤢. Use the same <svg> path as #cv-mini-exp/#cv-fr-exp (index.html:1038/1051), with class 'cv-mini-exp' so it gets the 38px round CSS and the 50px hit area (styles.css:3672-3675).

Keep id="cv-ed-what". The EXP refocus map (8555), the hadExp check (8552), aria-expanded in cvPairApply (8510) and tests T10/T12/T13/T15 then all hold without edits. aria-label: 'Open What should you use?'. title: 'What should you use?' (a tooltip on PC). It has no listener of its own: it still bubbles to the bar and calls cvPairSwap('editor').

Delete the .ed-what two-line CSS (styles.css:8676-8677) and the ≤359px tweaks for it (8679-8684).

On the phone the bar gains about 54px of room (from about 92px down to 38px). The explanation body keeps its title 'What should you use?' (8429), so the question is still answered, just behind ⤢.

PC tile: put the ⤢ in the same spot the Canvas/Friends tiles use. Keep the tile at 159px tall so CV_ED_COL = 159+10+216 (js/app.js:8471) still holds. If it shrinks, recompute CV_ED_COL and re-run T8b. Short-screen strip (cv-ed-short, styles.css:8758-8773): the pill becomes switch + ⤢.

**Files.** js/app.js 8418-8426 (bar build), 8552/8555 untouched if id kept; styles.css 8654-8684, 8758-8773; index.html ?v=.

**Tests.** New tests:
- #cv-ed-what has no text, carries the ⤢ path, and is 38px round with a ≥44px catch.
- Tapping it opens the Editor block with a flight, and aria-expanded becomes true.
- Focus returns to it on close.

T10, T12, T13 and T15 must stay green with no edits. That proves the id was kept.

### 3. "And where it says simple and full to switch when you haven't expanded yet should just have icons so it feels less cluttered."

**Build.** In edSwitch(big) (js/app.js:8395-8413), branch on !big. The small switch gets:
- .ed-l-s holding the Simple icon SVG and .ed-l-f holding the Full icon SVG (24 viewBox, stroke-width 1.8, drawn at 20px);
- no '⇄' glyph, because the sliding knob already says 'switch'.

The big switch inside the explanation keeps its words, 'Simple ⇄ Full', and 'You're in Full'.

aria-label and title stay action-named ('Switch to Simple editor'), so a screen reader and a PC hover still get words.

CSS (styles.css:8654-8683): the small switch shrinks from about 146px to about 84px:
- each half 40px;
- .ed-l from 58px to 40px;
- the knob's translateX from 78px to about 40px;
- the big switch's 88/108px left alone.

The icon is the chosen option (A recommended, see icon_options). It ships as inline SVG strings in app.js beside ED_ICON (8390), because the app has no icon set. FU7's `#cv-editor .ed-sw` stays visible.

**Files.** js/app.js 8390-8413; styles.css 8654-8684; js/spine-words.js only if the words move (they should not); index.html ?v=.

**Tests.** New tests:
- The collapsed .ed-sw has no visible text, contains two <svg> and no '⇄', and is narrower than 100px.
- Its aria-label still names the action.
- The big switch in #cv-ed-body still shows 'Simple' and 'Full'.
- Tapping a half still switches the editor (FM.editor.request), and the knob sits behind the current editor.

Render check: both icons legible at 20px on 380 and 1280.

### 4. "When canvas settings is expanded get rid of the button to access app settings."

**Build.** Delete <button id="cv-appset"> from the Canvas .dialog-actions row (index.html:1025) and its .cv-appset margin-right:auto rule (styles.css:7474). The row is then Cancel + Apply, right-aligned as on the other dialogs. Move the handler body (js/app.js:7159-7165) to #cv-app-bar (clause 1).

The route to Settings is now the App settings bar under the open Canvas card. While Canvas is open there is no second copy anywhere.

The short-screen rule that hid the chip in S3 (DESIGN.md:2242) has nothing left to hide. Drop it.

**Files.** index.html 1018-1028; js/app.js 7159-7171; styles.css 7474 (and any .cv-appset rules).

**Tests.** New test: with Canvas open, #canvas-dialog contains no element whose text starts 'App settings' except #cv-app-bar, and #cv-appset is gone at 380 and 1280.

Update the queue-35-final test, as in clause 1.

Check 498 'the pinned Cancel/Apply row…' (75723) still passes with a two-button row.

### 5. "Also when you first open the settings cog to see all of those menus they should all be closed so it isn't overwhelming, and you should be able to tap on the current open one to close it"

**Build.** A new state, NONE: class 'cv-none' on #canvas-dialog.

State changes:
- cvPairBig() (8486) returns 'none' when cv-none is set.
- cvPairApply (8507-8523) sets or clears it, and sets aria-expanded=false on every ⤢.
- The cog handler (js/app.js:8785-8788) opens with { block: 'none' } instead of 'last', EVERY time. 'First open' is read as every open of the cog, because the reason he gives is 'so it isn't overwhelming'. This is flagged as a choice in conflicts_with_past_decisions.
- The other doors keep their block: person+, people chip, LIVE and Home's Share live open Friends (collab-ui.js:1506), and the oversize warning opens Canvas (app.js:3018).
- fm.cvPair is no longer read by the cog. Stop writing it (8522), leave the key harmless and remove CV_PAIR_KEY's reader. This is an obvious yes once nothing reads it.

CSS in the NONE state shows every bar, including Canvas's .cv-mini (today hidden while Canvas is open, styles.css:3652/3688-3690/8645-8647). The result is four 64px bars in the centred column, 4×66+3×10 = 294px, which fits even at 320×568 (460px free).

TAP TO CLOSE: an open block keeps its own bar visible as its header. Remove the 'hide own bar when big' rules at styles.css:3652, 3691 and 8644. The header's 38px button turns from ⤢ into the inward ⤡ (path M4 14h6v6M20 10h-6V4M14 10l6.5-6.5M10 14l-6.5 6.5, shown in the sheet) and its aria-label becomes 'Close …'.

In cvPairSwap (8539-8599), the early return at 8540 becomes a toggle: if cvPairBig() === to then to = 'none'. It runs the same 460ms FLIP flight. With reduced motion the change is instant. Focus goes to that block's own ⤢. Friends' content is cleared on settle as now.

The Friends header bar sits above its own h2 'Share "…" live' head. Keep the h2 (it is content). Whether that reads as a double heading is checked on the sheet.

Unapplied Canvas picks when Canvas is collapsed: keep them pending (not applied, not discarded) and show a small dot on the Canvas bar. Closing the whole cog still discards them, as the backdrop does today (16659). This is a judgement call, decided here because it is a bug-safety default, not taste. The close-after-switch rule (8409-8410) keeps using 'Canvas has unapplied picks'.

The second cog tap, the backdrop, Escape, Cancel and Apply still close the whole cog.

**Files.** js/app.js 8468, 8485-8486, 8507-8523, 8539-8601, 8725, 8736-8745, 8785-8788, 7142-7146; styles.css 3640-3724, 8563-8619, 8627-8777; js/collab-ui.js only if the Friends head changes (should not); index.html ?v=.

**Tests.** New tests, each with a CAUGHT mutation:
- A phone cog tap opens with cv-none, no block big, and all four bars visible at 380×800, 320×568, 375×553 and 1280.
- Reopening after Friends was open still opens all closed.
- The person+ door still opens Friends big, and the oversize door opens Canvas.
- Tapping the open block's header ⤡ closes it with a flight back to NONE, and focus lands on its ⤢.
- A Canvas pick survives collapse and re-expand, and the backdrop still discards it.
- Reduced motion is instant.

Rewrite (they encode the reversed decision):
- 980 cog T9 (121492-121520, the reopen-on-Friends and fm.cvPair checks);
- 945 'on a phone the cog opens Canvas settings with a Friends bar…' (101609-101660);
- 945 'opening Friends never starts sharing…' (101697);
- 945 '⤢ swaps them with a flight…' (101719-101774, start from an explicit Canvas open, drop the fm.cvPair check);
- 945 'reopening Canvas settings lands on the block he had open last…' (101776-101823). Replace it with 'every reopen is all closed'.
- 978 'on a PC the cog opens Canvas settings WITH Friends…' (110150-110188);
- 978 '⤢ swaps them with the flight…' (110190-110257);
- 978 'second click…reopens on the block open last' (110259-110319);
- 983 'on a PC the settings cog is the way in…' (110675 hung on cv-fr-big).

At risk because they open the cog and use Canvas. Have them open Canvas explicitly ({block:'canvas'}) or tap its ⤢: 16624, 16659, 16700, 8498, 75723, 73368, 110494. The smCog fixture (121466-121490) uses the bare call, so it still opens Canvas: unchanged.

## Icons (A ships)

- **A (recommended, ships)** Simple: Kit 'quick' (D16 A): three short clips side by side on one row. Rounded rects about 6×9, rx 1.6, the first at x2 y7.5, then evenly spaced across the 24px box. Copy the exact paths from tools/design/plans/simple-mode/vis/kit.js:1008-1015. Stroke 1.8, no fill. Full: Kit 'full': three layer bars staggered on three rows, <rect x="3" y="4" width="10" height="4" rx="1.3"/><rect x="8" y="10" width="13" height="4" rx="1.3"/><rect x="5" y="16" width="9" height="4" rx="1.3"/>, stroke 1.8. Ezra already picked this pair in D16 A, and Phase 2's plan ships exactly these paths, so nothing new is invented. It reads as 'one track of clips' against 'a stack of layers', the same idea as the ED_PIC miniatures in the explanation he opens with ⤢. The two shapes differ strongly in silhouette (a horizontal row against a staggered column), which matters at 20px.
- **B** Simple: One layer bar: <rect x="3" y="10" width="18" height="4" rx="1.3"/>, stroke 1.8. A single track. Full: The same kit 'full' staggered three bars as in A. It reuses the Full path from A unchanged, and 'one layer against many' is the simplest possible contrast. The risk: a lone bar at 20px can read as a minus sign or a slider track rather than 'Simple', which makes it weaker than A on its own.
- **C** Simple: Sliders with one control: <path d="M4 12h16"/> plus <circle cx="9" cy="12" r="2.5"/>, stroke 1.8. Full: Sliders with every control: three lines <path d="M4 6h16M4 12h16M4 18h16"/> with knobs <circle cx="8" cy="6" r="2.5"/><circle cx="15" cy="12" r="2.5"/><circle cx="10" cy="18" r="2.5"/>, stroke 1.8. It says 'few controls against all controls', which is the real difference between the editors. But it is a new drawing that does not exist anywhere in the app or the kit. Inside the ⚙ cog it can read as 'filters' or 'adjust', which competes with the gear and the Canvas settings.

## PC

PC (wider than 700px, the cog #btn-settings in the transport row). cvPlace is otherwise unchanged: its up/down choice by room, the lift above the blur and the comic tail all stay.

ALL CLOSED (new, the state every cog click opens in). Two options to draw. The arrangement is a taste call, so it goes on the sheet.
- P1 (recommended): one column of 176px tiles hanging off the cog, in the order Canvas (nearest the cog, so the tail still aims at Canvas), Friends, Editor, and a slim 176×56 App settings row last. Each tile shows its icon, its name and its ⤢. The Editor tile shows icon + 'Editor' + the icon switch + ⤢.
- P2: a 2×2 grid of 176px tiles beside the cog (cv / fr on the cog side, ed / app beyond), with App settings as a full tile.

ONE OPEN: keep today's side-by-side grid (cv-side: one 360px open block, 176px tiles). Add App settings as a slim 176×56 row at the foot of the small column, so the column grows by only 56+10 px and the grid areas become 'ed cv' / 'fr cv' / 'app cv'. In the stacked (narrow) layout, App settings is the last small item away from the cog, and each cap loses 66px instead of a whole tile. The open block's own bar stays visible as its header, with the inward ⤡ to close it. A click on ⤡ flies back to ALL CLOSED. The second click on the cog, the backdrop and Escape still close everything.

Short screens (cv-ed-short, room under CV_ED_COL): the Editor strip on the cog's row becomes [icon switch][⤢]. It is shorter than today, so it fits more easily. App settings stays a slim row.

If the Editor tile's height changes from 159, recompute CV_ED_COL (js/app.js:8471) and re-run T8b. Recommended: keep 159.

A width crossing (cvOnWidth) keeps the current state. ALL CLOSED stays ALL CLOSED.

Also add #cv-app and #cv-editor to theme-glass.css.

Unknown until rendered:
- whether P1's column at 1280×720 with the cog opening upward fits without scrolling (4 tiles ≈ 3×159 + 56 + 30 = 563px);
- whether the tail looks right with a column instead of one big card.

The render brief draws both.

## Release route and the Full-unchanged lock

The gate cannot be dodged. cvPairBig, cvPairApply, the EXP map and the whole Editor CSS match the hook `\bcv-ed(?:itor\b|-)`, and their lines are blamed to v17.36 (f7ec250c). So this is a Simple release: its POLISH-LOG line names queue 980 only, it ships alone, and it needs a full-unchanged.sh PASS of its exact tree (about 3h).

That PASS cannot come under today's lock. FU6 (tests/full-unchanged.html:2913-3000) records the Canvas/Friends half of the cog at 14 sizes: classes, aria-expanded, the reopen-on-last, Canvas opening at the cog. FU1's fu1-cog photographs it and FU4 records Friends after a friend leaves. This request changes exactly those, and the price format cannot express NEW/GONE elements or class/aria/focus changes (_fu_compare.py:286-334, 1044-1046).

The route is three steps, in order.

1. Prototype run (no ship). Build the whole cog change in its own worktree and run tools/full-unchanged.sh against HEAD (v17.37). Keep the run. It will say NOT PASS, and the run is the measurement.

2. Release L, lock only. It changes no app file. Its POLISH-LOG line carries `INSTRUMENT CHANGE:` and `LOOSENS THE LOCK: "In this menu move the app settings button to be its own button … you should be able to tap on the current open one to close it"` (his words, verbatim, 11 Oct). It contains:
   a) _fu_compare.py: a price can also apply when both sides have #cv-editor (line 1009). A price can name sanctioned NEW/GONE elements (#cv-app*, #cv-appset, #cv-mini-app) and sanctioned changes in cls/exp/focus (cv-none, cv-fr-big at open, aria-expanded false). PRICED widens from the four sizes (189-206) to all 14 FU6 sizes, plus fu1-cog's runs and FU4 leave at 380 and 1280. write_price (347-405) stops refusing when HEAD has the block.
   b) FU6's contract changes. The cog opens ALL CLOSED. 'reopened' becomes 'every reopen is all closed'. The function step opens Canvas explicitly before pressing #cv-cancel / setting #cv-fps (2981-2990). Canvas and Friends INSIDE their open cards are still compared exactly, so the lock keeps guarding what he did not ask to change.
   c) A new tools/full-unchanged-price.json, measured with `tools/_fu_compare.py price <kept run>` from step 1 on this laptop.
   d) A plant caught in every group. Its own PASS: the tree has no app change, so it compares like for like.
   #1125, the open FU6 instrument item about recording flights mid-way, is also a lock-only FU6 release. Fold it into L only if tools/next.sh puts #1125 at or before this item. Otherwise it ships first on its own. Which applies is unknown until next.sh is run.

3. Release C, the cog build. A Simple release: POLISH-LOG names queue 980 only, and his new item is referred to as #NNNN and ticked in REQUESTS.md with the version. It needs a full-unchanged PASS against L with the new price, then ships alone through ship-bg.sh. Unknown: whether ship.sh's next_up/queue-claim gates accept closing #NNNN without a `queue NNNN` claim. Check `python3 tools/_classify.py` and the gate in _fu_gate.py:904-908 before step 3, and add JUMPED or a gate rule if needed.

Ordering: this request gets a number at the bottom of REQUESTS.md and waits its turn by oldest-first unless he says now. Steps 1 and 2 can be built in a worktree while another ship runs (code only, no agents beside ship.sh). Review step: per the 'review-before-shipping-storage' note, run a lenses+refuters review on the band/menu change before C ships, and /security-review is not needed (no keys or user data, no innerHTML of user text). Mobile check at 380 before claiming done.

## Past decisions this overturns (his new words win)

His new words win in each case, and each is said plainly:
1. #944/#945 (26 Sep, his words, built v17.04): Canvas big on the first open, and the cog reopens to whatever block he had last. This is OVERTURNED: the cog now opens all closed every time, and fm.cvPair stops being read. Reading 'when you first open' as every cog open is my interpretation. The alternative is all closed only on the very first open per device, then remembering again. That alternative contradicts 'so it isn't overwhelming', so it is not recommended, but he can pick it.
2. #978 PLAN (REQUESTS.md:34254): 'the cog reopens on the last block (per device, like the phone)' on PC. OVERTURNED with #944.
3. DESIGN §21 F7 / COG-DESIGN §5 (the Editor block is never remembered): moot, since nothing is remembered now.
4. COG-DESIGN 67-68 and the states table (one block is ALWAYS big): OVERTURNED. Zero or one block is open now, and an open block's bar stays visible to close it. This extends his #762 'tap it again it should close it' from the cog button to the blocks, so it is consistent with that.
5. His 1 Oct wording, 'a button that you press that says "What should you use?"': OVERTURNED for the button. It becomes ⤢. The explanation keeps 'What should you use?' as its title.
6. COG-DESIGN §3.1 (the phone bar shows 'Simple ⇄ Full' words): OVERTURNED for the collapsed form only. Icons replace the words and the ⇄. Option A ships the D16 A icons he already chose, so it agrees with D16.
7. v6.13 (App settings… inside Canvas's action row) and v17.08 #967 B2 / audit J3-9 (#cv-mini-app on the Canvas bar, built to the recommended pick, not his words): both REPLACED by the App settings block. DESIGN.md:2242's short-screen hiding of that chip is dropped.
8. His 1 Oct rule 'i dont want the original editor changing in design and function', with DESIGN.md §0.4 and FU6's contract (DESIGN.md:240: the cog opens on Canvas, then the last of Canvas/Friends; ⤢ lands the same rects): this request changes Full's cog by his own explicit ask. That is why release L carries LOOSENS THE LOCK with these words. Only the cog shell is loosened, and the inside of the Canvas and Friends cards stays exactly locked.
No conflict with #983 (PC Share removed; the cog stays the only PC door) or #970.

## Render brief (sent to the cloud helper as R-COG1, trimmed to option A only)

Goal: one picture sheet for Ezra, drawn through the REAL app (not a mock-up), showing the new ⚙ cog with icon options A, B and C at 380px and 1280px. Do NOT edit or commit app files (index.html, js/, styles.css) and do NOT ship. Everything lives in one throwaway probe page plus a patch it injects.

Setup:
1. Work on the pushed pre-release tree (wip/… branch or main at v17.37). Do nothing while .ship-in-progress or .mutation-in-progress exists. No network: no ?fmrelay=1.
2. Serve with tools/serve.sh, which binds 127.0.0.1:8777 (python -m http.server drops scripts).
3. Create tests/probe-cog-sheet.html, following the 'render the sheet through the app' pattern. It loads index.html in same-origin iframes sized exactly 380×800 (DPR 2) and 1280×800 (DPR 1). In each frame:
   - open a project the way the suite's smCog fixture does (tests/tests.js:121466-121490);
   - then inject a PROTOTYPE patch: one <style> plus a small script. The patch must not touch files on disk.

The patch:
(a) Append a block #cv-app after #cv-friends, with one <button id=cv-app-bar class='cv-mini cv-app-bar'>. Inside it: the gear SVG copied from #btn-settings (index.html:325), the text 'App settings', and a 38px round end button showing an arrow-out glyph. Draw a second variant with a › chevron, for row 5 only. Order: last on the phone (CSS order 2). On PC, a slim 176×56 row at the foot of the small column.
(b) Remove #cv-appset and #cv-mini-app.
(c) In #cv-ed-bar, empty #cv-ed-what and give it class cv-mini-exp plus the ⤢ path `M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5`.
(d) In the SMALL .ed-sw only (not the one in #cv-ed-body):
   - replace the .ed-l-s and .ed-l-f text with the option's two 24-viewBox SVGs at 20px, stroke 1.8, currentColor;
   - remove .ed-x '⇄';
   - set .ed-l to 40px and the knob's translateX to 40px.
   Option A uses kit.js 'quick'/'full' (copy the exact paths from tools/design/plans/simple-mode/vis/kit.js:1008-1015). Option B: Simple = <rect x=3 y=10 width=18 height=4 rx=1.3/>, Full = kit 'full'. Option C: Simple = M4 12h16 + circle(9,12,r2.5); Full = M4 6h16M4 12h16M4 18h16 + circles (8,6) (15,12) (10,18) r2.5.
(e) An ALL-CLOSED state: add class cv-none to #canvas-dialog and remove cv-fr-big/cv-ed-big. CSS shows every .cv-mini bar, including the Canvas card's own .cv-mini, and hides every block's content. On PC, draw arrangement P1: one column off the cog, Canvas nearest, then Friends, Editor and the slim App settings row. Draw P2: a 2×2 grid, with App settings as a full tile.
(f) OPEN states: keep the open block's own bar visible as a header (override styles.css:3652, 3691, 8644). Its 38px button shows the inward ⤡ path `M4 14h6v6M20 10h-6V4M14 10l6.5-6.5M10 14l-6.5 6.5`.

Capture with each frame's own screenshot path (FM.renderScene, or CDP via tests/_cdp.py), and POST the JPEGs to a local receiver so they reach disk.

Shots per width, for options A, B and C:
- S0 all closed;
- S1 Canvas open;
- S2 Friends open;
- S3 Editor open (the big switch must still show the words 'Simple ⇄ Full');
- 1280 only: S0 in both P1 and P2, with the cog opening upward (cog near the bottom) and again opening downward.
Also one column of TODAY (v17.37, no patch): S1 at 380 and at 1280, for comparison.

Extra rows:
- Short phone: S1 Canvas open at 320×568 and at 375×553, option A only, showing that Apply is still reachable with four bars.
- Close-ups: the collapsed switch of each option at 1× real size (20px icons) and at 4×, in the default theme and the glass theme. Ezra's rule is that a 24px icon must read at ship size.
- App settings bar: the arrow-out end against the › chevron.

Sheet layout:
- Columns: TODAY | A (recommended) | B | C.
- Rows: S0, S1, S2, S3.
- Labels are plain words in 16px+ type, e.g. 'A — recommended: clips vs layers', 'All closed (every time you open ⚙)', 'Canvas open — tap ⤡ to close'.
- Page 1: phone 380, every frame at its real 380 CSS width. Page 2: PC 1280, scaled to fit one column per option, with P1 against P2 labelled 'P1 — recommended'. Page 3: short phones, close-ups and the App settings glyph.

Delivery: split any page taller than 3× its width with tools/phonepages.py and export JPEG. Send to him with SendUserFile, and read its result for 'NOT delivered'. Report the console errors from each frame, and the measured heights: the open-block cap at 380×667, 320×568 and 375×553; P1's column height at 1280×720. Afterwards, delete the probe or leave it untracked. Never commit it.
