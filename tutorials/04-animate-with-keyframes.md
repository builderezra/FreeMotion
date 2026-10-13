# Make a photo or title move across the screen

You'll be able to set a start and an end spot, and have the picture glide between them.

1. Tap your photo or title on the timeline. Its options open under it. (If the timeline shows only one row with options under it and it isn't the one you want, another clip is selected. Tap the back arrow at the top left once so every row shows, then tap yours.) <!-- js/timeline.js:2191; js/mobile.js:48; js/timeline.js:3966 addRowWanted() && !soloId (solo row); index.html:338 -->
2. Slide the timeline so the middle line (the playhead) sits at the start of the clip. Swipe the time ruler; a plain tap on the ruler or an empty part of the timeline closes the options. You can also swipe the clip itself, but start moving straight away: holding a clip still for a third of a second picks the clip up instead. <!-- js/timeline.js:11; js/timeline.js:5096-5098 empty tap deselects; js/timeline.js:2196-2203, 2322 hold grabs the clip -->
3. Open the **Position / Scale** card. <!-- js/inspector.js:2677 -->
4. Check that the first of the four buttons on the right edge of the panel (Move) is lit. If it isn't, tap it. If you see "Anchor X" and "Centre the anchor" instead of X, Y and Z, tap Move again. <!-- js/inspector.js:4318-4319 MT_MODES; js/inspector.js:5368-5376 right rail, Move again toggles anchor; js/inspector.js:5335, 5353 'Anchor X', 'Centre the anchor'; js/inspector.js:7151 default 'move' -->
5. On the left edge of the panel there is a column of buttons. Tap the top one, the diamond (not the tiny diamonds on the number boxes). It turns yellow: that is your first keyframe. <!-- js/inspector.js:4896-4925 left rail kfBtn '◆'; styles.css:407 .mt-kf.here color var(--kf) amber; js/inspector.js:5009-5010 the number boxes -->
6. Slide the timeline later, to where the move should end. <!-- js/timeline.js:11 -->
7. Tap the diamond again to add the second keyframe. <!-- js/inspector.js:4925-4960 -->
8. Tap the **X** number and type a clearly different number. Press Return or tap away to apply it. This edits the second keyframe. <!-- js/inspector.js:5009 mtVBox('X'), tap to type 4389-4391; js/scene.js:332-343 upsertKeyframe on an animated prop -->
9. Slide back to the start and quick-tap the time counter to play. Tap again to stop. <!-- index.html:557 #time-readout; js/app.js:6745-6750 hold = loop -->

On a computer: the same steps, in the panel at the bottom left. To slide the timeline, drag along the time ruler or an empty part of the timeline, or scroll sideways on a trackpad. A plain click there, without dragging, deselects your clip and closes its options. Dragging the clip itself moves the clip. Press Enter after typing the X number. Space also plays and stops. <!-- js/timeline.js:5096-5098; index.html:556 'Play / Pause (space)' --> <!-- not walked: the walk was the 380 px phone layout only -->

Tip: To soften the movement, tap the curve button just under the diamond. A graph opens with two rows of buttons under it. In the bottom row of small curve pictures, tap the S-shaped one (Ease In-Out), then play it again. Tap the back arrow by Position / Scale to return. <!-- js/inspector.js:4950-4955 mt-ease; js/graph-editor.js:33-39, 267-275 presets row; js/graph-editor.js:355-362; js/inspector.js:7147 'cat-back' -->

If it doesn't work: Dragging the picture on the preview shifts the whole animation and never adds a keyframe. Use the **X** and **Y** numbers. <!-- js/scene.js:348-351 shiftTransform -->
