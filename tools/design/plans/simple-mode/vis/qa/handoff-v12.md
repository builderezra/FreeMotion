# Handoff from the V12 fix (29 Sep)

All ten V12 defects are fixed inside `v12.js`. There is no `v12.css`. Five things belong in other files.

## Changes in other files

1. **Optional: move the small-phone picture out of `v12.js`.** The 380×667 picture is real (the app at v17.12,
   same method as the others). Because this fix could only edit `v12.js`, it is embedded as WebP in base64:
   52 KB on the second-to-last line (`img667()`). To move it out:
   - copy `/private/tmp/claude-501/-Users-ezrasmith-Claude-FreeMotion/1a172f83-0fdf-4f37-9706-58687655dccd/scratchpad/v12/out667/v12-phone-667.webp`
     to `vis/img/v12-phone-667.webp`;
   - in `v12.js` SHOTS, change the third entry to `file: 'v12-phone-667.webp'` and drop `src: 'embedded'`;
   - delete `img667()` and the `srcOf` special case, and fix the note at the top of the file.
   The hub must publish `img/v12-phone-667.webp` with the other `img/` files. Leave it embedded and nothing breaks.

2. **A design finding for `DESIGN.md` §6.1 / D2-B (measured, not in the design yet).** At 380×667 the Full phone
   options strip is already too short **today**: 254 px of room for 278 px of buttons, so "clear export marks" is
   half cut off. With D2-B's switch on top it needs 324 px, and the last two buttons are hidden. At 380×800 it was
   285/285 before and 332 after. D2-B is the recommended pick, so its "small fix" (a shorter item, or a strip that
   is meant to scroll) matters most on small phones. The D2 sheet (V10) should say so too.

3. **The QA's "V6 draws it … V6 does not" was out of date.** `v6.js` now has moment 9, "Your phone and Mac" (the
   V6 fix, `handoff-v6.md` item 2). V12 now also draws the own-devices case itself: at 380, the phone started
   sharing, so its line reads "Your computer can edit · clips stay put" (§3.11 `whoWord`). At 1280, the Mac started
   sharing, so its line reads "Your phone can edit · clips stay put". Both show Options › open (Make it a Viewer ·
   Open in Full) and link to `#v6`. Nothing to change in V6.

4. **The old name is still in `DESIGN.md`**, at line ~82 ("The chrome check is visualizer V12") and the §18 V12 row
   (~3784, **The chrome check**). The hub (`kit.js` PLAN) and `v12.js` both say **Buttons on the video** now. Rename
   it in the design, or leave the design using the internal name. Either way, Ezra never sees "chrome".

5. **`kit.js` `VIS.pcFrame` (minor).** Its ResizeObserver calls `f.fit()` straight away, not on the next frame the
   way `phoneFrame` does. When the viewport resizes (seen only during a full-page headless capture), Chrome logs
   "ResizeObserver loop completed with undelivered notifications". Normal use (scrolling, the picture viewer,
   resizing the window) logged 0 errors at 380 and 1280. Giving `pcFrame` the same rAF deferral would silence it.
