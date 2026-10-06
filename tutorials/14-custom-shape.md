# Draw your own shape with Custom shape

You'll be able to place points to make a filled shape, then smooth or bend it.

1. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) Then tap the row that says "Tap to add a layer".
2. Tap the **Elements** tab, then **Custom shape** (a line joining small squares). If you can't see it, swipe the tiles sideways.
3. A bar appears. Tap the picture where you want the first corner. Tap again for each next corner.
4. To nudge a point before placing it, swipe on the pad, then tap **+ Add point**.
5. After three points the bar says it is ready to finish. Tap **Done**, or tap back on your first point.
6. Your shape is now a layer. Select it and open **Customise Points**.
7. The panel tells you: tap a point to select it, drag its handles to shape a curve, tap a hollow ring to add a point, double-tap to delete.
8. On the left edge, the three icon buttons under the diamond make the selected point smooth (Curve), sharp (Corner), or delete it (the bin).

On a computer: click an empty spot in the timeline so nothing is selected. The Add panel is at the bottom left. Click to place points.

Tip: **Cancel** on the bar throws away the points you placed, because nothing is a layer until you tap **Done**.

If it doesn't work: The bar only finishes a shape with at least three points.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 add row | js/timeline.js:2795 | yes |
| 2 Custom shape starts vector mode | js/addmenu.js:216 | yes |
| 3 tap anchor points | js/draw-tool.js:3 | yes |
| 4 pad and + Add point | js/draw-tool.js:773 | yes |
| 5 hint after three points | js/draw-tool.js:766 | yes |
| 5 Done / land on the first point finishes | js/draw-tool.js:251 | yes |
| 6 card is Customise Points | js/inspector.js:2727 | yes |
| 7 panel hint text | js/inspector.js:4862 | yes |
| 8 Curve button | js/inspector.js:4834 | yes |
| 8 Corner button | js/inspector.js:4835 | yes |
| 8 Delete point | js/inspector.js:4836 | yes |
| 8 diamond is in the same left column | js/inspector.js:4827 | yes |
| Tip: Cancel throws the points away in vector mode | js/draw-tool.js:752 | yes |
| If: three points needed | js/draw-tool.js:766 | yes |
