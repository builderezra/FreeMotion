# TUT1: the tutorials re-checked against the current app (11 Oct)

Branch `tutorials-recheck`, off `tutorials-drafts` (92258bc2). Full set (20) against **main v17.37** (`d55cabc8`); Simple set (14) against **`wip/v17.44-tree`** (`e551532c`, Simple 2.6), except the ◇ transitions tutorials, which no wip tree has: the only tree with ◇ is `hunt/simple-tip` (`e52af508`, v17.24 base plus the transitions), so 10/14 were checked there.

## What this is, and what it is not
I did not re-walk 34 tutorials by hand with real taps. What I did, in the same container the earlier walks used (headless Chromium, 380 and 1280):
1. **What changed since the drafts were walked.** The drafts forked from main `b46b47d3` (5 Oct, v17.23). Main is 16 commits later. I read the whole app diff for what a person sees in Full: the phone's ? button went (v17.26), the cog got an Editor block (v17.36), number boxes commit on Enter and are keyboard-reachable, the Detect-speech error toasts changed, the panorama canvas cap (v17.37). Everything else is Simple-only or tooling.
2. **Live label harvest.** 533 distinct visible labels at 380 and 539 at 1280, from the real app: Home (every tab, a card's menu), the New project box, Add menu (every tab), every inspector card of a clip, a picture, a song and a title (each opened), the effects browser with a search, the text sheet, captions, the cog (all three blocks), the Export box with every format. Simple, on v17.44 at 380: the empty editor, a clip, a picture, a song, the bottom row, the Audio, Speed, Volume, Fade and Length rows, More.
3. **1280 geometry for every "On a computer" claim** that names a place (they were never walked before: "not walked: the walk was the 380 px phone layout only").
4. **Mechanical checks:** every **bold** name against the source (new tool, below); every quoted string; every cited `file:line` against what is there now.

## Findings, each fixed in the text (Full)
| # | where | what was wrong | fix |
|---|---|---|---|
| F1 | 17, "On a computer" | "Click the cog (Canvas settings) **at the top**." At 1280 there is no top bar; the cog (`#btn-settings`, x 1106) is in the row with the time counter, just left of the Export arrow. Also the cog now holds three blocks (Editor, Friends, Canvas); Friends is a small block with a ⤢ button. | Reworded to say where the cog is and how Friends opens. The verification row now cites `index.html:325`, not the hidden `#btn-canvas` at :283. |
| F2 | 02, 05, 06, "On a computer" | The A S D keys are described as being "near the top of the clip's panel" / "on the panel's title row". At 1280 they sit at the left end of the row with the time counter (y 564, x 158 to 252), above the panel. | Reworded in all three. |

Checked and **fine** in Full: Export is third from the right end of the row at 1280 (Export x 1148; two more buttons after it); the back arrow is the left end of that row; Undo/Redo; every quoted string; every bold name (210 names; 5 are built at run time and are in the allow file with a reason); the person button (top left of the picture) still opens the cog with Friends big on a phone; Home tabs, the card menu items, the Add menu tabs and cards, the Export formats, the Effects browser, the inspector card names.

## Findings, each fixed in the text (Simple, against v17.44)
| # | where | what was wrong | fix |
|---|---|---|---|
| S1 | 02 step 4 | The clip's tool row is listed as six tools. On v17.44 a video clip has **Length, Audio, Move earlier, Move later, Lift off, Duplicate, Crop, Replace, More, Delete**; a picture has the same without Audio. | Updated. |
| S2 | 09 (all of it) | Written before his option E. On v17.44 **Speed, Volume, Reverse and Take sound out are under one Audio tool**: Audio opens a row `Done, Speed, Volume, Reverse, Take sound out`; Speed and Volume open their own rows and **Done goes back to the Audio row** (a second Done leaves it); Reverse toggles in place. The old text said they were on the clip's own row, and ended with a "Heads up: if Ezra picks option E" that is now simply how it works. | Rewritten, 13 steps, walked at 380 on v17.44 (the rows, the Done chain, Reverse, Take sound out / Put sound back, the song's tools `Volume, Fade, Speed, Stay put, More, Delete`, the Fade row). The 🔈 **Mute clip sound** button at the head of the clip row is added as a tip. |
| S3 | 10 and 13 | Same title, same content. | **13 merged into 10 and deleted**; 10 says it covers the crossfade, the dips and On every cut. (14 stays; it points at 10 by number only through "tutorial 08".) |

## Not wrong today, but will be when something lands
- **10 and 14 describe the ◇ transitions ("the 2.7 release"). No wip tree has it**, only `hunt/simple-tip`. Against `wip/v17.44-tree` the bold names *Dip to black, Dip to white, On every cut, Turn into a transition* are **absent**; against `hunt/simple-tip` they pass. Do not ship 10 and 14 until 2.7 lands (the tutorials already say "needs the 2.7 release").
- **01 and 08 describe today's cog** ("a switch with **Simple** on the left and **Full** on the right", "**What should you use?**"). The R-COG1 redesign removes the words from the small switch (two icons) and turns "What should you use?" into a ⤢ button; **when it lands, 01 steps 3 and 6 and 08 step 1 need a rewrite** (the words in the big switch inside the Editor block stay).
- **11 (drag clips) and 12 (friends in Simple)**: their strings exist on v17.44 (`moved to`, `clips stay put`, `now plays at`, are built at run time, so the bold/quote check cannot see them). I did **not** re-walk them: 11 needs a real finger holding a clip, 12's second half needs two devices. The suite's drag and friends tests were green on v17.44 in the PRE4 pre-flights; that is the evidence, and it is not a walk.

## The new check (`tools/check_tutorials.py`)
Every **bold** name in a tutorial (a list like **Length, Audio** counts as each) must appear in `index.html` or `js/*.js` of the tree it is run against. Exceptions are in `tutorials/.bold-allow.txt` and `tutorials/simple/.bold-allow.txt`, one per line, each with its reason, so a name can only be waived out loud.
```
python3 tools/check_tutorials.py                                        # Full set: 210 names, 0 missing (against main v17.37)
python3 tools/check_tutorials.py tutorials/simple --src <wip/v17.44-tree checkout>    # 5 missing: exactly the 2.7 transition names
python3 tools/check_tutorials.py tutorials/simple --src <hunt/simple-tip checkout>     # 0 missing
```
It is a script, not a suite test: the suite runs in the page and the tutorials are not served to it until the Tutorials tab exists. Wiring it into ship.sh is one line once the builder lands the tab. It cannot see a button that exists but moved or changed meaning (F1 and S2 were exactly that); it only stops a renamed or removed label going unnoticed.

DONE: TUT1. Full set re-checked on main v17.37 at 380 and 1280: two wording fixes (17: the cog is in the time-counter row on a PC, not at the top; 02/05/06: the A S D keys are at the left end of that row, not in the panel). Simple set against v17.44: 02's tool list updated, 09 rewritten for option E (Audio opens Speed / Volume / Reverse / Take sound out, Done goes back one row), 13 merged into 10. 10 and 14 need the 2.7 transitions, which no wip tree has yet. 01 and 08 will need a rewrite when the cog redesign lands. New `tools/check_tutorials.py`; 210 Full names, 0 missing. 11 and 12 not re-walked.
