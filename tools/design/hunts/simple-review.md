# S13: an adversarial review of `hunt/simple-stack-landing`, one lens at a time

Branch with the fixes: `hunt/simple-stack-landing-2` (on top of the landing branch). Labels: **Verified** = a test or measurement I ran; **Read** = read in the code; **Guess** = not checked. Method: write each suspicion down, try to REFUTE it, and fix only what survives, with a test that is red first. Eight suspicions were written down; **two survived** (one is a family of three), **six were refuted**.

## Lens 1: does Full change? (DESIGN §0.4)

**Read:** every line of the landing branch outside `js/simple-*`, `js/spine*` and the collab files, against `980-p22-r3`: `js/app.js` (the ‹ label, `abortGestures`, Replace split into `pickReplacement` and `swapInMedia`), `js/behaviors.js` (the `sb` key filter), `js/editor-mode.js` (`inspector.refresh()` at a switch), `js/history.js` (undo and redo return a boolean), `js/inspector.js` (`FM.setClipSpeed`, the Simple-only speed range and swipe guard), `js/scene.js` (`FM.shiftProp`, new), `js/storage.js` (`taken` sanitiser, `remapCommentPins`), `styles.css` (every rule is keyed on a Simple-only class or id).
- **S1 suspicion: `FM.history.undo()` now returns `true` where Solo used to return `undefined`; a Full caller that tested for it would change.** Refuted (Read): the four Full callers (`js/app.js:7219, 7220, 9039, 9042`) ignore the value, and `FM.spine.undoSaid` returns at once unless the editor is Simple (`js/spine-edit.js`, first line).
- **S2 suspicion: Full's Replace now runs through a promise chain, so a throw inside the swap could surface differently.** Refuted (Read): the old code rethrew from the `change` handler as an unhandled rejection; the new one rejects `replaceMedia`'s promise, whose only callers are Full's own ⋯ Replace, which never awaited it for errors. Same outcome on screen. The existing `queue 690` Replace tests pass.
- **S3 suspicion: `inspector.refresh()` at every editor switch runs at boot in Full.** Refuted (Read, plus 159 of 162 Simple tests and the unchanged Full tests in the slice): it runs only inside `syncProject` after the timeline rebuild and is wrapped in `try`.
- Not run: `tools/full-unchanged.sh` itself (two hours on a Mac). **But H59's gate found something while I was here:** on this branch (and on `980-p22-r3` itself) the lock's plant `sanitiser` has **no anchor** in `js/storage.js` (0 occurrences, want 1), so the lock cannot start. That is the chain's, not Simple's; `hunt/fu-plantcheck` names it in 0.1 s.

## Lens 2: undo and redo, byte for byte (Verified)

`simple P2.7 · S13L2`: for each of 24 Simple commands (delete, both trims, split, duplicate, length, trim start, move, move to, lift, stay, speed, volume, fade, reverse, mute clips, end with the video, add text, trim item, move item, forward, close all gaps, sort by date) on a fixture of three clips, a title and a song: run it, undo, redo, undo again, and compare the whole document text each time. **All 24 round-trip exactly.**
- **S4 suspicion: Add text does not.** First run: redo gave the layer a different id (`layer_… → l_…`). Refuted: that is with the text editor still open (Add text opens it). With the editor closed first, it round-trips. A redo pressed inside the editor is the editor's own undo, in Full too. Not a Simple bug.

## Lens 3: save, close, reopen (Verified)

`simple P2.7 · S13L3`: nine commands (speed, volume, split, reverse, fade, stay, move to, mute clips, end with the video), save, open another project, reopen in **Simple** and again in **Full**: the document is identical text both times and the clip row (names, starts, ends, seam kinds) is identical. **Holds.**

## Lens 4: a Simple user and a Full user live, on the fake network (Verified)

`simple P2.7 · S13L4`: ten things a Full guest can do to a Simple host's project (delete a clip so a gap opens; slide one onto another; fade one over another; a 0.05 s clip; a speed ramp; take a clip out of the row; a layer on top; hide a clip; reorder the layer array; stretch the first clip over the second) each travel through the real engine to the host, which then re-reads, redraws the timeline and inspector, selects a clip and runs two commands. **No error, none uncaught.** Controls prove the guest's delete and hide really reached the host. **Holds.**

## Lens 5: the phone at 380 and 320x568, the PC at 1024x600 (Verified, **two findings**)

I opened every inline row (Speed, Volume, Fade, Length) and the clip, song and title trays at 320x568, 380x760 and 1024x600 and measured every button's box and what a press at its centre actually lands on.
- **S5 suspicion: tools sit under the pinned More and Delete at 320, so a press on Move later or Lift off lands on More or Delete.** Refuted: the measurement says a press at the visible centre of `later` hits More, but `.sm-pins` paints a solid panel behind its two buttons (the gradient is 14 px), so those tools are **hidden** there, not visible-and-wrong. (It also means one line in my tutorial 09, "tapping near Delete can press Delete", was an artefact of my script computing a tap on a hidden tool; I have corrected the tutorial.)
- **F1 CONFIRMED: finger-sized targets.** Speed's five presets and the Fade steps were **11 px tall** (a press 5 px off centre misses), Done and the Length steps 36 px, against DESIGN's 44 px controls (`DESIGN.md:2614`, `:1365`). Fix: every tray button is at least 44 px tall (`styles.css`). Test `simple P2.7 · S13L5`, red first with 64 problems at 1280, 1024, 380 and 320.
- **F2 CONFIRMED: the Fade row did not fit anywhere.** In and Out side by side were 434 px: at 380 the **Out +** was off the screen, and at 1280 and 1024 both Out buttons were cut by the band (306 and 299 px). My own tutorial walk had hidden this (the script scrolled the row for me). Fix: one fade at a time, **In | Out** to choose and **− value +** to step it (278 px). Tight Length and Speed rows so Done, the presets and both steps show whole at all four sizes. Tests `S13L5` (also covers Length at 1024, whose **+** was cut) and `S13L5b` (behaviour: choose, step, value, one undo).
- Not fixed, said plainly: the Speed row's **slider** still has to give way (it is the flexible part) on a 299 px PC band; the five presets always show.

## Lens 6: a project with 60 clips and a 10-minute song (Measured, desktop headless Chromium)

Delete, split, trim, move, duplicate, speed, volume, reverse, mute all, close all gaps, end with the video, move an item, undo and redo, all on 60 two-second clips with five titles and a 600 s song: **32 to 216 ms each; the slowest is Duplicate at 216 ms**; one classify is 31 ms; a full refresh 63 ms. At a phone's 4x slower CPU that is under a second. **S6 suspicion: some command is quadratic. Refuted** on this size (nothing over a quarter of a second). **Guess:** a real phone, and 500 layers: the 921 S8 throttle test covers 500 layers.

## Two suspicions from outside the lenses

- **S7: the landing branch's tests define a helper twice** (a merge artefact of putting 2.4b under 2.5). Refuted: `grep` for repeated `smXxx` helper definitions finds none.
- **S8: eleven files shipped without a `?v=` bump.** That was already found and fixed on the landing branch (`d98425a5`).

## What changed on this branch

`styles.css` (the 44 px rule and four tight-row rules), `js/simple-tools.js` (the Fade row), `index.html` (two busters), `tests/tests.js` (S13L2, S13L3, S13L4, S13L5, S13L5b: five tests that all pass). Slice: **159 of 162 at 1280 and at 380** (the 3 finger tests NOT RUN headless). Mutations: the 44 px rule removed, the tight-row rule removed, the In|Out choice removed: all CAUGHT.
