# Add a title that shows for part of your video

You'll be able to type a title, style it, place it, and choose when it appears.

1. Slide the timeline so the middle line (the playhead) is where the title should appear. A new title starts there. Swipe the time ruler, or start moving at once: holding a clip for a third of a second picks it up. <!-- js/timeline.js:11; js/app.js:3140 start: FM.time; js/timeline.js:2196-2203, 2322 -->
2. If you see a single timeline row with an edit panel under it, tap the back arrow at the top left **once** to deselect. (With nothing selected it goes Home.) <!-- js/timeline.js:3966 addRowWanted() && !soloId; styles.css:4205; index.html:338 -->
3. Tap the row on the timeline that says "Tap to add a layer". <!-- js/timeline.js:2795 addRowLabel() -->
4. Tap the **Elements** tab (the first one), then **Text**. <!-- js/addmenu.js:238, 244-246, 175 -->
5. Type your words. "Text" is pre-selected, so typing replaces it. <!-- js/app.js:3146-3148 selectAll -->
6. In the bar at the top, tap the font name. Tap one of the fonts that appear. <!-- js/text-edit.js:874, 469-476 -->
7. Tap the number with **pt** and drag the slider that appears. <!-- js/text-edit.js:875, 493-501 -->
8. Tap the small colour square at the far left of the bar. Tap the colour box to choose a colour, or type a code like #ff0000. <!-- js/text-edit.js:876, 871-884, 505-518 buildColorPop -->
9. Tap the tick at the bar's far right. <!-- js/text-edit.js:878 -->
10. To place it, drag the title on the preview. <!-- js/canvas-edit.js:2 -->
11. To end it sooner, slide to where it should disappear. With the title selected and the playhead inside it, tap the right-hand one of the three small icon buttons (a bar on the right). <!-- js/inspector.js:3555-3570, 3613; js/app.js:2792-2795 default 5 seconds -->

On a computer: click the "New layers go here" line (or an empty spot) so nothing is selected. The Add panel shows at the bottom left. The text controls sit on a card at the bottom of the picture. To end the title, put the playhead inside it and press **D**, or click the D key at the top of the panel. <!-- js/timeline.js:3452; js/text-edit.js:23-25; js/timeline.js:5758-5762 key rail, js/app.js:9013 -->

Tip: Tap **Aa** in the bar for spacing and animation. <!-- js/text-edit.js:877, 520-526 -->

If it doesn't work: The three small buttons only show while the playhead is inside the title. Slide until the line is over the title's bar, or you see two other buttons. <!-- js/inspector.js:3568-3603 -->
