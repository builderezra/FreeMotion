# Draw on your video with Sketching

You'll be able to draw freehand strokes and rub them out.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Sketching** (the pencil). If you can't see it, swipe the tiles sideways.
3. A small bar appears at the bottom of the screen (on a computer, just under the picture). Press and drag on the picture to draw. Lift your finger and the stroke stays.
4. Tap the colour swatch to pick a colour. Drag the width slider to make the brush thicker or thinner.
5. Tap the eraser icon, then touch or drag over a stroke. The whole stroke disappears; it can't rub out just part of one. Tap the eraser again to go back to drawing. If the wrong stroke goes, tap the undo arrow.
6. The two curved arrows on the bar are undo and redo for your strokes.
7. Tap **Done** when you finish. Everything you drew is one layer on the timeline.

On a computer: click an empty spot in the timeline so nothing is selected. The Add panel is at the bottom left. Drag with the mouse to draw.

Tip: On a computer, the bar counts your strokes ("3 strokes"). On a phone there isn't room, so the count is hidden.

If it doesn't work: **Close** only closes the bar. Your strokes are already on the canvas, so it does not throw them away. To take one back, use the undo arrow.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 add row | js/timeline.js:2795 | yes |
| 2 Sketching starts freehand | js/addmenu.js:197 | yes |
| 3 press-drag draws a brush stroke | js/draw-tool.js:2 | yes |
| 4 colour swatch | js/draw-tool.js:776 | yes |
| 4 brush width slider 1-40 | js/draw-tool.js:777 | yes |
| 5 eraser toggle | js/draw-tool.js:733 | yes |
| 6 undo / redo glyphs | js/draw-tool.js:726 | yes |
| 7 Done | js/draw-tool.js:788 | yes |
| 7 whole session is ONE layer | js/draw-tool.js:756 | yes |
| Tip: stroke counter | js/draw-tool.js:765 | yes |
| If: Close keeps the strokes | js/draw-tool.js:752 | yes |
| Tip: stroke count hidden under 420px | styles.css:6079-6080 | yes |
| 5 eraser removes whole strokes | js/draw-tool.js:573 | yes |
| 3 bar at the bottom on a phone, under the picture on a computer | styles.css:6012, :6024-6028 | yes |
