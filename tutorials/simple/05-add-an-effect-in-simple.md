# Add an effect in Simple

You'll be able to put a look on a clip (a dark vignette, a glow, a filter), change it, switch it off, and take it away.

Before you start: a project in Simple with a clip in it (tutorials 01 and 02). <!-- shots/05-01.jpg -->

1. Tap the clip in the timeline so it is selected. The tools for it appear above the bottom row. <!-- walked: sel=video; js/simple-tools.js:202-231 trayFor; shots/05-01.jpg -->
2. Tap **More** (the three dots). A panel with nine big buttons opens under the tools. <!-- js/simple-tools.js:202 (More → openPanel), :412; walked: Colouring, Outline & Shadows, Mixing, Position / Scale, Speed, Volume, Customise Shape, Presets, Effects; shots/05-02.jpg -->
3. The panel is short. Put a finger on it and slide up until **Effects** shows (bottom right), then tap **Effects**. <!-- walked: a real touch drag of 140 px scrolled the panel by 125 px; a slow swipe that starts on a button opened a "Reset …" menu instead, so slide quickly; shots/05-03.jpg, 05-04.jpg -->
4. Tap **+ Add Effect**. The effects list opens over the picture. <!-- js/inspector.js:2284; shots/05-05.jpg -->
5. Tap the magnifier on the right and type **Vignette**. <!-- walked; shots/05-06.jpg -->
6. Tap the **Vignette** tile. A blue **1** appears on it. <!-- walked; shots/05-07.jpg -->
7. Tap **Add 1 effect** at the bottom. The list closes, a note says "Added 1 effect", and **Vignette** is a row in the panel. <!-- js/fx-browser.js:537; walked: the clip's effects = [vignette]; shots/05-08.jpg -->
8. To change it, tap the number next to **Amount** (it starts at 0.60), type **1** and press Return. The corners of the picture go darker. <!-- walked: amount 0.6 → 1; shots/05-09.jpg -->
9. To switch it off without losing it, tap the **eye** on its row. Tap again to switch it on. <!-- js/inspector.js:1798; walked: enabled false then true; shots/05-14.jpg -->
10. To remove it, tap the **⋯** on its row, then **Delete**. If you did it by mistake, tap the **undo** arrow right of the counter and the row comes back. <!-- js/inspector.js:1463-1530 the menu is Reset, Duplicate, Copy effect, Favourite, Save this effect as preset…, Delete; walked: Delete → 0 effects, undo → vignette back with amount 1; shots/05-10.jpg, 05-11.jpg, 05-12.jpg -->

Tip: The picture behind the list jumps around while you browse (the list is previewing each effect on a different moment of your clip). It goes back to where you were when the list closes. <!-- walked: the time went 0 → 1.13 → 4.07 → 1.07 → 0 -->

Tip: **Filters** and **Audio** next to **Visual** work the same way: tap one, then **+ Add Effect**. Hold any effect to browse its presets. <!-- shots/05-05.jpg; js/fx-browser.js:1949 the hint; the Filters and Audio tabs were not opened -->

If it doesn't work: If nothing seems to change, the effect may have nothing to act on at that moment of the clip. Slide the timeline to another moment and look again. <!-- the "changes nothing here" line is Full's (js/fx-thumbs.js effectDoesNothing); not seen in Simple in this walk --> Tiles marked "Needs a setup" need something chosen first. <!-- shots/05-05.jpg: a "Needs a set…" tag on one tile; what it asks for was not opened -->

## Verification
| step | what I did (380 px, branch 980-p22-r3, v17.24) | what happened | file:line |
|---|---|---|---|
| 1 to 2 | tapped the clip, More | nine-button panel | js/simple-tools.js:202 |
| 3 | dragged the panel up, tapped Effects | Visual / Filters / Audio and + Add Effect | js/inspector.js:2284 |
| 5 to 7 | searched, picked, Add 1 effect | layer.effects = [vignette] | js/fx-browser.js:537 |
| 8 | typed 1 in Amount | params.amount 1 | js/inspector.js (the effect rows; line not pinned) |
| 9 | eye twice | enabled false, then true | js/inspector.js:1798 |
| 10 | ⋯ → Delete, then undo | 0 effects, then vignette back | js/inspector.js:1530 |
| Filters, Audio tabs | not opened | Read only | — |
