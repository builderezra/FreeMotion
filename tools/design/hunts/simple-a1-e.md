# Option E built (S9): one "Audio" tool

Branch `hunt/simple-a1-e`, one code commit on `hunt/simple-2.3` (974bc0fb): `9472601d`. Not merged into any other branch. Verified = ran it here (Chromium 141, Linux container).

## What it is
A main video clip's tray was 13 tools (Length, Speed, Volume, Move earlier, Move later, Lift off, Duplicate, Crop, Replace, Reverse, Take sound out, More, 🗑). It is now **ten**: Length, **Audio**, Move earlier, Move later, Lift off, Duplicate, Crop, Replace, More, 🗑. Audio opens one row: **Done, Speed, Volume, Reverse, Take sound out** (Put sound back once a twin exists). Speed and Volume open their own rows exactly as before and **Done comes back to Audio** (`openRow(kind, id, from)`, `rowBack`), Done from Audio goes to the clip's tray. Overlay videos, songs and pictures are unchanged (they keep Speed and Volume on the tray; only a main video clip had the thirteen).
Files: `js/simple-tools.js` (`audioRow`, `ROWS.audio`, the tray, `openRow`, `rowBack`, `rowSig`), `js/spine-words.js` (`audio`, `audioTitle`), `styles.css` (one rule), `index.html` (three `?v=` busters: styles 760 to 761, simple-tools 5 to 6, spine-words 7 to 8).

## The cut, measured (Measured, 1280x800 and 1024x600)
With the row as first drawn the five buttons were **317 px in a 306 px tray** (band 307): **Take sound out ran 10 px past the band** (219.5 to 316.9; its words are 85 px wide), not 2. (The brief said 2 px; I measured 10 px at both sizes.) Fix: `#sm-tray[data-row="audio"] .sm-tool { min-width: 44px; padding: 0 3px }`, which makes the five **278 px**, nothing cut, nothing to scroll to, at 1280 and 1024. The attribute is set in `fillTray` and removed for every other tray. Mutation X1 (the rule emptied) fails the test with "the Audio row scrolls sideways (317 px in 306): its last button is cut".

## Layout, measured at the three sizes
| size | clip with touching neighbours (10 tools) | clip next to a gap (11 tools: Close gap joins) | open Audio row |
|---|---|---|---|
| 1280x800 | **two rows, [5,5]**, every tool inside the band, More and 🗑 last | **one scrolling row** (11) | one row, 278 px, no scroll |
| 1024x600 | **[5,5]** | one scrolling row | no scroll |
| 380 | one row, More and 🗑 pinned, Audio reachable | one row | five buttons in 380 px, no scroll |
**The limit, said plainly:** `TWO_ROW_MAX` stays 10. A clip next to a gap has eleven tools, and ceil(11/2) = 6 a row is 324 px in a 306 px band, so it keeps today's one scrolling row (as the 13-tool tray did before this). Raising the cap would cut a button on every window. If you want that case on two rows too, one of Lift off, Duplicate or Replace has to move (Guess: Lift off, which is rare).

## Tests (two, `simple P2.3 · S9 option E: …`, both loop the three sizes through `smTrayBAt` / `atPhoneWidth`)
1. **The tray:** exact tool set, none of Speed/Volume/Reverse/Take sound/Put sound on it, `[5,5]` and no `bad` from `smTrayBMeasure()` on a PC, Audio/Length/More/🗑 pressable at 380, and the eleven-tool case stays one row with Length and Audio reachable.
2. **The Audio row:** the five buttons, every one inside the tray with its words inside it, 44 px wide at least, nothing to scroll; Speed and Volume open their rows and Done returns to Audio; Reverse is one step, shows pressed, goes back with one more press; Take sound out makes the twin in one step and **the row turns the button into Put sound back where it was** (`again()`, below); Put sound back removes it; Done goes to the clip's tray.
Six 2.3 tests pressed Speed, Volume, Reverse or Take sound out on the clip's own tray; they now open Audio first (`smOpenAudio`): the Speed row, Volume and Fade, Reverse, T24, the tray offers, and "More is always in reach" (its wheel check drops Reverse, which is no longer at the end of the row).

## What was run (Measured)
| run | result |
|---|---|
| the two new tests on the 2.3 tip (`wt-s9red`) | **0/2**, red by what they see ("the clip's tray has no Audio tool (it holds length,speed,volume,…)") |
| `?only=simple` on option E, 1280 and 380 | **101/101** at both (99 before plus the two) |
| mutations (`tools/design/hunts/simple-a1-e-mut.sh`) | **5 of 5 caught**: X1 the cut rule, X2 the row closing after Take sound out, X3 the old tray, X4 Done leaving Audio for the tray, X5 Reverse not pressed |

## One thing that cost a day of the afternoon, so it is written down
Take sound out makes and removes a layer, and `simpleTools.sync()` closes a row when the selection is not exactly the row's clip. During the command the scene is half done, so the row closed and the button list stayed stale: **without `again()` the row jumped back to the clip's tray after Take sound out** (mutation X2). `again()` redraws the Audio row when the command's promise settles. A test that recognises the twin needs a media record for the clip (`smP2(…, { media: [{ name: 'A', rec: smRec(…) }] })`, as T24 does): without one `isTwinOf` is false and the row shows no sound button at all; my first three failures were that, not the product.

## Not done
- No Full change (the Audio tool is Simple's tray only).
- 2.4+ branches are not rebased onto this; if E is picked, the 2.4 tray tests that name Speed/Volume/Reverse/Take sound on a main clip need the same `smOpenAudio` step (Guess: S7's `Follow clips` tool is unaffected).
