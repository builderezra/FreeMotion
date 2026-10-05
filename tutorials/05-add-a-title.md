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
11. To end it sooner, slide the timeline to where it should disappear. With the title selected and the playhead inside it, look at the top of the edit panel under the timeline: there is a row of three wide buttons. Tap the right-hand one (two upright lines, bracket on the right). Don't use the small icons in the top bar. <!-- js/inspector.js:3555-3570, 3611-3613 trim end; js/app.js:2792-2795 -->

On a computer: click an empty spot in the timeline, or the thin blue line between layers, so nothing is selected. The Add panel shows at the bottom left; if its tabs show only icons, Elements is the first one. The text controls sit on a card at the bottom of the picture. To move the playhead, drag the time ruler (dragging a clip moves the clip; a single click on the ruler deselects). To end the title, click its bar so it is selected, drag the ruler until the playhead is inside it where it should end, and press **D** or click the D key at the top of the panel. <!-- js/timeline.js:3452 'New layers go here'; js/timeline.js:5096-5098; js/addmenu.js:219, 1072-1074; js/text-edit.js:23-25; js/timeline.js:5758-5762; js/app.js:9013; js/app.js:6909-6913 -->

Tip: Tap **Aa** in the bar for spacing and animation. <!-- js/text-edit.js:877, 520-526 -->

Note: A new title lasts 5 seconds. If it runs past the end of your video it makes the whole video (and the export) longer, so trim it. <!-- js/app.js:2792-2795 default 5 s; js/app.js:3055 -->

If it doesn't work: The row of three buttons only shows while the playhead is inside the title. If that row has two buttons instead, the playhead is before or after the title (right after you add it, it is exactly on the start). Slide until the line is over the title's bar. <!-- js/inspector.js:3568-3603 -->
