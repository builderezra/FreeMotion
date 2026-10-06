# Plans for the five after P5 (P6)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed, nothing run in a browser. Under the PM's quality rule: claims traced in code, "guess" where not.

## Which five, and an honest note

After P5 (#967, #982, #985, #987, #1065) **there is no item left that is both in Ezra's own words and not standing, held, in someone else's lane (#921 and #967's design, #923 and #980 Simple mode) or a process note (#912, #956).** So P6 takes the oldest **audit and hunt items** in queue order: **#834, #904, #917, #918, #970**. They are findings from the builder's own hunts, not his words. The surprise is how little is left in them: **four of the five are fixed except for one or two choices that only he can make**, and two of those "choices" look already answered in the code.

---

## A. #834 Twenty more findings from one hunt

**State (read in the entry).** Every confirmed finding fixed and proven by 7 Sep (v16.07); two refuted. Open: **clause 18**, pinch-to-resize silently failing when the second finger lands on a selection handle (low), waiting on his reading; and **u19**, "Sketching's Cancel does not cancel", with an ASK "YOUR CALL".

**Finding (verified): u19 is already answered in the code, and the ASK is stale.** `js/draw-tool.js:744-752` renames the freehand bar's button to **Close** (with "your strokes are already on the canvas (↶ takes one back)") and keeps **Cancel** only for Custom shape, where it genuinely throws the points away; the comment records the choice ("One word per behaviour"). So u19 needs only the entry striking. (Tutorial 13 says "Close only closes the bar", consistent.)

**Plan.** (1) Strike u19 with the line number. (2) Clause 18 needs a real phone: ask once, with the exact repro in the entry ("two fingers on a selected layer, one starting on a corner square"). **Guess:** I cannot judge the pinch without the gesture code (`js/canvas-edit.js`), which I did not trace. **Needs pictures:** no.

---

## B. #904 54 effects missing a control, or showing one that does nothing

**State.** A container of 54 jobs, **all but two fixed.** The two left are his picks (entry, 22 Sep): **Flash (darken)**'s "Darkest" (param `floor`, label "Darkest", `js/compositor.js:681`) only bites when set lighter than the flash's own depth, so most of its travel does nothing; the ten built-in presets set an inert value. Options: A make Darkest the real bottom (the ten presets get noticeably lighter), **B remove Darkest and keep today's look (recommended)**. **Blink**'s "Rate" is half what it says: **verified in the kernel** (`js/compositor.js:7549-7559`: at the defaults duty 50 and phase 0, `blkOn = floor(t·rate) & 1 ? 0 : 1`, so one full on-off cycle lasts 2/rate seconds, and "2 Hz" blinks once per second). Options A (keep every existing blink looking the same and relabel or rescale), B, C; **A recommended**.

**Plan when he picks.**
- **Blink A:** change the label's unit to "blinks/s ÷ 2" or, better, relabel "Rate" as "Cycles per second" and store a new param `cps = rate/2` only for *new* instances, with a `legacy: 0` style flag like other effects use (`js/compositor.js:12xx` Chromatic Aberration's `legacy`) so saved projects look identical. Test: render a saved Blink at rate 2 before and after; assert byte-identical frames.
- **Flash B:** remove the control from the panel but keep reading `floor` in the kernel so saved projects and the ten presets are unchanged. Test: preset frames byte-identical before and after.
**Risks.** Both change a visible control on the existing editor, so show before/after first (his rule). **Needs pictures:** a one-line label change needs a screenshot of the panel at 380.

---

## C. #917 Visual issues, phone layout (17 findings)

**State (verified from the entry).** 13 fixed (v16.76, v16.79) or "not real"; **#7 folded into #985**; three looks left for him: **11b** the Add sheet is see-through glass (more solid, or keep), **15b** the custom colour box starts black and looks like a second Black swatch, **17** option rows (`.fx-seg`) wrap unevenly and leave one item alone on a last line (Match Grade "Contrast only" at 380; HSL Bands, Squish at 320).

**Plan.** Nothing to build without his pick, except **17, which is a layout bug rather than a taste**: rows that orphan one item. A safe fix with no visual redesign: make `.fx-seg` a CSS grid with equal columns that never leave one item alone (for example `grid-template-columns: repeat(auto-fit, minmax(…))`), measured at 380 and 320 on the four effects named. **Guess:** I did not look at `.fx-seg` CSS; start by reading it. Draw 15b and 11b options (the entry says the options are on the unblock page). **Test:** for each effect named, assert no option row's last line holds a single item (measure line breaks by `offsetTop` of the children). Must fail on HEAD at 320.

---

## D. #918 Visual issues, PC layout (15 findings)

**State.** Same shape: all fixed except **2** (at a 900 px PC window Layer actions and Back overlap; it is #775's pick), **11** (the custom colour picker: the same question as #917 15b, asked once), **16** (new, found while re-checking).

**Finding (verified): finding 2 looks solved by #979.** The suite test `tests/tests.js:110287` ("on a PC window from 701px every control on the transport row takes its own click") walks every control in the row (`btn-back`, `btn-layermenu`, `t-sel`, `t-far` children…) and asserts each takes its own click. #775's own note says to re-measure first and strike. **Plan:** run that test at 860, 900, 950 and 1000 px (it is already parameterised over widths, I did not read its width list) and, if it passes, strike finding 2 and the #775 narrow-row ask together. **Not verified in a browser.** Finding 16 is not described in the lines I read; read it in `audits/912-audit.json` before planning.

---

## E. #970 PC ⋯ button under the version chip, two layers selected

**State.** The fix is **built but not on origin**: the entry names branch `fix-970`, commit `bebd4560` on `2d06a3f5` (v17.11); `git branch -r` shows no such branch, so it lives only on Ezra's machine. Waiting on his pick: **A** the band under the row below about 1380 px (recommended) or B (one row, band only while two or more layers are selected).

**Does #979 supersede it? Unproven.** #979 made the transport row's controls take their own clicks from 701 px (`tests/tests.js:110287`), but its `controls()` list is the row's own children and `t-sel`/`t-far`; the entry's bug is specifically the *two-selected* group being 80 px wider at 1160 to 1386 px. I did not read whether the test selects two layers. **Plan:** (1) read that test for a two-layer selection; (2) if it has none, add the repro from the entry (two layers selected, windows 1160 to 1440) as a new test and see whether it already passes on HEAD; (3) only if it fails, ask for A or B and rebase `fix-970` on v17.13 as the 30 Sep note says (it must be pushed to origin first, or the work is lost if the Mac is). **Test:** at 1160, 1200, 1280, 1386, 1440 with two layers selected, `elementFromPoint` at the centre of `#btn-layermenu` returns it. Must fail on HEAD only if the bug survives #979.
**Needs pictures:** A vs B were drawn (`2026-09-26-corners/`).

---

## What would help most

(1) **Push `fix-970` to origin** so it is not only on one machine. (2) Strike #834 u19 and #918 finding 2 after the two checks above. (3) One message to Ezra with the five picks: Flash Darkest A or B, Blink A, B or C, the three looks in #917 (11b, 15b, 17), and the pinch reading.

## Verified vs guess

Verified: the Blink kernel behaviour (`js/compositor.js:7549-7559`), the Sketching button rename (`js/draw-tool.js:744-752`), the #979 test's existence and shape, that `fix-970` is not on origin. From the entries only (not re-derived): the Flash (darken) fault, the 13 fixed findings, finding 16. Guess: whether #979 supersedes #970, the `.fx-seg` CSS, the pinch gesture.
