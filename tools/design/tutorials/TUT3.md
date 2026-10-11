# TUT3: the Tutorials tab on `hunt/1082-tut` (3183851f, v17.37)

Nothing on the builder's branch was touched. The pictures are in `tut3/` beside this file.

## 1. `?only=1082`, six tests, at the 900 frame and at `--width 380`
**All six are green at both widths. No red.** (Headless Chromium 141 on Linux, the tree's own `tests/_cdp.py` copy; run while other passes were going in the container, which these DOM tests do not mind.)

| test | 900 | 380 |
|---|---|---|
| `1082 every tutorial renders clean — no reviewer notes, one step per numbered line, every bold kept, only text` | ok | ok |
| `1082 a hostile lesson cannot put markup on the page — it is shown as text and nothing runs` | ok | ok |
| `1082 every button a shown tutorial names is in the app, and a hidden one is still waiting for its feature` | ok | ok |
| `1082 the Tutorials tab lists the lessons as Home cards, Start here first, and a card opens its lesson` | ok | ok |
| `1082 on a phone the lesson fills the screen, reads in both Home looks, and never scrolls sideways` | ok | ok |
| `1082 the service worker drops a lesson an older release cached, and keeps this release's` | ok | ok |

## 2. Pictures for Ezra (real app, `hunt/1082-tut`)
- `tut3/tut3-1-phone-tab-and-lesson1.jpg`: at 380, the Tutorials tab and lesson 1 ("Make your first video"), dark Home and light Home.
- `tut3/tut3-2-phone-lesson17-part1.jpg` to `part4.jpg`: lesson 17 (the longest, "Edit a project together with a friend") in full on a 380 phone, dark and light side by side, cut into four pages with `tools/phonepages.py` (the whole lesson is one image 6800 px tall otherwise).
- `tut3/tut3-3-pc.jpg`: at 1280, the tab, lesson 1 and lesson 17, dark and light.

What the tab does in the pictures: 25 cards (the 20 Full lessons, then the 5 shown Simple ones under their own "SIMPLE EDITOR" heading), a green "Start here" ribbon on lesson 1, the + button is gone on this tab (the bottom bar has a gap where it was), the reader has a back arrow, "Full editor · 1 of 20", the steps as numbered rows with the button names in bold, and Previous / Next at the foot (Previous greyed on lesson 1).

## 3. Two things worth the builder's eye (not test failures)
1. **Lesson 17 still says "Click the cog (Canvas settings) at the top"** for a computer. At 1280 there is no top bar: the cog is in the row with the time counter, just left of the Export arrow (see `tutorials-recheck`, `tools/design/tutorials/RECHECK.md`, F1). Visible in `tut3-3-pc.jpg`.
2. **At 380 two card titles are cut with an ellipsis** ("Make a photo or title move acr…", "Add a title that shows for part …"); on the desktop the whole title shows. A two-line title on the phone card would show them in full. Cosmetic.

DONE: TUT3. `?only=1082` is 6/6 green at 900 and at 380. Pictures of the tab (dark and light Home) and of lessons 1 and 17 at 380 and 1280 are on `hunt/tut3-check` under `tools/design/tutorials/tut3/`; the 380 lesson 17 is split with `tools/phonepages.py`. Two small observations (lesson 17's cog sentence, two truncated phone card titles), no failures.
