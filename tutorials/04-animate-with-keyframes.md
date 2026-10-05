# Make a photo or title move across the screen

You'll be able to set a start and an end position, and have the picture glide between them.

1. Tap your photo or title on the timeline. Its options open. <!-- js/timeline.js:2191 tap selects; js/mobile.js:48 syncSheet -->
2. Slide the timeline so the middle line (the playhead) sits at the start of the clip. <!-- js/timeline.js:11 -->
3. Open the **Position / Scale** card. <!-- js/inspector.js:2677 -->
4. Check that the first of the four icons on the right edge of the panel is lit. That is Move. <!-- js/inspector.js:4318-4319 MT_MODES, MT_TITLES; js/inspector.js:5368-5376 right rail; js/inspector.js:7151 'move' is the default mode -->
5. On the left edge of the panel, tap the small diamond at the top. This is your first keyframe. <!-- js/inspector.js:4896-4925 left rail, kfBtn '◆' "Add a keyframe at the playhead"; the glyph is the button's text -->
6. Slide the timeline later, to where the move should end. <!-- js/timeline.js:11 -->
7. Tap the diamond again to add the second keyframe. <!-- js/inspector.js:4925-4960 -->
8. Tap the **X** number and type a clearly different number. Because the move is now keyframed, this changes the second keyframe. <!-- js/inspector.js:5009 mtVBox('X'), tap opens type-in (4389); js/scene.js:332-343 an edit on an animated prop upserts a keyframe at the playhead -->
9. Slide back to the start and tap the time counter to play. Tap it again to stop. <!-- index.html:557 #time-readout -->

A small white diamond now shows on the timeline at each keyframe. <!-- js/timeline.js:2663 kf-dot; styles.css:3516 white 11px diamond -->

On a computer: it is the same. The clip panel is at the bottom left. <!-- js/inspector.js:4896 -->

Tip: To soften the movement, tap the curve icon under the diamond. A row of small curve pictures appears. Tap one and play it again. <!-- js/inspector.js:4950-4955 mt-ease, FM.openEasingCurve; js/graph-editor.js:33-39, 267-275 presets row; js/graph-editor.js:355-362 applies it -->

If it doesn't work: If dragging the picture on the preview moves the whole animation instead of adding a keyframe, use the **X** and **Y** numbers instead. Moving it on the preview keeps your timing and never adds a keyframe. <!-- js/scene.js:348-351 shiftTransform "canvas drag ... never to drop a stray keyframe"; js/scene.js:332-343 -->
