# Cut a clip down to the best part

You'll be able to trim the ends of a clip, split it in two, and slide clips to a new spot on the timeline.

1. Tap a clip on the timeline to select it. A panel opens with the clip's tools. <!-- js/timeline.js:2191 "A clean tap selects"; js/mobile.js:48 syncSheet raises the sheet for a selection -->
2. Drag the timeline sideways. The line in the middle is the playhead, and it stays put while the timeline slides under it. <!-- js/timeline.js:11 "fixed-centre playhead" -->
3. To cut the clip in two at the playhead, tap **Split at playhead**. It's the middle of the three trim buttons. <!-- js/inspector.js:3562, 3612 trim-in · split · trim-out; button title "Split at playhead" -->
4. To chop off the start up to the playhead, tap **Trim start to playhead**. It's the left button. <!-- js/inspector.js:3611 -->
5. To chop off the end after the playhead, tap **Trim end to playhead**. It's the right button. <!-- js/inspector.js:3613 -->
6. To trim by hand, press and hold the white handle on a selected clip's left or right edge until it lights up. Then drag. <!-- js/timeline.js:2294-2322 grips need a ~300ms hold on touch; css styles.css:3206 .armed changes colour -->
7. To move a clip, press and hold it for a moment, then drag it left or right. <!-- js/timeline.js:2196-2203 "Press-and-HOLD ... grabs it to move in time" -->

On a computer: select a clip and press **S** to split at the playhead. Drag the edges of a clip to trim. Drag the middle to move it. <!-- index.html:576 "Split clip at playhead (S)"; js/app.js:9013 KeyA/KeyS/KeyD; js/timeline.js:2294 "Trim left edge" -->

Tip: Buttons 3 to 5 only cut where the playhead is. Park the playhead on the exact frame first, then tap. <!-- js/inspector.js:3605-3610 "re-checks the CURRENT playhead" -->

If it doesn't work: If dragging a clip just scrolls the timeline, you let go too early. Hold your finger still on the clip until it lifts, then drag. The same goes for the edge handles. <!-- js/timeline.js:2199-2202 only converts to a move once the finger has gone still -->
