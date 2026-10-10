# Plans for the next five after P34 (P35): #879, #880, #882, #920, #929

Against `origin/main` 0896fbf4 (v17.35). **Measured** = I ran it here, **Read** = read the code or the entry, **Guess** = not checked. Four of the five are notes or waits on him; #929 is the one with a measurement to hand over.

## #879 usage discipline ("I ran out of usage in one evening for the whole week")
**Net: one of three clauses rests on a number that is not what a tick reads, and the clause that matters is already settled by him.**
1. **"Each firing re-reads a 2.9 MB `REQUESTS.md` plus a 1.9 MB `POLISH-LOG.md`" (Read, Measured sizes).** The cron prompt in `CLAUDE.md` is *"read LOOP.md first, then run ./tools/next.sh and work the oldest actionable item"*. `LOOP.md` is 254 lines (about 20 KB); `next.sh` and `tick.sh` read REQUESTS.md with `grep` and python, not through the model. So the model's cost per firing is LOOP.md, CLAUDE.md (494 lines, about 40 KB) and next.sh's printed list, not the 3.85 MB file (now 36,155 lines; POLISH-LOG.md 2.06 MB, 1,551 lines). **The cost that could be real is when a tick opens one big entry: `next.sh` prints one-line summaries, but the oldest entries run to hundreds of lines.** Guess: that, not the file size, is where a bad week came from.
2. **The suite is slower than the entry says** (see P34 #875): 45 to 48 minutes a pass, 90 to 95 for the double run (computed from `tools/.suite-seconds`).
3. **"Use ur own reasoning and sence"** is the explicit permission, already applied (#882 clause 2, #872).
- **Plan, nothing built:** the cheap change that fits his words is for `tick.sh` to print how many ticks in a row found nothing actionable, so the "idle steer" path (#966) is taken at once and a tick ends in one line. `next.sh:446-451` already does the steer; I did not measure how many tokens an idle tick spends, and I would not touch the cadence (he answered that on 20 Sep: one minute stands).

## #880 the 20 Sep restart brief
**Net: all clauses ticked except 5, and 5 is enforced by a script.** Clause 5, "make sure you're pushing the updates as you go", is `tools/ship.sh`: it pushes with `git push ssh main` and confirms by comparing `HEAD` to `ssh/main` instead of trusting the push output (Read, `CLAUDE.md`). Clause 7 (stop the loop when truly out of productive work) is recorded in `LOOP.md` rule 8b; **its header still says "UNSTOPPABLE"** (P34, #877: reword the header, one file). The "white bar" (clause 6) is #883 to #920.
- **A fact worth keeping straight (Read):** the entry says Codex "made no commits". Today's tree holds ChatGPT's verified pile (#1068). It was true of 12 Sep only.

## #882 questions: Xcode and the ChatGPT logs
**Net: both open clauses are his, and nothing is broken meanwhile.**
- **Clause 3, the Xcode line:** `DEVELOPER_DIR` is in `~/.zshenv` and `tools/serve.sh` exports it, so every script works (Read). The one permanent line (`sudo xcode-select -s /Library/Developer/CommandLineTools`) is his to run; it also affects the rest of his Mac. This container is Linux, so I could not check `xcode-select -p`; the 30 Sep note says it still printed the Xcode.app path. **Plan:** leave as is; if he ever hits "You have not agreed to the Xcode license" in a script that does not go through `serve.sh`, the fix is the `export` line in `CLAUDE.md`, not the sudo.
- **Clause 4, the ChatGPT logs:** the only value is requests he made to Codex that never reached an inbox. The 12 Sep INBOX entries (#870 to #880) are the trace on this side. **Plan:** if he sends them, read them for requests only (grep his lines), log each verbatim, and do nothing else with them.

## #920 the faded bar at the top (iOS 26 status bar)
**Net: built and tested; waits only on his word that it is gone.** The history is in the entry: v16.78 (status-bar style), v16.91 (the app tells an old install to reinstall), v16.96 (each screen's `background-color` is its TOP colour, because iOS 26 ignores `theme-color` and paints the status bar from the page's background), tests `920` (three screens at a phone width, cross-checked against the top bar's own computed colour). He reinstalled on 25 Sep and the v16.96 change needed no reinstall.
- **Cannot be measured here (Read):** the status bar is drawn by iOS, so the container shows only the page side (the 47 px safe-area fake in `tools/shot.py`). I would not claim it fixed.
- **Plan:** put one yes/no line on the unblock page (#777), "is the fade at the top gone?", and close on yes. Do **not** ask for screenshots: his words are "don't ask me to send more screenshots".

## #929 the heart's icon does not match the heart you get, and its outline bulges near the bottom
**Measured (`helper-plans-35-scripts/heart-icon-vs-shape.js`, 380 wide).** I rendered the heart the app adds (a filled white heart on black) and the icon's path (`addmenu.js:353`) filled into the same bounding box, and compared:
- **Shape overlap (IoU): 0.985.** The widest half-width difference between them over 64 rows is **2.6 % of the width**.
- **Neither outline grows below its widest row** (no row below the widest is wider than the one above by more than 0.4 %): **no bulge in the lower half of either**, as filled shapes.

**So where do "doesn't look the same" and "little lines that look funny" come from? Read, with one computed number.** The icon is not drawn filled. `ico()` (`addmenu.js:9-11`) makes a **stroke-only** SVG (`fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round"`), and the shape tile uses `stroke-width: 2.05` in a 22 px box (`styles.css:5834`), which is **1.88 px** of line. The heart you add is a filled solid. Two consequences, both at icon size and invisible in the fill comparison:
1. **It reads as an outline next to a solid** (that is the "does not look the same as when you actually add it").
2. **The tip and the notch are cusps (the path's two curves meet with controls on the point), and a round join on a cusp makes a blob: the tip is pushed 0.94 px past the path, 5.4 % of the heart's 19-unit height, which reads as a bulge at the bottom.** The top notch gets the same blob.
- **This also answers his own ASK (outline or filled tile):** "filled" makes clause 2 true by construction and removes clause 3's cause, because a fill has no join. The shape-picker tiles for the other shapes are outlines, so a filled heart among them is a design call; **my recommendation is a filled tile for the heart only if he picks it, otherwise keep the outline and shorten the tip's overshoot by ending the stroke with `stroke-linejoin="miter"` plus a miter limit on that one path.** Both are one-line changes to the Heart entry. I did not build either: the ASK is his (A/B/C and outline or filled) and #545 says options get drawn first.
- **Not measured (Guess):** that this is what he saw. His words ("little lines that look funny") fit the cusp blobs, but I have no screenshot.

## Summary
| # | closes when | build size |
|---|---|---|
| 879 | nothing; optional idle-count line in `tick.sh` | tiny |
| 880 | the 8b header is reworded (P34) | tiny |
| 882 | he runs the sudo line, or says leave it; he sends the logs or not | none |
| 920 | one yes/no from him after v16.96 | none |
| 929 | he picks heart A/B/C and outline or filled; the finding above is the evidence for the pick | one line |
