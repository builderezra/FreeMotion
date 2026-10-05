# Cut a clip down to the best part

You'll be able to trim the ends of a clip, split it in two, and slide clips along the timeline.

1. Tap a clip to select it. <!-- js/timeline.js:2191 "A clean tap selects" -->
2. Slide the timeline until the line in the middle (the playhead) is over your clip. <!-- js/timeline.js:11 fixed-centre playhead -->
3. Look at the row of icon buttons in the clip's panel. With the playhead inside the clip, you get three. The left trims the start, the middle splits (a line with arrows pointing out), the right trims the end. <!-- js/inspector.js:3562, 3611-3613 trim-in, split, trim-out; only built when the playhead is inside the clip, js/inspector.js:3568-3570 -->
4. Tap the middle one to split the clip at the playhead. <!-- js/inspector.js:3612 -->
5. Tap the left one to cut away what comes before the playhead, or the right one for what comes after. <!-- js/inspector.js:3611, 3613 -->
6. To trim by hand, hold a white handle on the end of the selected clip. When it turns teal, drag. <!-- js/timeline.js:2294-2322 touch hold to arm; styles.css:3206 .armed background var(--accent) -->
7. To move a clip, press it away from the small swap-arrows button, keep still for half a second, then drag. The clip just starts following your finger. <!-- js/timeline.js:2196-2203 hold then move; js/timeline.js:2433-2437 the ⇄ Slip pill sits centred on a selected video clip and slides the footage inside it instead -->

After a split, the playhead sits on the cut, so the three buttons are hidden until you slide into a piece. With the playhead off the clip, you see two other buttons instead: move the clip to the playhead, and stretch its edge to the playhead. <!-- js/inspector.js:3568-3603 -->

On a computer: **S** splits when the playhead is over the selected clip. Off the clip, **S** stretches the clip's edge out to the playhead. **A** trims the start and **D** trims the end. <!-- js/timeline.js:206-212 clipOpAction; js/app.js:9013 KeyA/KeyS/KeyD; js/timeline.js:2433 -->

Tip: Cuts land exactly where the playhead is, so park it first. <!-- js/inspector.js:3605-3610 -->

If it doesn't work: You probably started moving too soon. Keep still on the clip or handle until it is ready. <!-- js/timeline.js:2199-2202, 2322 -->
