# Walk of the four Simple-mode tutorials (T9)

Branch `980-p22-r3` at a51b5e1d (its index says v17.24; it carries #1097's code), served from a worktree, headless Chromium 1194 at 380 x 760 with real touch events, one screenshot per step in `shots/NN-MM.jpg` (tutorial, step). File:line numbers below are on that branch, not on main: Simple mode is not on main yet, so they will move when it lands. **Walked** = I did it and read the screenshot or the state. **Read** = code only.

Walked: tutorial 01 steps 1 to 7 (7 to 9 in the log), 02 steps 1 to 6, 03 steps 1 to 8, 04 steps 1 to 9. Not walked: Export MP4 (no H.264 encoder here), the warning pop-ups of a switch with an open crop or pen, the black band card, Start-edge trimming, Move earlier/later, Clips with the playhead inside a clip, Sound effects and Record voice, anything at 1280. The old tutorials' habit of tagging this per step is kept in the `<!-- -->` comments.

## Two things that look like bugs in Simple (for whoever builds it; not for me to fix)
1. **The back arrow leaves the project while a clip is selected, though it says it closes the clip.** In Simple with one clip selected, the phone's top-left button is labelled "Close clip options" (js/app.js:1023-1026, `phone && n === 1`) but one tap went straight to Projects (Measured: `home` false before, true 200 ms after, on a freshly reopened project and after a tap on a clip). In Full the same tap deselects and stays (Measured: class `m-editing` removed, `home` false). Cause (Read): js/mobile.js:354-358 only deselects when the body has `sel-mode` or `m-editing`, and Simple sets neither (js/app.js:1014-1017 `!simple &&`), so it falls through to `FM.home.open()` (js/mobile.js:362). Nothing is lost (autosave). Tutorial 02 warns about it; fix by adding `sm-has-sel` to the deselect branch, or label the button "Projects" in Simple.
2. **A text bar keeps its old label right after the edit.** After typing "Hello" and tapping the tick, the purple bar above the clips still said “Text” while the preview showed Hello; it changed to “Hello” on the next redraw (a tap on empty space). Cosmetic; Measured once at 380.

Seen once, not chased: right after a split the preview showed black for a moment (shots/03-05.jpg) and was fine at the next frame.

## What I did not have to guess
- Switching and the "What should you use?" card are in the cog's top block (js/app.js:8395-8440); the cog closes itself 260 ms after a switch unless Canvas has unapplied picks or Friends is open (js/app.js:8410).
- Play is the time counter, as in Full (js/app.js:6773-6792; there is no play button in either editor on a phone).
- In Simple the bottom row is Clips / Text / Sound / Overlay and never goes away (js/simple-tools.js:7, 186-191); the selected item's tools sit above it.

# T10: the four tutorials after those (05 to 08)

Same branch (`980-p22-r3`, a51b5e1d, label v17.24), same method: 380 x 760, real touch events, a screenshot per step (`shots/05-NN.jpg` to `08-NN.jpg`). Setup (project, import, switch to Simple) is the walker's, not the tutorial's.

Walked: 05 steps 1 to 10 (every tap by touch). 06 steps 1 to 7 and the two ticks. 07 step 1 and step 5 (the dropdown was set by a script; a headless browser cannot open a phone's list). 08 steps 1, 3 and 5.
Not walked: Export MP4 (no H.264 encoder here), what a phone shows after Save frame, the Filters and Audio effect tabs, how a neighbouring clip moves when speed changes, a camera or group in Simple (I could not make either appear: a group of two layers showed as an overlay plus the clip, and a camera I added by a script was gone after the switch to Simple), a hop with "Open in Full".

## Findings (for whoever builds it; not for me to fix)
1. **Speed accepts 1 and the clip becomes ten minutes long.** Typing 1 in Speed % gave speed 0.01 and a 600.3 s clip; 1000 gave speed 10 and 0.6 s (js/inspector.js:4309, `SPD_MIN = 0.01`, `SPD_MAX = 1000`, with the clip length following in :6017-6027). One missing 0 on a phone keypad and the project is ten minutes long, with no line saying so. Walked, both ways.
2. **The ✦ says "Has moves and effects" but effects do not light it.** js/spine.js:414-416 sets it for a block, for keyframes (`animatedProps`) and for behaviours; an effect in `layer.effects` is not in that list. Read only, not walked (I walked the keyframe case, which does light it).
3. **The back arrow leaves the project even with the Position / Scale panel open on a selected clip** (the T9 finding 1, seen again while setting up tutorial 08: one tap went to the Projects list, and the project's card said OPEN). Walked once.
4. **A slow swipe that starts on a panel button raises that button's "Reset …" menu** instead of scrolling the panel (walked twice: "Reset Outline & Shadows", "Reset Speed"). A quick drag scrolls it. In a tutorial that means "slide quickly" is not a joke.

## What I did not have to guess
- Simple's More opens the same inspector panel Full uses for the selected layer (js/simple-tools.js:202, :412), so tutorials 05 and 06 use Full's panel and its words.
- The effects browser, its search, and the tick-then-Add flow are Full's (js/fx-browser.js), reached the same way.
