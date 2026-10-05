# Add a title that shows for part of your video

You'll be able to type a title, pick its font, size and colour, place it, and choose when it appears.

1. Slide the timeline so the middle line (the playhead) is where the title should appear. A new title starts at the playhead. <!-- js/timeline.js:11; js/app.js:3140 makeLayer('text', ... start: FM.time) -->
2. Tap the add row on the timeline, the one that says "Tap to add a layer". <!-- js/timeline.js:2795 addRowLabel() -->
3. Tap the **Elements** tab (the first one), then **Text**. <!-- js/addmenu.js:238 key 'object' label 'Elements', 244-246 INSTANT first; js/addmenu.js:175 'Text' -->
4. Type your words. The word "Text" is already selected, so your first letter replaces it. <!-- js/app.js:3146-3148 FM.textEdit.start(..., { selectAll: true }) -->
5. In the bar at the top, tap the font name to open a row of fonts, each shown as "Abc" with its name. Tap one. <!-- js/text-edit.js:874, 469-476 te-font-card -->
6. Tap the number with **pt** to change the size. Drag the slider that appears. <!-- js/text-edit.js:875, 493-501 slider 8 to 400 -->
7. Tap the round colour swatch at the far left of the bar and pick a colour. <!-- js/text-edit.js:876, 871-884 colour first; 505-518 buildColorPop -->
8. Tap the tick at the far right of the bar. <!-- js/text-edit.js:878 doneBtn '✓' -->
9. To place it, drag the title on the preview. <!-- js/canvas-edit.js:2 "drag the body to move" -->
10. To end it sooner, slide the timeline to where it should disappear. With the title selected and the playhead inside it, tap the right-hand one of the three icon buttons (a bar on the right). <!-- js/inspector.js:3555-3570, 3613 trim end to playhead; js/app.js:2792-2795 a new layer lasts 5 seconds by default -->

On a computer: the same four controls sit on a small card at the bottom of the picture, and the Add panel is at the bottom left. <!-- js/text-edit.js:23-25 desktop card, 30 -->

Tip: Tap **Aa** in the same bar for more, like spacing and animation. <!-- js/text-edit.js:877, 520-526 buildExtrasPop; js/inspector.js:5738 text animation "Fade in", "Typewriter" -->

If it doesn't work: The three icon buttons only show while the playhead is inside the title. Slide the timeline until the line is over the title's bar. Otherwise you will see two different buttons. <!-- js/inspector.js:3568-3603 -->
