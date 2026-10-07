# Cut a clip down to the best part

You'll be able to trim, split and move clips.

1. Tap a clip. <!-- js/timeline.js:2191 "A clean tap selects" -->
2. Slide the timeline until the middle line (the playhead) is over your clip. <!-- js/timeline.js:11 fixed-centre playhead -->
3. With the playhead inside the clip, the panel shows three icon buttons. The left one trims the start, the middle one splits (a line with arrows pointing out), the right one trims the end. <!-- js/inspector.js:3562, 3611-3613; only built when the playhead is inside the clip, js/inspector.js:3568-3570 -->
4. Tap the middle one to split the clip at the playhead. The right-hand piece is now selected, with the playhead on its very start, so the three buttons swap for two others. <!-- js/inspector.js:3612; js/app.js:5090 selectedId = B.id (the new right-hand piece); js/inspector.js:3589-3603 the two other buttons -->
5. To trim, slide the timeline a little so the playhead is inside the selected clip again. The left one cuts away what comes before the playhead, the right one what comes after. <!-- js/inspector.js:3611, 3613 -->
6. To trim by hand, hold a white handle at either end of the selected clip. When it turns teal, drag. <!-- js/timeline.js:2294-2322; styles.css:3195, 3206 -->
7. To move a clip, press it (not on the small swap-arrows button, if there is one), keep still for half a second, then drag. It just follows your finger. <!-- js/timeline.js:2196-2203; js/timeline.js:2433-2437 the ⇄ Slip pill -->

Every cut leaves the playhead on the clip's edge, so the three buttons hide until you slide back inside the clip. Off the clip you see two others: move the clip to the playhead, or stretch its edge to it. <!-- js/inspector.js:3568-3603 -->

On a computer: the cut buttons are three keys, A, S and D, near the top of the clip's panel. Click or press. With the playhead over the selected clip, A trims the start, S splits and D trims the end. Off the clip, S stretches the clip's edge out to the playhead, and A or D (whichever side the playhead is on) slides the clip to it. With a mouse, just drag: there is no hold and nothing turns teal. <!-- js/timeline.js:5758-5762 key rail A / S / D; styles.css:2477-2486; js/timeline.js:206-212 clipOpAction; js/app.js:9013; js/timeline.js:2305-2307 hold is "TOUCH ONLY" -->

Tip: Cuts land exactly where the playhead is, so park it first. <!-- js/inspector.js:3605-3610 -->

If it doesn't work: If dragging just slides the timeline, you moved too soon. Keep still for half a second on a clip, or until a handle turns teal. <!-- js/timeline.js:2199-2202, 2322 -->
