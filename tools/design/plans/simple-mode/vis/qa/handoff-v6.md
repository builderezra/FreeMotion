# Handoff from the V6 fix (29 Sep)

All seven V6 defects are fixed inside `v6.js`. None of them needed a change anywhere else, but four things turned up
that belong in other files. Each is small.

## Changes in other files

1. **`DESIGN.md` §10.3 (line ~2752)** still says Full outlines a clip Sam is dragging with *"Sam · main track"*.
   V6 now draws and says *"Sam · clip row"*, the word every other page uses. The design text (and so the app's label)
   should say the same, or V6 should go back to "main track". Pick one; right now the page and the design disagree.

2. **`v12.js` line ~265** says the own-devices line is "not covered here … V6 draws it". That is now true: it is
   **moment 9, "Your phone and Mac"** (Phases 2–3 show *"Your phone can edit · clips stay put"* → Options › → Make it a
   Viewer; Phase 4 shows the Share panel's *"This is me (my other device)"*). Optionally say "V6, moment 9" so he can
   find it.

3. **`DESIGN.md` §3.11 / §10.4 4d, a line that does not fit.** On his phone (a `self` guest whose name matches the
   owner's), the owner reads *"the device that started sharing"* (§3.11 `whoWord`). So the 4d "kept" line on the phone
   becomes *"The device that started sharing deleted a clip — your title ‘Castle for Mia’ was kept (now Stay put)"*,
   and the moved line *"The device that started sharing moved 1 clip"*. Both are far past one 348 px row (§3.11 says
   every line is written for that width). V6 shows them as written, cut with "…" in the tray and in full under the
   device. The design should either give the owner a short name here ("your Mac" / "your computer", as the owner side
   already does for the phone) or say whether the moved line fires between his own devices at all (4c item 4 only
   exempts the "kept" line).

4. **`DESIGN.md` §3.12 rule 1(a) vs §10.4 4d.** Rule 1(a) sends button-less lines (moves, reorders) to the hidden
   `#sm-live` and never to the tray; 4d says a remote ripple shows *"Sam moved 4 clips"* as a line. V6 keeps what it
   drew before (the line in Quick's tray, a toast in Full), and never lets that line replace a tool someone is typing in
   (moment 6). The design should say which one wins.

## What changed in V6 (so nobody re-files it)

- **Readable on a phone.** Under 740 px the page shows one device at a time at full size (348 px wide at a 380 screen,
  no scaling; the smallest text is the kit's own 8 px caption on the picture). Two tabs swap devices, a tap on an
  "On …" box does too, and each step switches to the device where it happens, then to the other one as the change
  reaches it. From 740 px up the two devices sit side by side, also at full size (394 px each at 1280).
- **Ruler drag by finger.** The ruler is its real 18 px again, with 10 invisible pixels of extra finger room under it.
  A real touch drag (CDP `Input.dispatchTouchEvent`) moved Sam's playhead from 5.2 s to 10.1 s.
- **Nine moments**, as DESIGN §18 lists them: the five from before plus 6 *Sam types captions · you delete and trim
  earlier clips*, 7 *Sam adds a title · then you undo*, 8 *You delete a clip · that carries Sam's title*, 9 *Your
  phone and Mac · both in one session*. Each has its Phases 2–3 / Phase 4 / Phase 5 version. The Mac in moment 9 is
  drawn as a narrow window (its title bar says so), because a scaled-down PC frame has unreadable words on a phone.
- **Headers line up** (both at the same height at 1280; at 380 only one shows at a time).
- **Wording:** no "main track", no "Keep my frame", no 4a/4b/4c/4d on screen. "What each release adds" reads
  Phase 1 / 2 / 4 / 4 / 4 / 4 / 5; the result tags say "Phase 4" / "Phase 5" and only show in the Phase 5 view, where
  they tell the two apart.
- **No silent controls.** Every button on a device that the page does not act on (Play, Undo, Redo, Export, To start,
  To end, the tools, Close gap, +, the line's buttons, the menu, the Share panel) shows *"That button isn't part of
  this page. Use Play or Next."* Your Full / Quick switch, the section openers and every **Show** button work.
- Checked in headless Chrome at 380 (touch) and 1280: all 9 moments × 3 releases × every step, no errors, no sideways
  page scroll.
