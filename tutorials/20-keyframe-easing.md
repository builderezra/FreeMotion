# Make a move speed up, slow down or bounce

You'll be able to change how a move feels, from steady to eased or bouncy.

1. First make a move with two keyframes (tutorial 04). Keep the clip selected with the **Position / Scale** card open.
2. Slide the timeline so the middle line sits between the two diamonds. The curve you edit belongs to the stretch the playhead is in.
3. On the left edge of the panel, tap the small curve button just under the big diamond. A graph opens.
4. A new move is **Linear**: the same speed all the way. Under the graph are two rows. The top row is the kind of curve (**Bezier**, **Bounce**, **Steps**). The row below it has six small curve pictures. From the left they are Linear, Ease In, Ease Out, Ease In-Out, Overshoot and Anticipate. Tap one.
5. Drag either round handle on the graph to draw your own curve.
6. For bouncy motion, tap **Bounce** in the row of kinds (**Bezier**, **Bounce**, **Steps**). Its pictures are Bounce, Elastic, Cyclic and Random.
7. Slide the timeline back before the move and quick-tap the time counter to watch it.
8. To close the graph, tap **‹ Position / Scale** at the top of the panel. (Not the back arrow at the top left: on a phone that deselects the clip, and on a computer it goes Home.)

On a computer: the same. The graph opens in the panel at the bottom left, and you drag the handles with the mouse.

Tip: The loop button beside the graph repeats the move. The two small buttons next to it copy a graph and paste it onto another property.

If it doesn't work: If the graph is empty it says "Animate this property (tap ◆), add a second keyframe, then shape its easing here." You need two keyframes first.

### Verification (checked against the code at b46b47d, v17.23)

| Step | File:line | Confirmed |
|---|---|---|
| 1 Position / Scale card | js/inspector.js:2677 | yes |
| 2 curve belongs to the segment the playhead is in | js/graph-editor.js:156 | yes |
| 3 easing button below the diamond | js/inspector.js:4970 | yes |
| 3 it opens the curve inside the panel | js/graph-editor.js:587 | yes |
| 4 a new keyframe starts Linear | js/scene.js:316 | yes |
| 4 the six Bezier pictures, in this order | js/graph-editor.js:39 | yes |
| 4 the pictures sit in one row | styles.css:531 | yes |
| 5 drag a handle | js/graph-editor.js:457 | yes |
| 6 Bezier / Bounce / Steps | js/eases.js:194 | yes |
| 6 Bounce, Elastic, Cyclic, Random | js/eases.js:194 | yes |
| 8 in-panel back button, labelled with the card name | js/inspector.js:7147 | yes |
| 8 phone back arrow deselects the clip instead | js/mobile.js:347 | yes |
| Tip: loop button | js/graph-editor.js:488 | yes |
| Tip: copy and paste graph buttons | js/graph-editor.js:525 | yes |
| If: empty-graph message | js/graph-editor.js:440 | yes |
| 4 two rows under the graph: kinds, then presets | js/graph-editor.js:550 | yes |
| 8 phone back arrow deselects; computer goes Home | js/mobile.js:347, js/app.js:6909-6912 | yes |
