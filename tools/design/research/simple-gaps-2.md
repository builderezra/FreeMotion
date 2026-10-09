# R8: the ten CapCut gaps from R5, re-checked against the 2.6 tip plus S10 and S11

**What I checked against:** `hunt/simple-r7-fixes` (2.6 plus the three R7 bug fixes) and `hunt/simple-transitions` (2.7, written but not landed). The first is what a builder gets from S12; the second is only a branch. The ten gaps and their numbers are the ones in `tools/design/research/simple-gaps.md` (R5, on this branch). Labels: **Verified** = a test in the suite names it and I ran it; **Read** = read in the code on the branches above; **Opinion** = mine.

**How "closed" is judged.** A gap is closed when a beginner can do the thing from Simple's own controls without opening Full, and a test says it works. It is partly closed when the thing is reachable but not where CapCut puts it, or only one half is there. Every row says which.

## The table, ranked by how often I expect a beginner to hit it first

The ranking is **Opinion**: no source I found counts which feature beginners reach for first (R5 said so too), so this is how early in a first video each one comes up, plus how much it stops them.

| Rank | R5 # | Gap | Status now | Evidence |
|---|---|---|---|---|
| 1 | 1 | **Auto captions** | **Still open.** Nothing in Simple creates a captions unit. A Captions unit that Full made has a tray (`js/simple-tools.js:253`, `More` and `Delete` only). | Read: no `planCaptions`, no Captions button in the project tools row (`js/simple-tools.js:202-205` holds Clips, Text, Sound, Overlay). Planned for Phase 3 in DESIGN. |
| 2 | 2 | **Transitions between clips** | **Closed on the 2.7 branch, open on the 2.6 tip.** On `hunt/simple-transitions`: a ◇ above every cut, a row with None, Crossfade, Dip to black, Dip to white, a length and "On every cut", and Turn into a transition on an existing crossfade. On the 2.6 tip nothing creates one (R7 stuck point 1). | Verified: `simple P2.7 · T1` to `T10` at 1280 and 380 (see `plans/simple-transitions`). One thing is **still not like CapCut**: the sound hard-cuts at the cut (picture only, DESIGN section 12.1). |
| 3 | 4 | **Speed, then speed curves** | **Partly closed.** Speed is in the tray (a row: 0.5x, 1x, 1.5x, 2x, 3x and a slider) and so are Volume and Reverse; **no speed curves and no presets** (montage, hero time). A clip that already has a ramp says so and offers "Use one speed". | Verified: `simple P2.3 · the Speed row`, `simple P2.3 · the tray: a video clip offers Speed, Volume, Replace, Reverse`. Read: `js/simple-tools.js:304` (the ramp line). Closed since R5: speed no longer lives only in More. |
| 4 | 7 | **Music: fade in and out** | **Closed.** A song has Volume, Fade and Speed in its tray; Fade is an In and an Out stepper in 0.5 s steps, on the music layer (R5 had not checked that it acts on one). | Verified: `simple P2.3 · Volume and Fade` (fade acts on the sound target; undo is one step) and `simple P2.3 · the tray: ... a song Volume, Fade and Speed`. |
| 5 | 5 | **Text looks and animations** | **Still open in Simple.** Text opens the editor with the word selected (good), but style and animation are reached only through More, then Full's inspector. | Read: `js/simple-tools.js:252` (a title's tray: Edit words, Stay put, More, Delete). No Look row. |
| 6 | 6 | **Fit, fill or a blurred background when a clip's shape does not match** | **Still open.** No "fill the frame" or blur button. Backfill exists only as an effect behind More. | Read: `grep` for a fill or backfill command in `js/spine-edit.js` and `js/simple-tools.js` finds none. |
| 7 | 3 | **One filter for the whole video, "apply to all"** | **Still open.** The words say "looks still work" offline (`js/spine-words.js:66`), but there is no Look for all in the tray; `js/simple-tools.js:8` lists it in a header comment as a later phase. | Read. |
| 8 | 9 | **Stickers and emoji** | **Still open.** Overlay still only asks the phone for a video or a photo (`js/simple-tools.js:205`, `pick('video/*,image/*')`). | Read. |
| 9 | 10 | **Start from a template** | **Still open.** Nothing inside Simple opens Home's Templates. | Read. |
| 10 | 8 | **A music library** | **Still open, and not a code problem** (content and licensing). Sound still offers music from the phone's files, sound effects and recording a voice. | Read. |

Count: **2 closed** (transitions on the 2.7 branch, music fades), **1 partly** (speed), **7 still open**. If 2.7 does not land, transitions is open again and the count is 1 closed, 1 partly, 8 open.

## What S10 and S11 changed that is not one of the ten

- **R7's stuck point 7 (the join cannot be tapped while the first clip is selected) is fixed by the ◇ lane on the 2.7 branch**, not by S10: the ◇ sits above the clip row in its own lane, so a selected clip's trim grips do not cover it. Verified: `simple P2.7 · T8` asserts no grip overlap with either neighbour selected. The join itself, between the clips, is still covered by the grip; I did not change that.
- **S10 closed R7's stuck points 3 (a long song stretches the film: it was by design and now has a test that says so), 5 (the PC first screen overlapped Full's Add grid) and 6 (the time readout).** Verified: `simple P2.6 · S10a`, `S10b`, `S10c`.

## Where the three small ones sit (Opinion)

R5's own first-three recommendation was captions and Look for all, then three small buttons (Speed in the tray, Fill the frame, text looks). Speed is done. The two that remain small are **Fill the frame** (one command that turns on Backfill, S) and **a text Look row** (a row of presets, S to M). Captions is the biggest "wow in one tap" and the biggest build.

## Limits

The CapCut half of every row is still from R5, which came from guides and search snippets, not the app. Nothing here was walked on a phone; the status column comes from the suite and the code. I did not count how often beginners hit each gap, so the ranking is mine.
