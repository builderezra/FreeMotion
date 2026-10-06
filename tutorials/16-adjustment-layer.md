# Colour-grade everything with an Adjustment layer

You'll be able to change the look of your whole video with one layer.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Adjustment**. If you can't see it, swipe the tiles sideways. A message says its effects apply to every layer below it.
3. The new layer arrives with **Brightness** and **Saturation** already on, so the picture looks brighter and richer at once.
4. Open its **Effects** card. Tap **Brightness** to open it. Drag its ruler left to raise it, or tap the number and type one. Do the same for **Saturation**.
5. Tap **+ Add Effect** to add more, as in tutorial 07.
6. To soften the whole look, open the **Mixing** card and lower **Opacity**.
7. To grade only part of the video, shorten the adjustment's bar on the timeline, like any clip (tutorial 02).
8. To remove it, select it and tap the bin in the top bar.

On a computer: click an empty spot in the timeline so nothing is selected. The Add panel is at the bottom left. Press Delete to remove the layer.

Tip: Only layers **below** the adjustment are changed. A title above it stays untouched.

If it doesn't work: If your video doesn't change, the adjustment is below it. Delete it, tap the small up-down switch in the row with the time counter to move the add row to the top, and add it again.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 add row | js/timeline.js:2795 | yes |
| 2 Adjustment tile and its message | js/addmenu.js:281 | yes |
| 3 arrives with Brightness and Saturation | js/app.js:3470 | yes |
| 3 labels Brightness / Saturation | js/compositor.js:54 | yes |
| 4 adjustment layer has Effects card | js/inspector.js:3802 | yes |
| 4 tap a row to open it | js/inspector.js:1754 | yes |
| 4 drag LEFT to raise | js/inspector.js:979 | yes |
| 5 + Add Effect | js/inspector.js:2284 | yes |
| 6 Mixing card | js/inspector.js:2676 | yes |
| 6 Opacity row | js/inspector.js:6085 | yes |
| 7 adjustment spans the project like a clip | js/app.js:3469 | yes |
| 8 bin in the phone top bar | index.html:407 | yes |
| Tip: applies to everything BELOW | js/addmenu.js:280 | yes |
| If: new layers land at the add row position | js/app.js:2943 | yes |
| If: the up-down switch moves the add row | index.html:544 | yes |
| PC: Delete key deletes the layer | js/app.js:9020 | yes |
